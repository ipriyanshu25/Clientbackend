// models/servicePlan.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Define the subscription plan schema
const subscriptionPlanSchema = new mongoose.Schema(
  {
    planId: { 
      type: String, 
      required: true, 
      unique: true, 
      default: uuidv4  // Automatically generate a unique ID for each plan
    },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    features: [
      {
        key: { type: String, required: true },
        value: { type: Number, default: 0 }  // Optional: Default value for features that might not need a "value"
      }
    ]
  },
  { timestamps: true }  // Optional: Adds createdAt and updatedAt fields
);

// Create the model based on the schema
const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan;
