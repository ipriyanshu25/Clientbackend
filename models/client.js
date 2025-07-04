// models/client.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const clientSchema = new mongoose.Schema({
  clientId: {
    type: String,
    default: () => uuidv4(),
    unique: true
  },
  name: {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true }
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [EMAIL_REGEX, 'Please fill a valid email address']
  },
  otp: String,
  otpExpiry: Date,
  // Fields for email change flow
  pendingEmail: {
    type: String,
    lowercase: true,
    match: [EMAIL_REGEX, 'Please fill a valid email address']
  },
  pendingEmailOtp: String,
  pendingEmailOtpExpiry: Date
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);