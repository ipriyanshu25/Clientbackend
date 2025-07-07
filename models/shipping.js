// models/privacypolicy.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const shippingSchema = new mongoose.Schema({
  shippingId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  updatedDate: {
    type: Date,
    default: Date.now
  },
  content: {
    type: String,
    required: true
  }
});

const Shipping = mongoose.models.Shipping ||
                      mongoose.model('Shipping', shippingSchema);

module.exports = Shipping;
