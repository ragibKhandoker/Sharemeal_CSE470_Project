const db = require('../config/db');

/**
 * FoodRequest Model - database operations for food_requests table
 */

const createFoodRequest = async ({
  food_post_id,
  receiver_id,
  is_anonymous = false,
  pickup_code,
  requested_quantity = 1,
  notes = '',
  ngo_user_id = null
}) => {
  const query = `
    INSERT INTO food_requests (
      food_post_id,
      receiver_id,
      is_anonymous,
      pickup_code,
      requested_quantity,
      notes,
      ngo_user_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'requested')
    RETURNING *;
  `;
  const values = [
    food_post_id,
    receiver_id,
    is_anonymous,
    pickup_code,
    requested_quantity,
    notes,
    ngo_user_id
  ];
  const result = await db.query(query, values);
  return result.rows[0];
};

const createNgoPickupRequestWithNotification = async ({
  food_post_id,
  donor_id,
  ngo_user_id,
  pickup_code,
  requested_quantity = 1,
  notes = '',
  food_title
}) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query(
      `INSERT INTO food_requests (
         food_post_id, receiver_id, ngo_user_id, is_anonymous,
         pickup_code, requested_quantity, notes, status
       )
       VALUES ($1, $2, $2, FALSE, $3, $4, $5, 'pickup_requested')
       RETURNING *;`,
      [food_post_id, ngo_user_id, pickup_code, requested_quantity, notes]
    );
    const request = requestResult.rows[0];
    const ngoResult = await client.query(
      `SELECT COALESCE(n.organization_name, u.name, 'An NGO') AS name
       FROM users u LEFT JOIN ngos n ON n.user_id = u.id
       WHERE u.id = $1;`,
      [ngo_user_id]
    );
    const ngoName = ngoResult.rows[0]?.name || 'An NGO';
    const safeFoodTitle = food_title || 'your food donation';
    const message = `${ngoName} has requested pickup of "${safeFoodTitle}". Please review the request in My Donations.`;
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb);`,
      [
        donor_id,
        'New NGO Pickup Request',
        message,
        'ngo_pickup_requested',
        '/donor/my-donations',
        JSON.stringify({ food_request_id: request.id, food_post_id: Number(food_post_id), ngo_user_id })
      ]
    );
    await client.query('COMMIT');
    return request;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findById = async (id) => {
  const query = `
    SELECT 
      fr.*,
      fp.food_name,
      fp.title AS food_title,
      fp.food_type,
      fp.quantity::integer AS post_quantity,
      fp.district,
      fp.thana,
      fp.area_ward,
      fp.donor_id,
      fp.distribution_ngo_user_id,
      u.name AS receiver_name,
      u.phone AS receiver_phone,
      u.email AS receiver_email,
      d.name AS donor_name,
      d.phone AS donor_phone
    FROM food_requests fr
    JOIN food_posts fp ON fr.food_post_id = fp.id
    JOIN users u ON fr.receiver_id = u.id
    LEFT JOIN users d ON fp.donor_id = d.id
    WHERE fr.id = $1;
  `;
  const result = await db.query(query, [id]);
  return result.rows[0];
};

const findExistingRequest = async (food_post_id, receiver_id) => {
  const query = `
    SELECT * FROM food_requests
    WHERE food_post_id = $1 AND receiver_id = $2 AND status IN ('requested', 'approved', 'fulfilled', 'accepted');
  `;
  const result = await db.query(query, [food_post_id, receiver_id]);
  return result.rows[0];
};

const findByReceiverId = async (receiverId) => {
  const query = `
    SELECT 
      fr.*,
      fp.food_name,
      fp.title AS food_title,
      fp.food_type,
      fp.quantity::integer AS post_quantity,
      fp.district,
      fp.thana,
      fp.area_ward,
      fp.road_no,
      fp.house_no,
      fp.image_url AS food_image_url,
      fp.donor_id,
      d.name AS donor_name,
      d.phone AS donor_phone,
      rep.id AS report_id,
      rep.status AS report_status,
      rep.reason AS report_reason
    FROM food_requests fr
    JOIN food_posts fp ON fr.food_post_id = fp.id
    LEFT JOIN users d ON fp.donor_id = d.id
    LEFT JOIN food_reports rep ON rep.food_request_id = fr.id
    WHERE fr.receiver_id = $1
    ORDER BY fr.created_at DESC;
  `;
  const result = await db.query(query, [receiverId]);
  return result.rows;
};

const findIncomingForDonor = async (donorId) => {
  const query = `
    SELECT 
      fr.*,
      fp.food_name,
      fp.title AS food_title,
      fp.food_type,
      fp.district,
      fp.thana,
      CASE 
        WHEN fr.is_anonymous = true THEN '🕵️ Anonymous Receiver'
        ELSE u.name 
      END AS receiver_display_name,
      CASE 
        WHEN fr.is_anonymous = true THEN 'Hidden for identity masking'
        ELSE u.phone 
      END AS receiver_display_phone,
      u.email AS receiver_email
    FROM food_requests fr
    JOIN food_posts fp ON fr.food_post_id = fp.id
    JOIN users u ON fr.receiver_id = u.id
    WHERE fp.donor_id = $1
    ORDER BY fr.created_at DESC;
  `;
  const result = await db.query(query, [donorId]);
  return result.rows;
};

const findIncomingForNgo = async (ngoUserId) => {
  const query = `
    SELECT 
      fr.*,
      fp.food_name,
      fp.title AS food_title,
      fp.food_type,
      fp.district,
      fp.thana,
      fp.area_ward,
      fp.status AS post_status,
      fp.donor_id,
      fp.image_url AS food_image_url,
      fp.quantity::integer AS post_quantity,
      fp.distribution_ngo_user_id,
      COALESCE(
        (SELECT fr_ngo.remaining_packets 
         FROM food_requests fr_ngo 
         WHERE fr_ngo.food_post_id = fr.food_post_id 
           AND fr_ngo.remaining_packets IS NOT NULL 
         ORDER BY fr_ngo.created_at DESC LIMIT 1),
        fp.quantity::integer
      ) AS remaining_packets,
      CASE 
        WHEN fr.is_anonymous = true THEN '🕵️ Anonymous Receiver'
        ELSE u.name 
      END AS receiver_display_name,
      CASE 
        WHEN fr.is_anonymous = true THEN 'Hidden for identity masking'
        ELSE u.phone 
      END AS receiver_display_phone,
      u.email AS receiver_email
    FROM food_requests fr
    JOIN food_posts fp ON fr.food_post_id = fp.id
    JOIN users u ON fr.receiver_id = u.id
    WHERE ($1::integer IS NULL 
       OR fr.ngo_user_id = $1 
       OR fp.distribution_ngo_user_id = $1 
       OR (fr.ngo_user_id IS NULL AND fp.distribution_ngo_user_id IS NULL))
    ORDER BY fr.created_at DESC;
  `;
  const result = await db.query(query, [ngoUserId]);
  return result.rows;
};

/**
 * Find all pickup requests (by NGOs) for a specific donor's posts
 */
const findPickupRequestsForDonor = async (donorId) => {
  const query = `
    SELECT 
      fr.*,
      fp.food_name,
      fp.title AS food_title,
      fp.food_type,
      fp.district,
      fp.thana,
      fp.area_ward,
      fp.quantity::integer AS post_quantity,
      fp.image_url AS food_image_url,
      u.name AS requester_name,
      u.email AS requester_email,
      u.phone AS requester_phone,
      ngo.organization_name AS ngo_organization_name
    FROM food_requests fr
    JOIN food_posts fp ON fr.food_post_id = fp.id
    JOIN users u ON fr.receiver_id = u.id
    LEFT JOIN ngos ngo ON ngo.user_id = u.id
    WHERE fp.donor_id = $1
      AND fr.status = 'pickup_requested'
    ORDER BY fr.created_at DESC;
  `;
  const result = await db.query(query, [donorId]);
  return result.rows;
};

/**
 * Find all pickup requests sent by a specific NGO or its staff members
 */
const findPickupRequestsByNgo = async (ngoUserId) => {
  const query = `
    SELECT 
      fr.*,
      fp.food_name,
      fp.title AS food_title,
      fp.food_type,
      fp.district,
      fp.thana,
      fp.area_ward,
      fp.quantity::integer AS post_quantity,
      fp.image_url AS food_image_url,
      fp.status AS food_post_status,
      d.name AS donor_name,
      d.phone AS donor_phone,
      staff.name AS assigned_staff_name,
      staff.phone AS assigned_staff_phone,
      picked_staff.name AS picked_up_staff_name,
      hub_staff.name AS hub_staff_name,
      pp.name AS pickup_point_name,
      pp.address AS pickup_point_address
    FROM food_requests fr
    JOIN food_posts fp ON fr.food_post_id = fp.id
    JOIN users d ON fp.donor_id = d.id
    LEFT JOIN users staff ON fr.assigned_staff_id = staff.id
    LEFT JOIN users picked_staff ON fr.picked_up_by_staff_id = picked_staff.id
    LEFT JOIN users hub_staff ON fr.received_at_hub_by_staff_id = hub_staff.id
    LEFT JOIN pickup_points pp ON fr.distributed_pickup_point_id = pp.id
    WHERE (fr.receiver_id = $1 OR fr.receiver_id = (SELECT parent_ngo_id FROM users WHERE id = $1))
      AND fr.status IN ('pickup_requested', 'approved', 'assigned', 'picked_up', 'at_hub', 'distributing', 'distributed', 'rejected')
    ORDER BY fr.created_at DESC;
  `;
  const result = await db.query(query, [ngoUserId]);
  return result.rows;
};

const assignReceivingStaff = async (requestId, staffId) => {
  const query = `
    UPDATE food_requests
    SET 
      assigned_staff_id = $1,
      status = 'assigned',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  const result = await db.query(query, [staffId, requestId]);
  return result.rows[0];
};

