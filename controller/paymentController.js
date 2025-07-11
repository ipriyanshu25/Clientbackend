// controllers/paymentController.js
require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const Payment = require('../models/payment');
const Campaign = require('../models/campaign');
const Client = require('../models/client');
const Service = require('../models/services');

// initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// configure your SMTP transporter for sending confirmation emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// helper to send email
async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: `"No Reply" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

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

    // denormalize client & service data (include email)
    const client = await Client.findOne({ clientId }).select('name.firstName name.lastName email');
    if (!client) {
      return res.status(404).json({ success: false, message: `Client not found: ${clientId}` });
    }
    const service = await Service.findOne({ serviceId }).select('serviceHeading');
    if (!service) {
      return res.status(404).json({ success: false, message: `Service not found: ${serviceId}` });
    }

    // Razorpay expects amount in smallest unit (e.g. cents)
    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt || crypto.randomBytes(10).toString('hex'),
    };

    // create the order
    const order = await razorpay.orders.create(options);

    // persist in our DB
    const paymentRecord = await Payment.create({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      clientId,
      clientName: {
        firstName: client.name.firstName,
        lastName: client.name.lastName,
      },
      serviceId,
      serviceHeading: service.serviceHeading,
      status: 'created',
      createdAt: new Date(),
    });

    return res.status(201).json({ success: true, order, paymentRecord });
  } catch (error) {
    console.error('Error in createOrder:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify a Razorpay payment signature, update the Payment record,
 * mark the related Campaign as Approved, and send confirmation email
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
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'approved',
        approvedAt: new Date(),
      },
      { new: true }
    );


    // send confirmation email to client
    const client = await Client.findOne({ clientId: updated.clientId }).select('email name.firstName');
    if (client && client.email) {
      const subject = 'Payment Confirmation';
      const html = `
  <p>Hi ${client.name.firstName},</p>
  <p>Thank you for your payment. Here are the details:</p>
  <ul>
    <li><strong>Order ID:</strong> ${updated.orderId}</li>
    <li><strong>Payment ID:</strong> ${updated.paymentId}</li>
    <li><strong>Amount:</strong> ${(updated.amount / 100).toFixed(2)} ${updated.currency}</li>
    <li><strong>Service:</strong> ${updated.serviceHeading}</li>
    <li><strong>Date:</strong> ${updated.approvedAt.toISOString()}</li>
  </ul>
  <p>To view and download your invoice, please visit <a href="https://sharemitra.com">sharemitra.com</a>.</p>
  <p>If you have any questions, feel free to reach out.</p>
  <p>Best regards,<br/>ShareMitra Team</p>
`;
      try {
        await sendEmail(client.email, subject, html);
      } catch (emailErr) {
        console.error('Error sending confirmation email:', emailErr);
      }
    }

    return res.json({
      success: true,
      message: 'Payment approved successfully',
      payment: updated,
    });
  } catch (error) {
    console.error('Error in verifyPayment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
