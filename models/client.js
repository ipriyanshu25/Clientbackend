const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const clientSchema = new mongoose.Schema(
  {
    clientId: { type: String, default: () => uuidv4(), unique: true },

    name: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true }
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [EMAIL_REGEX, 'Please fill a valid email address']
    },

    /** New */
    passwordHash: { type: String, required: false },

    /** OTP – used only for registration / email-change */
    otp: String,
    otpExpiry: Date,
    resetPasswordOtp: String,
    resetPasswordOtpExpiry: Date,

  },
  { timestamps: true }
);

/* helper */
clientSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('Client', clientSchema);
