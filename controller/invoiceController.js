
// File: controller/invoiceController.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Invoice = require('../models/invoice');
const Sequence = require('../models/Sequence');
const Campaign = require('../models/campaign');
const Payment = require('../models/payment');
const Client = require('../models/client');
const formatResponse = require('../utils/formatResponse');
const { buildInvoicePDF,DEFAULT_SETTINGS } = require('../utils/buildInvoicePDF');

async function getNextInvoiceNumber() {
  const counter = await Sequence.findByIdAndUpdate(
    DEFAULT_SETTINGS.companyInfo.name,
    { $inc: { sequenceValue: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `INV${String(counter.sequenceValue).padStart(5, '0')}`;
}

// Generate & stream back a new PDF invoice
exports.generateInvoice = async (req, res) => {
  try {
    const { campaignId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!campaignId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return formatResponse(res, false, 'campaignId and payment verification details are required', 400);
    }

    // verify signature
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expectedSig !== razorpay_signature) {
      return formatResponse(res, false, 'Invalid payment signature', 400);
    }

    // fetch records
    const payment  = await Payment.findOne({ orderId: razorpay_order_id });
    const campaign = await Campaign.findOne({ campaignId }).lean();
    const client   = campaign && await Client.findOne({ clientId: campaign.clientId }).lean();
    if (!payment || payment.status !== 'approved') {
      return formatResponse(res, false, 'Payment not approved or not found', 404);
    }
    if (!campaign) return formatResponse(res, false, 'Campaign not found', 404);
    if (!client)   return formatResponse(res, false, 'Client not found', 404);

    // build invoice record
    const invNum    = await getNextInvoiceNumber();
    const invoiceId = uuidv4();
    const record    = {
      invoiceId,
      invoiceNumber: invNum,
      campaignId,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate:     new Date().toISOString().split('T')[0],
      billTo: { fullName: `${client.name.firstName} ${client.name.lastName}`, email: client.email },
      items: campaign.actions,
      subtotal: 0,
      total:    0,
      note:     'This is a system generated invoice',
      paymentInfo: {
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency
      },
      createdAt: new Date()
    };

    // calculate totals
    record.subtotal = record.items.reduce(
      (sum, i) => sum + (parseFloat(i.totalCost) || parseFloat(i.unitPrice) * (parseInt(i.quantity) || 1)),
      0
    );
    record.total = record.subtotal;

    // save invoice to database
    await Invoice.create(record);

    // instead of generating/streaming PDF, just confirm success
    return formatResponse(res, true, 'Invoice generated successfully', 200);

  } catch (err) {
    console.error('generateInvoice error:', err);
    return formatResponse(res, false, 'Internal server error', 500);
  }
};
// Fetch invoices by campaignId (JSON)
exports.getInvoicesByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return formatResponse(res, false, 'campaignId is required', 400);
    }
    const invoices = await Invoice.find({ campaignId }).lean();
    if (!invoices.length) {
      return formatResponse(res, false, 'No invoices found for this campaign', 404);
    }
    return formatResponse(res, true, 'Invoices retrieved', 200, { invoices });
  } catch (err) {
    console.error('getInvoicesByCampaign error:', err);
    return formatResponse(res, false, 'Internal server error', 500);
  }
};

// Download PDF invoice for a campaignId (view then download)
exports.downloadInvoiceByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return formatResponse(res, false, 'campaignId is required', 400);
    }
    // find latest invoice for campaign
    const invoice = await Invoice
      .findOne({ campaignId })
      .sort({ createdAt: -1 })
      .lean();
    if (!invoice) {
      return formatResponse(res, false, 'Invoice not found for this campaign', 404);
    }
    // fetch related data
    const campaign = await Campaign.findOne({ campaignId }).lean();
    if (!campaign) {
      return formatResponse(res, false, 'Associated campaign not found', 404);
    }
    const client = await Client.findOne({ clientId: campaign.clientId }).lean();
    if (!client) {
      return formatResponse(res, false, 'Associated client not found', 404);
    }
    const payment = await Payment.findOne({ paymentId: invoice.paymentInfo.paymentId });
    if (!payment) {
      return formatResponse(res, false, 'Associated payment not found', 404);
    }

    // generate PDF
    const pdfBuffer = await buildInvoicePDF(invoice, campaign, client, payment);

    // first display inline, then allow download
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="sharemitraCampaign.pdf"`
    });
    res.end(pdfBuffer);

  } catch (err) {
    console.error('downloadInvoiceByCampaign error:', err);
    return formatResponse(res, false, 'Internal server error', 500);
  }
};

// Fetch single invoice by invoiceId
exports.getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return formatResponse(res, false, 'invoiceId is required', 400);
    }
    const invoice = await Invoice.findOne({ invoiceId }).lean();
    if (!invoice) {
      return formatResponse(res, false, 'Invoice not found', 404);
    }
    return formatResponse(res, true, 'Invoice retrieved', 200, { invoice });
  } catch (err) {
    console.error('getInvoiceById error:', err);
    return formatResponse(res, false, 'Internal server error', 500);
  }
};

