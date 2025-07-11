const Campaign = require('../models/campaign');
const Client = require('../models/client');
const Service = require('../models/services');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { STATUS } = require('../models/campaign');

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
const FROM_ADDRESS = process.env.SMTP_USER;

// Helper to send mail via SMTP
async function sendSmtpMail(to, subject, text) {
  await transporter.sendMail({
    from: `"ShareMitra Confirmation: Your Campaign Is Live " <${process.env.SMTP_USER}>`,
    to,
    subject,
    text
  });
}
function buildClientFilter(clientId, status, search) {
  const filter = { clientId, status };
  if (search && search.trim()) {
    filter.serviceHeading = { $regex: search.trim(), $options: 'i' };
  }
  return filter;
}

// Create a new campaign and notify client via SMTP
exports.createCampaign = async (req, res) => {
  try {
    const { clientId, serviceId, link, actions } = req.body;

    // Validate inputs
    if (!clientId || !serviceId || !actions) {
      return res.status(400).json({ success: false, message: 'clientId, serviceId, and actions are required' });
    }

    // Fetch client (include email)
    const client = await Client
      .findOne({ clientId })
      .select('name.firstName name.lastName email');
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Fetch service
    const service = await Service
      .findOne({ serviceId })
      .select('serviceHeading');
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // Create and save campaign
    const campaign = new Campaign({
      clientId,
      clientName: {
        firstName: client.name.firstName,
        lastName: client.name.lastName
      },
      serviceId,
      serviceHeading: service.serviceHeading,
      link,
      actions,
      status: STATUS.PENDING
    });
    await campaign.save();

    // Fetch total amount from saved campaign
    const totalAmount = campaign.totalAmount;

    // Prepare professional email using descriptive action keys
    const actionLines = campaign.actions
      .map(a => `- ${a.contentKey}: ${a.quantity} units`)
      .join('\n');

    const subject = 'ShareMitra Campaign Is Live';
    const body = `Dear ${client.name.firstName},

We’re pleased to let you know that your campaign is succefully recieved. Below are the key details:

Service: ${service.serviceHeading}
URL:     ${link}

Services Requested:
${actionLines}

Total Campaign Cost: $${campaign.totalAmount}

If you have any questions or need further assistance, please reach out at care@sharemitra.com.

Best regards,
ShareMitra Marketing Team
`;

    await sendSmtpMail(client.email, subject, body);
    return res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaignId: campaign.campaignId
    });
  } catch (err) {
    console.error('Error in createCampaign:', err);
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
      success: true,
      count: campaigns.length,
      campaigns
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get campaigns by clientId
exports.getActiveCampaignsByClient = async (req, res) => {
  try {
    const { clientId } = req.body;
    const { page = 1, limit = 10, search = '' } = req.query;
    if (!clientId) return res.status(400).json({ success: false, message: 'clientId is required' });

    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const pageNum  = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.max(parseInt(limit, 10), 1);
    const skip     = (pageNum - 1) * limitNum;

    const filter = buildClientFilter(clientId, STATUS.PENDING, search);

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Campaign.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page: pageNum,
      limit: limitNum,
      totalItems: total,
      totalPages: Math.ceil(total / limitNum),
      count: campaigns.length,
      campaigns
    });
  } catch (err) {
    console.error('getActiveCampaignsByClient error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /campaigns/previous
exports.getPreviousCampaignsByClient = async (req, res) => {
  try {
    const { clientId } = req.body;
    const { page = 1, limit = 10, search = '' } = req.query;
    if (!clientId) return res.status(400).json({ success: false, message: 'clientId is required' });

    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const pageNum  = Math.max(parseInt(page, 10), 1);
    const limitNum = Math.max(parseInt(limit, 10), 1);
    const skip     = (pageNum - 1) * limitNum;

    const filter = buildClientFilter(clientId, STATUS.COMPLETED, search);

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Campaign.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page: pageNum,
      limit: limitNum,
      totalItems: total,
      totalPages: Math.ceil(total / limitNum),
      count: campaigns.length,
      campaigns
    });
  } catch (err) {
    console.error('getPreviousCampaignsByClient error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


