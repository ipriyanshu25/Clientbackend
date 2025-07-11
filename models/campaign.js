// models/campaign.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// numeric status codes
const STATUS = {
  PENDING:   0,  // newly created, awaiting completion
  COMPLETED: 1   // fully processed/paid/approved
};

const actionSchema = new mongoose.Schema({
  contentId: {
    type: String,
    required: true
  },
  // human-readable key from serviceContent
  contentKey: {
    type: String,
    required: true,
    trim: true
  },
  // number of units requested
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  // price per unit
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // computed = quantity * unitPrice
  totalCost: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const campaignSchema = new mongoose.Schema({
  campaignId: {
    type: String,
    default: () => uuidv4(),
    required: true,
    unique: true
  },
  clientId: {
    type: String,
    ref: 'Client',
    required: true
  },
  clientName: {
    firstName: { type: String, required: true },
    lastName:  { type: String, required: true }
  },
  serviceId: {
    type: String,
    ref: 'Service',
    required: true
  },
  serviceHeading: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true,
    trim: true
  },
  actions: {
    type: [actionSchema],
    default: []
  },
  // summed in pre-validate hook
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: Number,
    enum: Object.values(STATUS),
    default: STATUS.PENDING,
    required: true
  }
}, {
  timestamps: true
});

// pre-validate hook to populate contentKey, unitPrice, totalCost, and totalAmount
campaignSchema.pre('validate', async function(next) {
  try {
    const Service = mongoose.model('Service');
    const service = await Service
      .findOne({ serviceId: this.serviceId })
      .select('serviceContent');
    if (!service) {
      return next(new Error(`Service not found: ${this.serviceId}`));
    }

    let grandTotal = 0;
    for (const action of this.actions) {
      const entry = service.serviceContent.find(c => c.contentId === action.contentId);
      if (!entry) {
        this.invalidate(
          'actions',
          `Invalid contentId "${action.contentId}" for service ${this.serviceId}`
        );
        continue;
      }
      const price = Number(entry.value);
      action.contentKey = entry.key;
      action.unitPrice  = price;
      action.totalCost  = price * action.quantity;
      grandTotal       += action.totalCost;
    }

    this.totalAmount = grandTotal;
    next();
  } catch (err) {
    next(err);
  }
});

// expose STATUS constants on the model
campaignSchema.statics.STATUS = STATUS;

module.exports = mongoose.model('Campaign', campaignSchema);
