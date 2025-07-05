// controllers/campaignController.js
const Campaign         = require('../models/campaign');
const Client           = require('../models/client');
const Service          = require('../models/services');
const { v4: uuidv4 }   = require('uuid');

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const { clientId, serviceId, link, actions } = req.body;

    // 1️⃣ Fetch client
    const client = await Client
      .findOne({ clientId })
      .select('name.firstName name.lastName');
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // 2️⃣ Fetch service
    const service = await Service
      .findOne({ serviceId })
      .select('serviceHeading');
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // 3️⃣ Build and save campaign (pre-validate hook does costs)
    const campaign = new Campaign({
      clientId,
      clientName: {
        firstName: client.name.firstName,
        lastName:  client.name.lastName
      },
      serviceId,
      serviceHeading: service.serviceHeading,
      link,
      actions // array of { contentId, quantity }
    });

    await campaign.save();

    // Return success message and campaignId only
    return res.status(201).json({
      success:    true,
      message:    'Campaign created successfully',
      campaignId: campaign.campaignId
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Update an existing campaign
 * Body: { campaignId, link?, actions? }
 * - To update an existing action, include its actionId + new quantity.
 * - To add a brand-new action, omit actionId (it gets generated).
 */
exports.updateCampaign = async (req, res) => {
  try {
    const { campaignId, link, actions } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'campaignId is required' });
    }

    const campaign = await Campaign.findOne({ campaignId });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Overwrite link if provided
    if (typeof link === 'string') {
      campaign.link = link.trim();
    }

    // Merge actions
    if (actions !== undefined) {
      if (!Array.isArray(actions)) {
        return res.status(400).json({ success: false, message: 'actions must be an array' });
      }

      actions.forEach(({ actionId, contentId, quantity }) => {
        if (actionId) {
          // update existing
          const existing = campaign.actions.find(a => a.actionId === actionId);
          if (existing) {
            existing.quantity = quantity;
          }
        } else {
          // add new
          campaign.actions.push({
            actionId: uuidv4(),
            contentId,
            quantity
          });
        }
      });
    }

    // Save (pre-validate recomputes costs)
    await campaign.save();
    return res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign
      .find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success:   true,
      count:     campaigns.length,
      campaigns
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get campaigns by clientId
exports.getCampaignsByClient = async (req, res) => {
  try {
    const { clientId } = req.body;              // keep clientId in body if you prefer POST
    const { page = 1, limit = 10, search = '' } = req.query;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'clientId is required' });
    }

    // confirm client exists
    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // build filter: always filter by clientId, plus optional text search
    const filter = { clientId };
    if (search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    // pagination math
    const pageNum  = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.max(parseInt(limit, 10), 1);
    const skip     = (pageNum - 1) * limitNum;

    // run both queries in parallel
    const [ campaigns, total ] = await Promise.all([
      Campaign.find(filter)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limitNum)
              .lean(),
      Campaign.countDocuments(filter)
    ]);

    return res.status(200).json({
      success:     true,
      page:        pageNum,
      limit:       limitNum,
      totalItems:  total,
      totalPages:  Math.ceil(total / limitNum),
      count:       campaigns.length,
      campaigns
    });
  } catch (err) {
    console.error('Error fetching campaigns by client:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// Delete a campaign by campaignId
exports.deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'campaignId is required' });
    }

    const deleted = await Campaign.findOneAndDelete({ campaignId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully',
      campaign: deleted
    });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
