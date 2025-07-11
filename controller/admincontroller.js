// admincontroller.js
const Admin      = require('../models/admin');
const Campaign = require('../models/campaign');
const { STATUS } = require('../models/campaign');
const Client     = require('../models/client');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const nodemailer= require('nodemailer');
const crypto    = require('crypto');

// configure your SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
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

// ==== 1️⃣ Email Update Request – send OTP to current email ====
exports.requestEmailUpdate = async (req, res) => {
  const { adminId, newEmail } = req.body;
  if (!adminId || !newEmail) {
    return res.status(400).json({ message: 'adminId and newEmail are required' });
  }
  try {
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    // generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    admin.updateEmailOtp = {
      code: otp,
      newEmail,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    await admin.save();
    // send OTP to existing verified email
    await sendOtp(admin.email, 'Confirm your email change', otp);
    res.json({ message: 'OTP sent to your current email address' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==== 2️⃣ Verify Email Update OTP & apply change ====
exports.verifyEmailUpdate = async (req, res) => {
  const { adminId, otp } = req.body;
  if (!adminId || !otp) {
    return res.status(400).json({ message: 'adminId and otp are required' });
  }
  try {
    const admin = await Admin.findOne({ adminId });
    if (!admin || !admin.updateEmailOtp?.code) {
      return res.status(400).json({ message: 'No pending email update request' });
    }
    const { code, newEmail, expires } = admin.updateEmailOtp;
    if (Date.now() > expires || otp !== code) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    // apply email change
    admin.email = newEmail;
    admin.updateEmailOtp = undefined;
    await admin.save();
    // issue new JWT
    const payload = { adminId: admin.adminId, email: admin.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Email updated successfully', email: admin.email, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==== 3️⃣ Password Update – verify old password, set new password ====
exports.updatePassword = async (req, res) => {
  const { adminId, oldPassword, newPassword } = req.body;
  if (!adminId || !oldPassword || !newPassword) {
    return res.status(400).json({ message: 'adminId, oldPassword, and newPassword are required' });
  }
  try {
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    // verify old password
    const isMatch = await bcrypt.compare(oldPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old password is incorrect' });
    }
    // hash and set new password
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==== 4️⃣ Login (only verified admins) ==== (unchanged)
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

exports.updateStatus = async (req, res) => {
  try {
    const { campaignId, status } = req.body;

    // Validate inputs
    if (!campaignId || ![STATUS.PENDING, STATUS.COMPLETED].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'campaignId and valid status (0 or 1) are required'
      });
    }

    // Update the campaign
    const campaign = await Campaign.findOneAndUpdate(
      { campaignId },
      { status },
      { new: true, runValidators: true }
    );
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: `Campaign not found: ${campaignId}`
      });
    }

    // If marked completed, notify the client directly
    if (status === STATUS.COMPLETED) {
      const client = await Client
        .findOne({ clientId: campaign.clientId })
        .select('name.firstName email');

      if (client && client.email) {
        // format timestamp in IST
        const timestamp = new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: true
        });

        await transporter.sendMail({
          from: `"ShareMitra Notifications" <${process.env.SMTP_USER}>`,
          to:   client.email,
          subject: `Your ${campaign.serviceHeading} Campaign Is Complete`,
          text: `Hello ${client.name.firstName},

We’re happy to let you know that your campaign for “${campaign.serviceHeading}” was completed on ${timestamp} IST.

Thank you for partnering with us. If you have any feedback or need further assistance, please reply to this email or contact care@sharemitra.com.

Get More Services at https://sharemitra.com

Best regards,
The ShareMitra Team`
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Campaign status updated',
      campaign
    });
  } catch (err) {
    console.error('Error in updateStatus:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};