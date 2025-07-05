// models/privacypolicy.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const privacyPolicySchema = new mongoose.Schema({
  privacyId: {
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

const PrivacyPolicy = mongoose.models.PrivacyPolicy ||
                      mongoose.model('PrivacyPolicy', privacyPolicySchema);

module.exports = PrivacyPolicy;
