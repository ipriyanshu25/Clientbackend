// routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const { createCampaign, getAllCampaigns,getActiveCampaignsByClient,getPreviousCampaignsByClient } = require('../controller/campaignController');
const authMiddleware = require('../middleware/auth'); // adjust path if needed

// @route   POST /api/campaigns
// @desc    Create a new campaign
// @access  Private
router.post('/create', createCampaign);

// @route   GET /api/campaigns
// @desc    Retrieve all campaigns
// @access  Private
router.get('/getAll',getAllCampaigns);
// @route   GET /api/campaigns/client/:clientId
router.post('/active',getActiveCampaignsByClient);
router.post('/previous',getPreviousCampaignsByClient);


module.exports = router;
