const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const actionSchema = new mongoose.Schema({
  contentId: {
    type: String,
    required: true
  },
  // snapshot of the serviceContent.key
  contentKey: {
    type: String,
    required: true,
    trim: true
  },
  // entered by the user
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  // pulled from serviceContent.value
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // = quantity * unitPrice
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
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Pre-validate: fetch the Service, validate each action.contentId,
// fill in contentKey/unitPrice/totalCost, and sum totalAmount
campaignSchema.pre('validate', async function(next) {
  const Service = mongoose.model('Service');
  const service = await Service.findOne({ serviceId: this.serviceId }).select('serviceContent');
  if (!service) {
    return next(new Error(`Service not found: ${this.serviceId}`));
  }

  let grandTotal = 0;
  this.actions.forEach(action => {
    const entry = service.serviceContent.find(c => c.contentId === action.contentId);
    if (!entry) {
      this.invalidate(
        'actions',
        `Invalid contentId "${action.contentId}" for service ${this.serviceId}`
      );
      return;
    }
    const price = Number(entry.value);
    action.contentKey = entry.key;
    action.unitPrice  = price;
    action.totalCost  = price * action.quantity;
    grandTotal       += action.totalCost;
  });

  this.totalAmount = grandTotal;
  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);
