// models/Sequence.js

const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequenceValue: {
    type: Number,
    default: 0
  }
}, {
  collection: 'sequences'
});

module.exports = mongoose.model('Sequence', sequenceSchema);
