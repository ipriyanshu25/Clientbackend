const Client = require('../models/client');
const { generateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

// Configure your SMTP transporter via environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});


const SALT_ROUNDS = 10; // bcrypt salt rounds for password hashing
exports.generateOtp = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    if (!firstName || !lastName || !email) {
      return res
        .status(400)
        .json({ message: 'First name, last name and email are required' });
    }

    // **NEW**: reject if this email already exists
    const existing = await Client.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'User already exists. Please log in instead.' });
    }

    // create a new client record
    const client = new Client({ name: { firstName, lastName }, email });

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    client.otp = otp;
    client.otpExpiry = otpExpiry;
    await client.save();

    // send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your Registration OTP',
      text: `Hello ${firstName},\n\nYour OTP code is ${otp}. It will expire in 10 minutes.\n\nThank you.`
    });

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('generateOtp:', err);
    res.status(500).json({ message: err.message });
  }
};

// Verify registration OTP and issue token
exports.register = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password)
      return res.status(400).json({ message: 'Email, OTP & password are required' });

    const client = await Client.findOne({ email });
    if (!client)          return res.status(404).json({ message: 'Client not found' });
    if (client.passwordHash)
      return res.status(409).json({ message: 'Account already completed. Please login.' });

    if (client.otp !== otp || client.otpExpiry < new Date())
      return res.status(401).json({ message: 'Invalid or expired OTP' });

    /* hash & store password */
    client.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    /* wipe OTP fields */
    client.otp = client.otpExpiry = undefined;
    await client.save();

    const token = generateToken(client);
    res.status(200).json({ message: 'Registration successful', clientId: client.clientId, token });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ message: err.message });
  }
};

/*  ⬇  NEW email+password login  ⬇ */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const client = await Client.findOne({ email });
    if (!client || !client.passwordHash || !(await client.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(client);
    res.status(200).json({ message: 'Login successful', clientId: client.clientId, token });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ message: err.message });
  }
};


// Retrieve a single client (no sensitive fields)
exports.getClientById = async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    const client = await Client.findOne({ clientId })
      .select('-_id -__v -otp -otpExpiry -pendingEmailOtp -pendingEmailOtpExpiry -pendingEmail');
    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.status(200).json(client);
  } catch (err) {
    console.error('getClientById:', err);
    res.status(500).json({ error: err.message });
  }
};

// Retrieve all clients
exports.getAllClients = async (req, res) => {
  try {
    // 1) Parse & normalize query params
    const page       = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit      = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const sortBy     = req.query.sortBy      || 'createdAt';
    const sortOrder  = req.query.sortOrder   === 'desc' ? 1 : -1;
    const searchTerm = (req.query.search || '').trim();

    // 2) Build base filter
    const filter = {};
    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i');
      filter.$or = [
        { 'name.firstName': regex },
        { 'name.lastName':  regex },
        { email:            regex },
      ];
    }

    // 3) Count total matching docs (for pagination meta)
    const totalRecords = await Client.countDocuments(filter);

    // 4) Fetch page of clients
    const clients = await Client.find(filter)
      .select('-_id -__v -otp -otpExpiry -pendingEmailOtp -pendingEmailOtpExpiry -pendingEmail')
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    // 5) Compute total pages
    const totalPages = Math.ceil(totalRecords / limit);

    // 6) Send response
    res.status(200).json({
      data: clients,
      meta: {
        page,
        limit,
        totalPages,
        totalRecords,
      },
    });
  } catch (err) {
    console.error('getAllClients:', err);
    res.status(500).json({ error: err.message });
  }
};


/* -------------------------------------------------------------------- */
/* 1️⃣  Authenticated password change  (old → new)                       */
/* -------------------------------------------------------------------- */
/* PUT /client/updatePassword
 * Body: { clientId, oldPassword, newPassword }
 */
// controllers/clientController.js
exports.updatePassword = async (req, res) => {
  try {
    const { clientId, oldPassword, newPassword } = req.body;
    if (!clientId || !oldPassword || !newPassword) {
      return res.status(400).json({
        message: 'clientId, oldPassword and newPassword are required'
      });
    }

    // Lookup by clientId
    const client = await Client.findOne({ clientId });
    if (!client || !client.passwordHash) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Verify old password
    const ok = await client.comparePassword(oldPassword);
    if (!ok) {
      return res.status(401).json({ message: 'Old password incorrect' });
    }

    // Hash and store new password
    client.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await client.save();

    // Send confirmation email
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true
    });
    await transporter.sendMail({
      from: `"Password Updated! " <${process.env.SMTP_USER}>`,
      to: client.email,
      subject: 'Your ShareMitra Password Was Updated',
      text: `Hello ${client.name.firstName},

Your account password was successfully updated on ${timestamp}.

If you did not make this change, please contact our support team immediately at care@sharemitra.com.

Best regards,
ShareMitra Support Team`
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('updatePassword:', err);
    res.status(500).json({ message: err.message });
  }
};



/* -------------------------------------------------------------------- */
/* 2️⃣  “Forgot password” – step 1: send OTP                             */
/* -------------------------------------------------------------------- */
exports.generateResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const client = await Client.findOne({ email });
    if (!client) return res.status(404).json({ message: 'Account not found' });

    const otp  = Math.floor(100000 + Math.random() * 900000).toString();
    const exp  = new Date(Date.now() + 10 * 60 * 1000);

    client.resetPasswordOtp       = otp;
    client.resetPasswordOtpExpiry = exp;
    await client.save();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your Password-Reset OTP',
      text: `Your password-reset code is ${otp}. It expires in 10 minutes.`
    });

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('generateResetOtp:', err);
    res.status(500).json({ message: err.message });
  }
};

/* -------------------------------------------------------------------- */
/* 3️⃣  “Forgot password” – step 2: verify OTP & set new password        */
/* -------------------------------------------------------------------- */
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: 'Email, otp & newPassword required' });

    const client = await Client.findOne({ email });
    if (
      !client ||
      client.resetPasswordOtp !== otp ||
      client.resetPasswordOtpExpiry < new Date()
    ) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    client.passwordHash          = await bcrypt.hash(newPassword, SALT_ROUNDS);
    client.resetPasswordOtp      = undefined;
    client.resetPasswordOtpExpiry= undefined;
    await client.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('verifyResetOtp:', err);
    res.status(500).json({ message: err.message });
  }
};
