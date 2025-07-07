// models/privacypolicy.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const returnSchema = new mongoose.Schema({
    returnId: {
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

const Return = mongoose.models.Return ||
    mongoose.model('Return', returnSchema);

module.exports = Return;
