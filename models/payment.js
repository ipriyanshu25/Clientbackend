const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
  orderId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  paymentId: { 
    type: String
  },
  signature: { 
    type: String 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    required: true, 
    default: 'USD' 
  },
  receipt: { 
    type: String 
  },
  // link back to the client record
  clientId: { 
    type: String, // supports UUIDs
    required: true 
  },
  // denormalized client name snapshot
  clientName: {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true }
  },
  // link back to the service record
  serviceId: { 
    type: String, // supports UUIDs
    required: true 
  },
  // denormalized service heading/title snapshot
  serviceHeading: {
    type: String,
    required: true,
    trim: true
  },
  status: { 
    type: String, 
    enum: ['created', 'paid', 'failed'], 
    default: 'created' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  paidAt: { 
    type: Date 
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
