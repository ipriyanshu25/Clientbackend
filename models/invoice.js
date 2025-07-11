// models/Invoice.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const InvoiceSchema = new mongoose.Schema({
  // Unique UUID for each invoice
  invoiceId: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  // Human-readable sequence number (e.g. INV00001)
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  // Reference to the campaign
  campaignId: {
    type: String,
    required: true
  },
  // Dates in YYYY-MM-DD format
  invoiceDate: {
    type: String,
    required: true
  },
  dueDate: {
    type: String,
    required: true
  },
  // Client billing details
  billTo: {
    fullName: { type: String, required: true },
    email:    { type: String, required: true }
  },
  // Line items from the campaign
  items: [
    {
      contentKey: { type: String, required: true },
      unitPrice:  { type: Number, required: true },
      quantity:   { type: Number, required: true },
      totalCost:  { type: Number, required: true }
    }
  ],
  subtotal: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  note: {
    type: String
  },
  paymentInfo: {
    // Stores Razorpay order/payment details and any extra info
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);