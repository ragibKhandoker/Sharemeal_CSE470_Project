const foodPostModel = require('../models/foodPostModel');
const { uploadToSupabase } = require('../utils/supabaseStorage');

// Creating food post
const createFoodPost = async (req, res) => {
  try {
    const {
      donor_id,
      food_name,
      title,
      food_type,
      quantity,
      expiry_time,
      district,
      thana,
      area_ward,
      road_no,
      house_no,
      floor_flat,
      latitude,
      longitude,
      notes,
      status = 'available'
    } = req.body;

    const image_url = req.file ? await uploadToSupabase(req.file) : null;

    if (!donor_id || !food_type || !quantity || !expiry_time) {
      return res.status(400).json({
        message: 'Donor ID, Food Type, Quantity, and Expiry time are required.'
      });
    }

    if (!district?.trim() || !thana?.trim()) {
      return res.status(400).json({
        message: 'District and Thana/Upazila are required to create a food post.'
      });
    }

    // Enforce Super Admin verification check for donors
    const userModel = require('../models/userModel');
    const donorUser = await userModel.findById(donor_id);
    if (!donorUser || donorUser.verification_status !== 'verified') {
      return res.status(403).json({
        message: 'National ID (NID) verification required. You cannot create food posts until Super Admin verifies your account.'
      });
    }

    const foodPost = await foodPostModel.createFoodPost({
      donor_id,
      food_name: food_name || title,
      title: title || food_name,
      food_type,
      quantity,
      expiry_time,
      district,
      thana,
      area_ward,
      road_no,
      house_no,
      floor_flat,
      latitude,
      longitude,
      image_url,
      notes,
      status
    });

    res.status(201).json({
      message: 'Food post created successfully',
      foodPost
    });
  } catch (error) {
    console.error('Create food post error:', error);

    if (error.code === '23503') {
      return res.status(400).json({ message: 'The donor ID does not exist in the users table' });
    }

    res.status(500).json({
      message: 'Failed to create food post: ' + error.message
    });
  }
};

// Getting all food posts
const getAllFoodPosts = async (req, res) => {
  try {
    const { donor_id } = req.query;
    const foodPosts = await foodPostModel.getAllFoodPosts(donor_id);

    res.status(200).json({
      message: 'Food posts retrieved successfully',
      foodPosts
    });
  } catch (error) {
    console.error('Get food posts error:', error);

    res.status(500).json({
      message: 'Failed to retrieve food posts'
    });
  }
};

// Getting food post by id
const getFoodPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const foodPost = await foodPostModel.getFoodPostById(id);

    if (!foodPost) {
      return res.status(404).json({
        message: 'Food post not found'
      });
    }

    res.status(200).json({
      message: 'Food post retrieved successfully',
      foodPost
    });
  } catch (error) {
    console.error('Get food post error:', error);

    res.status(500).json({
      message: 'Failed to retrieve food post'
    });
  }
};

// Updating food post
const updateFoodPost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      food_name,
      title,
      food_type,
      quantity,
      expiry_time,
      district,
      thana,
      area_ward,
      road_no,
      house_no,
      floor_flat,
      latitude,
      longitude,
      status
    } = req.body;
    const image_url = req.file ? await uploadToSupabase(req.file) : null;

    const foodPost = await foodPostModel.updateFoodPost(id, {
      food_name: food_name || title,
      title: title || food_name,
      food_type,
      quantity,
      expiry_time,
      district,
      thana,
      area_ward,
      road_no,
      house_no,
      floor_flat,
      latitude,
      longitude,
      image_url,
      status
    });

    if (!foodPost) {
      return res.status(404).json({
        message: 'Food post not found'
      });
    }

    res.status(200).json({
      message: 'Food post updated successfully',
      foodPost
    });
  } catch (error) {
    console.error('Update food post error:', error);
    res.status(500).json({
      message: 'Failed to update food post'
    });
  }
};

// Deleting food post
const deleteFoodPost = async (req, res) => {
  try {
    const { id } = req.params;
    const foodPost = await foodPostModel.deleteFoodPost(id);

    if (!foodPost) {
      return res.status(404).json({
        message: 'Food post not found'
      });
    }

    res.status(200).json({
      message: 'Food post deleted successfully',
      foodPost
    });
  } catch (error) {
    console.error('Delete food post error:', error);
    res.status(500).json({
      message: 'Failed to delete food post'
    });
  }
};

// Get only NGO-posted food (for receivers)
const getNgoPosts = async (req, res) => {
  try {
    const foodPosts = await foodPostModel.getAllNgoPosts();
    res.status(200).json({
      message: 'NGO food posts retrieved successfully',
      foodPosts
    });
  } catch (error) {
    console.error('Get NGO posts error:', error);
    res.status(500).json({ message: 'Failed to retrieve NGO food posts' });
  }
};

// Get only donor-posted food (for NGOs browsing donor posts)
// Excludes posts this NGO has already requested pickup for
const getDonorPosts = async (req, res) => {
  try {
    let ngoUserId = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET || 'default_secret');
        if (!decoded.pcr) ngoUserId = decoded.id; // ignore temporary-password sessions
      } catch (e) {}
    }
    if (!ngoUserId && req.query.ngo_id) {
      ngoUserId = req.query.ngo_id;
    }

    const foodPosts = await foodPostModel.getAllDonorPosts(ngoUserId);
    res.status(200).json({
      message: 'Donor food posts retrieved successfully',
      foodPosts
    });
  } catch (error) {
    console.error('Get donor posts error:', error);
    res.status(500).json({ message: 'Failed to retrieve donor food posts' });
  }
};

module.exports = {
  createFoodPost,
  getAllFoodPosts,
  getNgoPosts,
  getDonorPosts,
  getFoodPostById,
  updateFoodPost,
  deleteFoodPost
};
