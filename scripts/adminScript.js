const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../models/admin');

async function createDefaultAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      console.log('Default admin already exists');
      return process.exit(0);
    }
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    await admin.save();
    console.log('Default admin created:', admin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error creating default admin:', error);
    process.exit(1);
  }
}

createDefaultAdmin();