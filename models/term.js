// models/term.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const termSchema = new mongoose.Schema({
  termId: {
    type: String,
    default: uuidv4,
    unique: true
  },
  content: {
    type: String,
    required: true
  }
});

const Term = mongoose.models.Term ||
                      mongoose.model('TermPolicy', termSchema);

module.exports = Term;
