// controllers/admin.js
const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email' });
    }

    // sometimes there’s stray whitespace in the client or DB—trim both
    const plain = password.trim();
    const hash  = admin.password.trim();

    const isMatch = await bcrypt.compare(plain, hash);
    console.log('  → bcrypt.compare result:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    const payload = { adminId: admin.adminId, email: admin.email };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    return res.json({ token, adminId: admin.adminId });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


exports.updateCredentials = async (req, res) => {
  const { adminId, newEmail, newPassword } = req.body;

  if (!adminId) {
    return res.status(400).json({ message: 'adminId is required' });
  }
  if (!newEmail && !newPassword) {
    return res
      .status(400)
      .json({ message: 'Must supply newEmail, newPassword, or both' });
  }

  // 1) Prepare the update object
  const updates = {};
  if (newEmail) {
    updates.email = newEmail;
  }
  if (newPassword) {
    const salt          = await bcrypt.genSalt(10);
    updates.password    = await bcrypt.hash(newPassword, salt);
  }

  // 2) Atomically update and get the new document back
  const updatedAdmin = await Admin.findOneAndUpdate(
    { adminId },
    { $set: updates },
    { new: true }
  );
  if (!updatedAdmin) {
    return res.status(404).json({ message: 'Admin not found' });
  }

  // 3) Log the new hash so you can check it in your console
  console.log('🔄 Updated hash for', updatedAdmin.email, ':', updatedAdmin.password);

  // 4) Issue a fresh JWT
  const payload = { adminId: updatedAdmin.adminId, email: updatedAdmin.email };
  const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

  // 5) Return everything—including the new hash—for debugging
  return res.json({
    message: 'Credentials updated successfully',
    adminId: updatedAdmin.adminId,
    email: updatedAdmin.email,
    token
  });
};