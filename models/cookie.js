const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const cookieSchema = new mongoose.Schema({
  cookieId: {
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

const Cookie = mongoose.models.Cookie ||
                      mongoose.model('Cookie', cookieSchema);

module.exports = Cookie;
