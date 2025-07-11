// models/payment.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  paymentId: {
    type: String
  },
  signature: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true
  },
  receipt: {
    type: String,
    required: true
  },
  clientId: {
    type: String,
    required: true
  },
  clientName: {
    firstName: String,
    lastName: String
  },
  serviceId: {
    type: String,
    required: true
  },
  serviceHeading: {
    type: String
  },
  status: {
    type: String,
    enum: ['created', 'approved', 'failed'],
    default: 'created'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('Payment', paymentSchema);