const markPickedUp = async (requestId, staffId) => {
  const query = `
    UPDATE food_requests
    SET 
      picked_up_by_staff_id = $1,
      picked_up_at = CURRENT_TIMESTAMP,
      status = 'picked_up',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  const result = await db.query(query, [staffId, requestId]);

  // Also update food post status to 'collected'
  await db.query(
    `UPDATE food_posts SET status = 'collected' WHERE id = (SELECT food_post_id FROM food_requests WHERE id = $1)`,
    [requestId]
  );

  return result.rows[0];
};

const markAtHub = async (requestId, staffId) => {
  const query = `
    UPDATE food_requests
    SET 
      received_at_hub_by_staff_id = $1,
      received_at_hub_at = CURRENT_TIMESTAMP,
      status = 'at_hub',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  const result = await db.query(query, [staffId, requestId]);

  // Also update food post status to 'at_ngo_point'
  await db.query(
    `UPDATE food_posts SET status = 'at_ngo_point' WHERE id = (SELECT food_post_id FROM food_requests WHERE id = $1)`,
    [requestId]
  );

  return result.rows[0];
};

const postForDistribution = async (requestId, {
  pickup_point_id,
  total_packets,
  needs_options,
  price_per_portion_bdt,
  ngo_user_id
}) => {
  const query = `
    UPDATE food_requests
    SET 
      distributed_pickup_point_id = $1,
      total_packets = $2,
      remaining_packets = $2,
      status = 'distributing',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
      AND (
        receiver_id = $4
        OR receiver_id IN (SELECT id FROM users WHERE parent_ngo_id = $4)
      )
      AND status = 'at_hub'
    RETURNING *;
  `;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(query, [pickup_point_id, total_packets, requestId, ngo_user_id]);
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `UPDATE food_posts
       SET pickup_point_id = $1,
           quantity = $2,
           needs_options = $3,
           receiver_price_bdt = $4,
           distribution_ngo_user_id = $5,
           status = 'at_ngo_point'
       WHERE id = $6`,
      [pickup_point_id, total_packets, needs_options || [], price_per_portion_bdt, ngo_user_id, result.rows[0].food_post_id]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const handoverPackets = async (requestId, { receiver_name, receiver_phone, quantity, pickup_code, staff_id, staff_name }) => {
  // First fetch current record
  const currentRes = await db.query(`SELECT remaining_packets, distribution_logs FROM food_requests WHERE id = $1`, [requestId]);
  if (!currentRes.rows[0]) return null;

  const currentRemaining = currentRes.rows[0].remaining_packets || 0;
  const newRemaining = Math.max(0, currentRemaining - quantity);
  const newStatus = newRemaining === 0 ? 'distributed' : 'distributing';

  const newLogEntry = {
    receiver_name: receiver_name || 'Receiver',
    receiver_phone: receiver_phone || 'N/A',
    quantity,
    pickup_code: pickup_code || 'N/A',
    staff_id,
    staff_name: staff_name || 'NGO Staff',
    handed_over_at: new Date().toISOString()
  };

  const logs = Array.isArray(currentRes.rows[0].distribution_logs)
    ? currentRes.rows[0].distribution_logs
    : [];
  logs.push(newLogEntry);

  const isDistributed = newStatus === 'distributed';
  const query = `
    UPDATE food_requests
    SET 
      remaining_packets = $1,
      distribution_logs = $2::jsonb,
      status = $3,
      fulfilled_at = ${isDistributed ? 'CURRENT_TIMESTAMP' : 'fulfilled_at'},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *;
  `;
  const result = await db.query(query, [newRemaining, JSON.stringify(logs), newStatus, requestId]);

  // Keep food_posts quantity in sync with remaining packets, and mark completed if all distributed
  await db.query(
    `UPDATE food_posts 
     SET quantity = $1,
         status = ${isDistributed ? "'completed'" : 'status'}
     WHERE id = (SELECT food_post_id FROM food_requests WHERE id = $2)`,
    [newRemaining, requestId]
  );

  return result.rows[0];
};


const findByPickupCode = async (pickupCode) => {
  const query = `
    SELECT 
      fr.*,
      fp.food_name,
      fp.title AS food_title,
      fp.food_type,
      fp.quantity::integer AS post_quantity,
      fp.donor_id,
      u.name AS receiver_name,
      u.phone AS receiver_phone
    FROM food_requests fr
    JOIN food_posts fp ON fr.food_post_id = fp.id
    JOIN users u ON fr.receiver_id = u.id
    WHERE UPPER(fr.pickup_code) = UPPER($1);
  `;
  const result = await db.query(query, [pickupCode]);
  return result.rows[0];
};

const updateStatus = async (id, status, ngoUserId = null) => {
  const isFulfilled = status === 'fulfilled';
  const query = `
    UPDATE food_requests
    SET 
      status = $1,
      fulfilled_at = ${isFulfilled ? 'CURRENT_TIMESTAMP' : 'fulfilled_at'},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
      AND ($1 <> 'approved' OR ngo_user_id IS NULL OR ngo_user_id = $3)
    RETURNING *;
  `;
  const result = await db.query(query, [status, id, ngoUserId]);
  return result.rows[0];
};

const updateReceiptPhoto = async (id, receipt_photo_url) => {
  const query = `
    UPDATE food_requests
    SET 
      receipt_photo_url = $1,
      status = 'fulfilled',
      fulfilled_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *;
  `;
  const result = await db.query(query, [receipt_photo_url, id]);
  return result.rows[0];
};

const deleteFoodRequest = async (id) => {
  const query = `
    DELETE FROM food_requests 
    WHERE id = $1 
    RETURNING *;
  `;
  const result = await db.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  createFoodRequest,
  createNgoPickupRequestWithNotification,
  findById,
  findExistingRequest,
  findByReceiverId,
  findIncomingForDonor,
  findIncomingForNgo,
  findPickupRequestsForDonor,
  findPickupRequestsByNgo,
  assignReceivingStaff,
  markPickedUp,
  markAtHub,
  postForDistribution,
  handoverPackets,
  findByPickupCode,
  updateStatus,
  updateReceiptPhoto,
  deleteFoodRequest
};
