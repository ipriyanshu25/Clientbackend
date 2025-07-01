const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// sub-schema for individual content items, now with its own contentId
const serviceContentSchema = new mongoose.Schema({
  contentId: {
    type: String,
    default: () => uuidv4(),
    required: true,
    unique: false
  },
  key: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false }); // we’re using contentId instead of the default _id

// main Service schema
const serviceSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    default: () => uuidv4(),
    required: true,
    unique: true
  },
  serviceHeading: {
    type: String,
    required: true,
    trim: true
  },
  serviceDescription: {
    type: String,
    required: true,
    trim: true
  },
  // array of { contentId, key, value }
  serviceContent: {
    type: [serviceContentSchema],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Service', serviceSchema);
