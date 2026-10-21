const db = require('../config/db');
const foodRequestModel = require('../models/foodRequestModel');
const foodPostModel = require('../models/foodPostModel');
const crypto = require('crypto');
const { uploadToSupabase } = require('../utils/supabaseStorage');
const captchaService = require('../utils/captchaService');

/**
 * Helper: Generate unique uppercase 6-digit alphanumeric pickup code (e.g. SM-849201)
 */
const generatePickupCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous characters like 0, O, 1, I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SM-${code}`;
};

/**
 * FoodRequest Controller handles food requests submitted by receivers/NGOs
 */

const createFoodRequest = async (req, res, next) => {
  try {
    const {
      food_post_id,
      is_anonymous,
      requested_quantity,
      notes,
      captchaId,
      captchaAnswer
    } = req.body;
    const receiver_id = req.user.id;

    // Verify CAPTCHA to prevent automated bot food claiming
    if (!captchaId || !captchaAnswer || !captchaService.verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({
        message: 'Security verification failed: Invalid or expired CAPTCHA code. Please complete the security challenge.'
      });
    }

    if (!food_post_id) {
      return res.status(400).json({ message: 'Food post ID is required' });
    }

    // Food seeker NID & Super Admin verification enforcement
    if (req.user.role === 'receiver') {
      const userRes = await db.query(
        'SELECT verification_status, nid, (nid_pdf IS NOT NULL) AS has_nid_pdf FROM users WHERE id = $1',
        [receiver_id]
      );
      const userRecord = userRes.rows[0];
      if (!userRecord || userRecord.verification_status !== 'verified') {
        return res.status(403).json({
          message: 'National ID (NID) verification required. You must upload your NID document in your Profile and wait for Super Admin verification before you can request food.'
        });
      }
    }

    // Verify food post exists
    const foodPost = await foodPostModel.getFoodPostById(food_post_id);
    if (!foodPost) {
      return res.status(404).json({ message: 'Food post not found' });
    }
    if (Number(foodPost.receiver_price_bdt) > 0) {
      return res.status(400).json({ message: 'This meal has a price. Add it to your cart to place a purchase request.' });
    }

    // Prevent requesting own food post
    if (foodPost.donor_id === receiver_id) {
      return res.status(400).json({ message: 'You cannot request your own food post' });
    }

    const requestedQuantity = Number(requested_quantity || 1);
    const availableQuantity = Number(foodPost.quantity);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      return res.status(400).json({ message: 'Requested portions must be a positive whole number.' });
    }
    if (Number.isFinite(availableQuantity) && requestedQuantity > availableQuantity) {
      return res.status(400).json({ message: `Only ${availableQuantity} portions are currently available.` });
    }

    const ngoUserId = foodPost.distribution_ngo_user_id || null;

    // Check if receiver already has an active or completed request for this post
    const existing = await foodRequestModel.findExistingRequest(food_post_id, receiver_id);
    if (existing) {
      const errorMsg = existing.status === 'fulfilled'
        ? 'You have already received food from this donation post. Each recipient is limited to one claim per donation.'
        : 'You already have an active request for this food post.';
      return res.status(400).json({
        message: errorMsg,
        data: existing
      });
    }

    // Generate unique pickup code
    let pickupCode = generatePickupCode();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const codeCheck = await foodRequestModel.findByPickupCode(pickupCode);
      if (!codeCheck) {
        isUnique = true;
      } else {
        pickupCode = generatePickupCode();
        attempts++;
      }
    }

    const requestData = {
      food_post_id, receiver_id, is_anonymous: Boolean(is_anonymous),
      pickup_code: pickupCode, requested_quantity: requestedQuantity,
      notes: notes || '',
      ngo_user_id: ngoUserId
    };
    const newRequest = await foodRequestModel.createFoodRequest(requestData);

    // Ensure food_posts links to this NGO
    if (ngoUserId && !foodPost.distribution_ngo_user_id) {
      await db.query(
        `UPDATE food_posts 
         SET distribution_ngo_user_id = $1 WHERE id = $2`,
        [ngoUserId, food_post_id]
      );
    }

    return res.status(201).json({
      message: 'Food request submitted successfully!',
      data: newRequest
    });
  } catch (error) {
    if (error.code === 'REQUEST_EXISTS') return res.status(409).json({ message: error.message });
    next(error);
  }
};

const getMyFoodRequests = async (req, res, next) => {
  try {
    const receiverId = req.user.id;
    const requests = await foodRequestModel.findByReceiverId(receiverId);
    return res.status(200).json({
      message: 'Food requests retrieved successfully',
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

const getIncomingFoodRequests = async (req, res, next) => {
  try {
    const userRole = req.user.role;
    let requests;
    if (userRole === 'ngo' || userRole === 'admin' || userRole === 'super_admin') {
      const ngoUserId = userRole === 'ngo' ? (req.user.parent_ngo_id || req.user.id) : null;
      requests = await foodRequestModel.findIncomingForNgo(ngoUserId);
    } else {
      requests = await foodRequestModel.findIncomingForDonor(req.user.id);
    }
    return res.status(200).json({
      message: 'Incoming food requests retrieved successfully',
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// NGO pickup requests (receiver is an NGO account) move through their own
// pipeline: picked up -> at hub -> posted for distribution. The receiver-side
// actions below must not complete them, or the food never reaches receivers.
const NGO_PICKUP_CODE_MESSAGE = 'This code belongs to an NGO pickup from a donor, not a receiver request. Manage it from Collection Requests.';
const isNgoAccount = async (userId) => {
  const result = await db.query('SELECT role::text AS role FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.role === 'ngo';
};

const updateFoodRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['requested', 'approved', 'fulfilled', 'rejected', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid request status' });
    }

    const existingRequest = await foodRequestModel.findById(id);
    if (!existingRequest) {
      return res.status(404).json({ message: 'Food request not found' });
    }
    if (await isNgoAccount(existingRequest.receiver_id)) {
      return res.status(409).json({ message: 'This is an NGO pickup request. Move it forward from Collection Requests (picked up, at hub, post for distribution).' });
    }

    // Auth check: donor, receiver, ngo, or super_admin
    const userId = req.user.id;
    const userRole = req.user.role;
    const isDonor = existingRequest.donor_id === userId;
    const isReceiver = existingRequest.receiver_id === userId;
    const isNgo = userRole === 'ngo';
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';

    if (!isDonor && !isReceiver && !isAdmin && !isNgo) {
      return res.status(403).json({ message: 'Not authorized to update this food request' });
    }

    if (status === 'approved' && !isNgo && !isAdmin) {
      return res.status(403).json({ message: 'Only the assigned NGO or an admin can approve a receiver request.' });
    }

    if (isNgo && (existingRequest.ngo_user_id || existingRequest.distribution_ngo_user_id) &&
        (existingRequest.ngo_user_id || existingRequest.distribution_ngo_user_id) !== (req.user.parent_ngo_id || req.user.id)) {
      return res.status(403).json({ message: 'এই Request অন্য NGO-র অধীনে রয়েছে।' });
    }

    // When distributor/NGO accepts request ('approved'), validate remaining quantity for this food post
    if (status === 'approved') {
      const collRes = await db.query(
        `SELECT remaining_packets, total_packets, status 
         FROM food_requests 
         WHERE food_post_id = $1 AND remaining_packets IS NOT NULL
         ORDER BY created_at DESC LIMIT 1`,
        [existingRequest.food_post_id]
      );
      
      let availableQuantity = null;
      if (collRes.rows[0] && collRes.rows[0].remaining_packets != null) {
        availableQuantity = collRes.rows[0].remaining_packets;
      } else {
        const postRes = await db.query(
          `SELECT quantity, food_name, title FROM food_posts WHERE id = $1`,
          [existingRequest.food_post_id]
        );
        if (postRes.rows[0]) {
          availableQuantity = postRes.rows[0].quantity;
        }
      }

      const foodName = existingRequest.food_name || existingRequest.food_title || 'this food';
      const requestedQty = existingRequest.requested_quantity || 1;

      if (availableQuantity != null && availableQuantity <= 0) {
        return res.status(400).json({
          message: `❌ Cannot accept request: "${foodName}" is completely out of stock (0 portions remaining).`
        });
      }

      if (availableQuantity != null && requestedQty > availableQuantity) {
        return res.status(400).json({
          message: `❌ Cannot accept request: Food seeker requested ${requestedQty} portions, but only ${availableQuantity} portions remain available for "${foodName}".`
        });
      }
    }

    const assignedNgoId = status === 'approved' && isNgo ? (req.user.parent_ngo_id || req.user.id) : null;
    const updatedRequest = await foodRequestModel.updateStatus(id, status, assignedNgoId);
    if (!updatedRequest) return res.status(409).json({ message: 'এই Request অন্য NGO ইতিমধ্যে অনুমোদন করেছে।' });
    return res.status(200).json({
      message: `Food request status updated to ${status}`,
      data: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};

const verifyPickupCode = async (req, res, next) => {
  try {
    const { pickup_code, food_post_id, collection_id } = req.body;
    if (!pickup_code) {
      return res.status(400).json({ message: 'Pickup code is required' });
    }

    const cleanCode = pickup_code.trim().toUpperCase();
    const request = await foodRequestModel.findByPickupCode(cleanCode);
    if (!request) {
      return res.status(404).json({ message: `Invalid pickup code "${cleanCode}". No matching request found.` });
    }
    if (request.receiver_role === 'ngo') {
      return res.status(409).json({ message: NGO_PICKUP_CODE_MESSAGE });
    }

    // Auth check: post owner, ngo staff, or super admin
    const userId = req.user.id;
    const userRole = req.user.role;
    const isOwner = request.donor_id === userId;
    const isNgo = userRole === 'ngo';
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';

    if (!isOwner && !isAdmin && !isNgo) {
      return res.status(403).json({ message: 'Not authorized to verify pickup code for this food post' });
    }

    if (request.status === 'fulfilled') {
      return res.status(400).json({ message: `This pickup code (${cleanCode}) has already been used and fulfilled.` });
    }

    // Scoping check - if food_post_id or collection_id was specified, ensure code matches this specific food post!
    let targetFoodPostId = food_post_id ? parseInt(food_post_id, 10) : null;
    let targetFoodName = null;
    let targetRemaining = null;

    if (collection_id) {
      const collRes = await db.query(
        `SELECT fr.food_post_id, fr.remaining_packets, fp.food_name, fp.title 
         FROM food_requests fr
         JOIN food_posts fp ON fr.food_post_id = fp.id
         WHERE fr.id = $1`,
        [collection_id]
      );
      if (collRes.rows[0]) {
        targetFoodPostId = collRes.rows[0].food_post_id;
        targetFoodName = collRes.rows[0].food_name || collRes.rows[0].title;
        targetRemaining = collRes.rows[0].remaining_packets;
      }
    } else if (targetFoodPostId) {
      const postRes = await db.query(`SELECT food_name, title, quantity FROM food_posts WHERE id = $1`, [targetFoodPostId]);
      if (postRes.rows[0]) {
        targetFoodName = postRes.rows[0].food_name || postRes.rows[0].title;
        targetRemaining = postRes.rows[0].quantity;
      }
    }

    if (targetFoodPostId && request.food_post_id !== targetFoodPostId) {
      const codeFoodName = request.food_name || request.food_title || 'another food post';
      return res.status(400).json({
        message: `❌ Food Mismatch: This pickup code was generated for "${codeFoodName}", NOT for "${targetFoodName || 'this food'}". Each pickup code only works for the specific food requested.`
      });
    }

    // Quantity check against remaining stock
    const requestedQty = request.requested_quantity || 1;
    if (targetRemaining != null && requestedQty > targetRemaining) {
      return res.status(400).json({
        valid: false,
        insufficient_quantity: true,
        message: `❌ Insufficient Quantity: Food seeker requested ${requestedQty} packets, but only ${targetRemaining} packets remain available for this food.`
      });
    }

    if (request.status === 'rejected' || request.status === 'cancelled') {
      return res.status(400).json({
        valid: false,
        message: `This pickup code (${cleanCode}) belongs to a request that has been ${request.status}.`
      });
    }

    // Code verification ONLY validates and verifies the code. It does NOT complete the pickup / mark fulfilled.
    return res.status(200).json({
      valid: true,
      verified: true,
      message: `✓ Valid Pickup Code: "${cleanCode}" for ${request.receiver_name || 'Receiver'} (${requestedQty} portion${requestedQty > 1 ? 's' : ''} of "${request.food_name || request.food_title || 'Food'}"). Status: ${request.status.toUpperCase()}.`,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

const uploadReceiptPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await foodRequestModel.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Food request not found' });
    }

    // Check authorization: receiver or donor or admin
    const userId = req.user.id;
    const userRole = req.user.role;
    if (request.receiver_id !== userId && request.donor_id !== userId && userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to upload proof of receipt for this request' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please attach a proof of receipt image file' });
    }

    const receiptPhotoUrl = await uploadToSupabase(req.file, 'receipt-photos');
    const updatedRequest = await foodRequestModel.updateReceiptPhoto(id, receiptPhotoUrl);

    return res.status(200).json({
      message: '📷 Proof of receipt photo uploaded successfully!',
      data: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};

/**
 * NGO creates a pickup request for a donor's food post
 * Status is set to 'pickup_requested' so donor can see it
 */
const createNgoPickupRequest = async (req, res, next) => {
  try {
    const { food_post_id, notes, captchaId, captchaAnswer } = req.body;
    const ngoUserId = req.user.id;

    // Verify CAPTCHA to prevent automated bot requests
    if (!captchaId || !captchaAnswer || !captchaService.verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({
        message: 'Security verification failed: Invalid or expired CAPTCHA code. Please complete the security challenge.'
      });
    }

    if (req.user.role !== 'ngo') {
      return res.status(403).json({ message: 'Only NGOs can create pickup requests' });
    }
    if (!food_post_id) {
      return res.status(400).json({ message: 'Food post ID is required' });
    }

    const foodPost = await foodPostModel.getFoodPostById(food_post_id);
    if (!foodPost) {
      return res.status(404).json({ message: 'Food post not found' });
    }
    if (foodPost.donor_id === ngoUserId) {
      return res.status(400).json({ message: 'Cannot request pickup from your own post' });
    }

    // Check for existing pending pickup request from this NGO for this post
    const existing = await foodRequestModel.findExistingRequest(food_post_id, ngoUserId);
    if (existing) {
      return res.status(400).json({ message: 'You already have an active pickup request for this food post' });
    }

    // Generate a pickup code
    let pickupCode = generatePickupCode();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const codeCheck = await foodRequestModel.findByPickupCode(pickupCode);
      if (!codeCheck) { isUnique = true; } else { pickupCode = generatePickupCode(); attempts++; }
    }

    const updated = await foodRequestModel.createNgoPickupRequestWithNotification({
      food_post_id,
      donor_id: foodPost.donor_id,
      ngo_user_id: ngoUserId,
      pickup_code: pickupCode,
      requested_quantity: foodPost.quantity || 1,
      notes: notes || 'NGO Pickup Request',
      food_title: foodPost.food_name || foodPost.title
    });

    return res.status(201).json({
      message: 'Pickup request sent to donor successfully!',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Donor fetches all NGO pickup requests for their posts
 */
const getDonorPickupRequests = async (req, res, next) => {
  try {
    const donorId = req.user.id;
    const requests = await foodRequestModel.findPickupRequestsForDonor(donorId);
    return res.status(200).json({
      message: 'NGO pickup requests retrieved',
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * NGO fetches all pickup requests they have sent
 */
const getNgoPickupRequests = async (req, res, next) => {
  try {
    const ngoUserId = req.user.id;
    const requests = await foodRequestModel.findPickupRequestsByNgo(ngoUserId);
    return res.status(200).json({
      message: 'NGO sent pickup requests retrieved',
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Donor responds to an NGO pickup request: accept or reject
 */
const respondToPickupRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const donorId = req.user.id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "accept" or "reject"' });
    }

    const existingRequest = await foodRequestModel.findById(id);
    if (!existingRequest) {
      return res.status(404).json({ message: 'Pickup request not found' });
    }
    if (existingRequest.donor_id !== donorId) {
      return res.status(403).json({ message: 'Not authorized to respond to this pickup request' });
    }
    if (existingRequest.status !== 'pickup_requested') {
      return res.status(400).json({ message: `Cannot respond: request status is "${existingRequest.status}"` });
    }

    let updatedRequest;
    if (action === 'accept') {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const updateResult = await client.query(
          `UPDATE food_requests
           SET status = 'approved', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status = 'pickup_requested'
           RETURNING *;`,
          [id]
        );

        if (updateResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            message: 'This pickup request has already been responded to.'
          });
        }

        updatedRequest = updateResult.rows[0];
        const foodName = existingRequest.food_name || existingRequest.food_title || 'your requested food';
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, link, metadata)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb);`,
          [
            existingRequest.receiver_id,
            '✅ Donor Accepted Your Pickup Request',
            `The donor approved your pickup request for ${foodName}. You can now arrange collection.`,
            'ngo_pickup_approved',
            '/ngo/incoming',
            JSON.stringify({ food_request_id: Number(id), food_post_id: existingRequest.food_post_id })
          ]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      updatedRequest = await foodRequestModel.updateStatus(id, 'rejected');
    }

    return res.status(200).json({
      message: action === 'accept'
        ? '✅ Pickup request accepted! NGO can now collect the food.'
        : '❌ Pickup request rejected.',
      data: updatedRequest
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign receiving staff member to an approved pickup request
 */
const assignReceivingStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staff_id } = req.body;
    if (!staff_id) {
      return res.status(400).json({ message: 'Staff ID is required to assign pickup.' });
    }
    const updated = await foodRequestModel.assignReceivingStaff(id, staff_id);
    return res.status(200).json({
      message: 'Receiving staff assigned successfully!',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Receiving staff (or NGO Admin) marks food as picked up from donor
 */
const markPickedUp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await foodRequestModel.findById(id);
    // Use explicitly passed staff_id, or the assigned receiving staff, or req.user.id
    const staffId = req.body?.staff_id || existing?.assigned_staff_id || req.user.id;
    const updated = await foodRequestModel.markPickedUp(id, staffId);
    return res.status(200).json({
      message: 'Donation marked as picked up!',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Distributor staff (or NGO Admin) inspects food and marks as received at hub
 */
const markAtHub = async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = req.body?.staff_id || req.user.id;
    const updated = await foodRequestModel.markAtHub(id, staffId);
    return res.status(200).json({
      message: 'Food verified and received at Hub!',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Distributor staff (or NGO Admin) posts food for distribution to receivers
 */
const postDistributing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pickup_point_id, total_packets, needs_options, price_per_portion_bdt } = req.body;
    const ngoUserId = req.user.parent_ngo_id || req.user.id;
    if (req.user.role !== 'ngo') {
      return res.status(403).json({ message: 'Only an NGO account can post food for distribution.' });
    }
    const packetCount = Number(total_packets);
    const portionPrice = Number(price_per_portion_bdt ?? 0);
    if (!pickup_point_id || !Number.isInteger(packetCount) || packetCount < 1) {
      return res.status(400).json({ message: 'Pickup point and a positive whole packet count are required.' });
    }
    if (!Number.isFinite(portionPrice) || portionPrice <= 0 || portionPrice > 100000) {
      return res.status(400).json({ message: 'Enter a price per portion greater than BDT 0 and no more than BDT 100,000.' });
    }
    const updated = await foodRequestModel.postForDistribution(id, {
      pickup_point_id,
      total_packets: packetCount,
      needs_options,
      price_per_portion_bdt: portionPrice,
      ngo_user_id: ngoUserId
    });
    if (!updated) {
      return res.status(404).json({ message: 'The hub request was not found or does not belong to your NGO.' });
    }
    return res.status(200).json({
      message: 'Food posted for distribution successfully!',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

const lookupPickupCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { food_post_id, collection_id } = req.query;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Pickup code is required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const request = await foodRequestModel.findByPickupCode(cleanCode);

    if (!request) {
      return res.status(404).json({
        valid: false,
        message: `Invalid pickup code "${cleanCode}". No matching receiver request found in system.`
      });
    }
    if (request.receiver_role === 'ngo') {
      return res.status(409).json({ message: NGO_PICKUP_CODE_MESSAGE });
    }

    if (request.status === 'fulfilled') {
      return res.status(400).json({
        valid: false,
        already_fulfilled: true,
        message: `This pickup code (${cleanCode}) has already been fulfilled and collected.`
      });
    }

    // Resolve target food post and remaining quantity
    let targetFoodPostId = food_post_id ? parseInt(food_post_id, 10) : null;
    let targetFoodName = null;
    let targetRemainingPackets = null;

    if (collection_id) {
      const collRes = await require('../config/db').query(
        `SELECT fr.id, fr.food_post_id, fr.remaining_packets, fp.food_name, fp.title 
         FROM food_requests fr
         JOIN food_posts fp ON fr.food_post_id = fp.id
         WHERE fr.id = $1`,
        [collection_id]
      );
      if (collRes.rows[0]) {
        targetFoodPostId = collRes.rows[0].food_post_id;
        targetFoodName = collRes.rows[0].food_name || collRes.rows[0].title;
        targetRemainingPackets = collRes.rows[0].remaining_packets;
      }
    } else if (targetFoodPostId) {
      const postRes = await require('../config/db').query(
        `SELECT id, food_name, title FROM food_posts WHERE id = $1`,
        [targetFoodPostId]
      );
      if (postRes.rows[0]) {
        targetFoodName = postRes.rows[0].food_name || postRes.rows[0].title;
      }
    }

    // Rule 1: Code must only work for the specific food post requested!
    if (targetFoodPostId && request.food_post_id !== targetFoodPostId) {
      const requestedFoodName = request.food_name || request.food_title || request.food_type || 'another food post';
      return res.status(400).json({
        valid: false,
        food_mismatch: true,
        message: `❌ Food Mismatch: This pickup code was generated for "${requestedFoodName}", NOT for "${targetFoodName || 'this food'}". Each pickup code only works for the specific food requested.`
      });
    }

    // Rule 2: Check if requested quantity exceeds remaining available packets
    const requestedQty = request.requested_quantity || 1;
    if (targetRemainingPackets != null && targetRemainingPackets < requestedQty) {
      return res.status(400).json({
        valid: false,
        insufficient_quantity: true,
        requested_quantity: requestedQty,
        remaining_packets: targetRemainingPackets,
        message: `❌ Insufficient Quantity: Food seeker requested ${requestedQty} packets, but only ${targetRemainingPackets} packets remain available for this food.`
      });
    }

    return res.status(200).json({
      valid: true,
      message: `✓ Validated for "${request.food_name || request.food_title || 'This Food'}": ${request.receiver_name} (${requestedQty} portions requested)`,
      data: {
        id: request.id,
        food_post_id: request.food_post_id,
        food_name: request.food_name || request.food_title,
        food_type: request.food_type,
        receiver_id: request.receiver_id,
        receiver_name: request.receiver_name,
        receiver_phone: request.receiver_phone,
        requested_quantity: requestedQty,
        remaining_packets: targetRemainingPackets,
        status: request.status,
        pickup_code: request.pickup_code
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * NGO / Distributor hands over a specific number of food packets to a beneficiary
 * Requires a verified matching receiver pickup code for the specific food post and matching quantity.
 */
const handoverPackets = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { receiver_name, receiver_phone, quantity, pickup_code } = req.body;
    const staff_id = req.user.id;
    const staff_name = req.user.name || 'NGO Staff';

    if (!pickup_code || !pickup_code.trim()) {
      return res.status(400).json({
        message: 'Receiver pickup code is required. Without a valid matching code, food cannot be handed over.'
      });
    }

    // Fetch the target collection / distribution item
    const collRes = await require('../config/db').query(
      `SELECT fr.id, fr.food_post_id, fr.remaining_packets, fp.food_name, fp.title
       FROM food_requests fr
       JOIN food_posts fp ON fr.food_post_id = fp.id
       WHERE fr.id = $1`,
      [id]
    );
    if (!collRes.rows[0]) {
      return res.status(404).json({ message: 'Collection / distribution record not found' });
    }
    const targetColl = collRes.rows[0];

    const cleanCode = pickup_code.trim().toUpperCase();
    const matchedReceiverReq = await foodRequestModel.findByPickupCode(cleanCode);

    if (!matchedReceiverReq) {
      return res.status(400).json({
        message: `Invalid pickup code "${cleanCode}". Without a valid matching code, food cannot be handed over.`
      });
    }
    if (matchedReceiverReq.receiver_role === 'ngo') {
      return res.status(409).json({ message: NGO_PICKUP_CODE_MESSAGE });
    }

    if (matchedReceiverReq.status === 'fulfilled') {
      return res.status(400).json({
        message: `This pickup code (${cleanCode}) has already been fulfilled and collected.`
      });
    }

    // Rule 1: Pickup code must match the specific food post being distributed!
    if (matchedReceiverReq.food_post_id !== targetColl.food_post_id) {
      const codeFoodName = matchedReceiverReq.food_name || matchedReceiverReq.food_title || matchedReceiverReq.food_type || 'another food post';
      const currentFoodName = targetColl.food_name || targetColl.title || 'this food';
      return res.status(400).json({
        message: `❌ Food Post Mismatch: This pickup code (${cleanCode}) was generated for "${codeFoodName}", NOT for "${currentFoodName}". Pickup codes only work for the specific food requested.`
      });
    }

    // Rule 2: Quantity must match remaining quantity
    const qty = parseInt(quantity, 10) || matchedReceiverReq.requested_quantity || 1;
    const remainingStock = targetColl.remaining_packets ?? 0;

    if (remainingStock <= 0) {
      return res.status(400).json({
        message: `❌ Out of Stock: All packets for "${targetColl.food_name || targetColl.title}" have already been distributed.`
      });
    }

    if (qty > remainingStock) {
      return res.status(400).json({
        message: `❌ Quantity Exceeds Remaining Stock: Requested ${qty} packets, but only ${remainingStock} packets remain available for this food.`
      });
    }

    const finalReceiverName = (receiver_name && receiver_name.trim()) || matchedReceiverReq.receiver_name || 'Receiver';
    const finalReceiverPhone = (receiver_phone && receiver_phone.trim()) || matchedReceiverReq.receiver_phone || 'N/A';

    const updated = await foodRequestModel.handoverPackets(id, {
      receiver_name: finalReceiverName,
      receiver_phone: finalReceiverPhone,
      quantity: qty,
      pickup_code: cleanCode,
      staff_id,
      staff_name
    });

    if (!updated) {
      return res.status(404).json({ message: 'Failed to update distribution record' });
    }

    // Mark matched receiver request as fulfilled
    try {
      await foodRequestModel.updateStatus(matchedReceiverReq.id, 'fulfilled');
    } catch (errFulfill) {
      console.error('Failed to mark individual receiver request fulfilled:', errFulfill.message);
    }

    // Log in serving logs
    try {
      const ngoId = req.user.parent_ngo_id || req.user.id;
      const ngoRes = await require('../config/db').query('SELECT id FROM ngos WHERE user_id = $1 LIMIT 1', [ngoId]);
      if (ngoRes.rows[0]) {
        await require('../models/servingLogModel').createServingLog({
          ngo_id: ngoRes.rows[0].id,
          donation_ref: updated.food_post_id ? `DON-${updated.food_post_id}` : null,
          meals_served: qty,
          location: 'NGO Distribution Hub',
          notes: `Handed over ${qty} meals to ${finalReceiverName} (Code: ${cleanCode}) by ${staff_name}`
        });
      }
    } catch (logErr) {
      console.error('Serving log auto-insert error:', logErr.message);
    }

    return res.status(200).json({
      message: `Successfully handed over ${qty} packets! Remaining: ${updated.remaining_packets}`,
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFoodRequest,
  getMyFoodRequests,
  getIncomingFoodRequests,
  updateFoodRequestStatus,
  verifyPickupCode,
  lookupPickupCode,
  uploadReceiptPhoto,
  createNgoPickupRequest,
  getDonorPickupRequests,
  getNgoPickupRequests,
  respondToPickupRequest,
  assignReceivingStaff,
  markPickedUp,
  markAtHub,
  postDistributing,
  handoverPackets,
};
