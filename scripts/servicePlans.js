// scripts/servicePlans.js
require('dotenv').config();
const mongoose = require('mongoose');
const ServicePlan = require('../models/servicePlan'); // Adjust the path as necessary


const plans = [
  {
    name: 'Basic',
    amount: 29,
    features: [
      { key: '1000 Likes'}, // per month
      { key: '50 Commentst'},
      { key: '24h Delivery'},
      { key: 'Basic Support'}  // 0 → none, 1 → included
    ]
  },
  {
    name: 'Premium',
    amount: 79,
    features: [
      { key: '5000 Likes' },
      { key: '200 Comments'},
      { key: '100 Replies'},
      { key: '12h Delivery'},
      { key: 'Priority Support' } // 0 → none, 1 → included
    ]
  },
  {
    name: 'pro',
    amount: 199,
    features: [
      { key: '1000+ Likes', value: 500 },
      { key: '1000 Comment', value: 0 }, // 0 → unlimited
      { key: '500 Replies', value: 500 },
      { key: '6h Delivery', value: 1 },
      { key: '24/7 Support', value: 1 }, // 0 → none, 1 → included
      { key: 'Custom Strategy', value: 1 },
    ]
  },
];

async function seed() {
  try {
    // 1️⃣ Connect
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // 2️⃣ Clear existing plans
    await ServicePlan.deleteMany({});
    console.log('🗑️  Cleared existing service plans');

    // 3️⃣ Insert new ones
    const inserted = await ServicePlan.insertMany(plans);
    console.log(`✅ Inserted ${inserted.length} service plans`);

  } catch (err) {
    console.error('❌ Error seeding plans:', err);
    process.exit(1);
  } finally {
    // 4️⃣ Cleanup
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  }
}

seed();
