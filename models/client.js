// models/client.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs'); // switched to bcryptjs for compatibility

// Email regex: simple pattern, adjust as needed
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
// Password regex: min 8 chars, at least one lowercase, one uppercase, one digit, one special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

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
  password: {
    type: String,
    required: true,
    select: false,
    validate: {
      validator: (pw) => PASSWORD_REGEX.test(pw),
      message: 'Password must be at least 8 characters, include uppercase, lowercase, number, and special char.'
    }
  }
}, { timestamps: true });

clientSchema.virtual('confirmPassword')
  .get(function() { return this._confirmPassword; })
  .set(function(val) { this._confirmPassword = val; });

clientSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  if (this.password !== this._confirmPassword) {
    return next(new Error('Passwords do not match'));
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

module.exports = mongoose.model('Client', clientSchema);