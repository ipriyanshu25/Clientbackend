// routes/campaignRoutes.js
const express = require('express');
const router = express.Router();
const { createCampaign, getAllCampaigns,getCampaignsByClient,deleteCampaign } = require('../controller/campaignController');
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
router.post('/getByClient',getCampaignsByClient);
// @route   DELETE /api/campaigns/delete
router.post('/delete', deleteCampaign);

module.exports = router;
