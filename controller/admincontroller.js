const Admin     = require('../models/admin');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const nodemailer= require('nodemailer');
const crypto    = require('crypto');

// configure your SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE==='true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// helper to send OTP
async function sendOtp(email, subject, otp) {
  await transporter.sendMail({
    from: `"No Reply" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    text: `Your OTP code is ${otp}. It expires in 10 minutes.`
  });
}

// 1️⃣ Register – request OTP
exports.register = async (req, res) => {
  const { email } = req.body;
  try {
    let admin = await Admin.findOne({ email });
    if (admin && admin.isVerified) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    if (!admin) {
      // create a placeholder admin
      admin = new Admin({ 
        adminId: crypto.randomUUID(), 
        email 
      });
    }
    // generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    admin.emailOtp = {
      code: otp,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    await admin.save();
    await sendOtp(email, 'Verify your admin registration', otp);
    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 2️⃣ Verify registration OTP & set password
exports.verifyEmailOtp = async (req, res) => {
  const { email, otp, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin || !admin.emailOtp?.code) {
      return res.status(400).json({ message: 'No pending registration for this email' });
    }
    if (Date.now() > admin.emailOtp.expires || otp !== admin.emailOtp.code) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    // mark verified + hash password
    admin.isVerified = true;
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(password, salt);
    admin.emailOtp = undefined;
    await admin.save();
    res.json({ message: 'Registration complete. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 3️⃣ Login (only verified admins)
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin || !admin.isVerified) {
      return res.status(401).json({ message: 'Invalid email or not verified' });
    }
    const isMatch = await bcrypt.compare(password.trim(), admin.password.trim());
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    const payload = { adminId: admin.adminId, email: admin.email };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, adminId: admin.adminId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 4️⃣ Forgot password – request reset OTP
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: 'Email not found' });
    }
    const otp = crypto.randomInt(100000, 999999).toString();
    admin.resetOtp = {
      code: otp,
      expires: Date.now() + 10 * 60 * 1000
    };
    await admin.save();
    await sendOtp(email, 'Your password reset OTP', otp);
    res.json({ message: 'Reset OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 5️⃣ Verify reset OTP & update password
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin || !admin.resetOtp?.code) {
      return res.status(400).json({ message: 'No reset requested for this email' });
    }
    if (Date.now() > admin.resetOtp.expires || otp !== admin.resetOtp.code) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.resetOtp = undefined;
    await admin.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
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