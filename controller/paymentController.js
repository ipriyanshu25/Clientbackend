// controllers/paymentController.js
require('dotenv').config();
const Razorpay = require('razorpay');
const crypto    = require('crypto');

const Payment  = require('../models/payment');
const Campaign = require('../models/campaign');
const Client   = require('../models/client');
const Service  = require('../models/services');

// initialize Razorpay client
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a new Razorpay order and persist a Payment record
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = 'USD', receipt, clientId, serviceId } = req.body;

    if (!clientId || !serviceId || !amount) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields: clientId, serviceId, and amount are required' });
    }

    // denormalize client & service data
    const client = await Client.findOne({ clientId }).select('name.firstName name.lastName');
    if (!client) {
      return res.status(404).json({ success: false, message: `Client not found: ${clientId}` });
    }
    const service = await Service.findOne({ serviceId }).select('serviceHeading');
    if (!service) {
      return res.status(404).json({ success: false, message: `Service not found: ${serviceId}` });
    }

    // Razorpay expects amount in smallest unit (e.g. cents)
    const options = {
      amount:   Math.round(amount * 100),
      currency,
      receipt:  receipt || crypto.randomBytes(10).toString('hex'),
    };

    // create the order
    const order = await razorpay.orders.create(options);

    // persist in our DB
    const paymentRecord = await Payment.create({
      orderId:        order.id,
      amount:         order.amount,
      currency:       order.currency,
      receipt:        order.receipt,
      clientId,
      clientName: {
        firstName: client.name.firstName,
        lastName:  client.name.lastName
      },
      serviceId,
      serviceHeading: service.serviceHeading,
      status:         'created',
      createdAt:      new Date(),
    });

    return res.status(201).json({ success: true, order, paymentRecord });
  } catch (error) {
    console.error('Error in createOrder:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify a Razorpay payment signature, update the Payment record,
 * and mark the related Campaign as Approved.
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // recompute expected signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      // mark payment as failed
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: 'failed' }
      );
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // fetch actual payment status from Razorpay
    const razorPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (razorPayment.status !== 'captured') {
      // update DB with whatever status we got
      await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: razorPayment.status }
      );
      return res
        .status(400)
        .json({ success: false, message: `Payment status: ${razorPayment.status}` });
    }

    // mark as approved in our DB
    const updated = await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId:  razorpay_payment_id,
        signature:  razorpay_signature,
        status:     'approved',
        approvedAt: new Date(),
      },
      { new: true }
    );

    // ─── NEW: flip the related campaign’s status ────────────────────────────────────
    const campaignUpdated = await Campaign.findOneAndUpdate(
      {
        clientId:  updated.clientId,
        serviceId: updated.serviceId
      },
      { status: 'Approved' },
      { new: true }
    );
    if (!campaignUpdated) {
      console.warn(`Payment approved but no campaign found for client=${updated.clientId} service=${updated.serviceId}`);
    }

    return res.json({
      success: true,
      message: 'Payment approved successfully',
      payment: updated,
      campaign: campaignUpdated || null
    });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
