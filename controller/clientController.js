const Client = require('../models/client');
const { generateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');

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

/**
 * POST /client/generateOtp
 * Body: { firstName, lastName, email }
 *
 * Only for **registration**. If the email is already registered, returns 409 Conflict.
 */
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
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (client.otp !== otp || client.otpExpiry < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // clear OTP fields
    client.otp = undefined;
    client.otpExpiry = undefined;
    await client.save();

    // issue token
    const token = generateToken(client);
    res
      .status(200)
      .json({ message: 'Registration successful', clientId: client.clientId, token });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ message: err.message });
  }
};

// Generate and send OTP for **login**
exports.generateLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    let client = await Client.findOne({ email });
    if (!client) {
      client = new Client({ email });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    client.otp = otp;
    client.otpExpiry = Date.now() + 10 * 60 * 1000;
    await client.save();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your Login OTP',
      text: `Your one-time login code is ${otp}. It expires in 10 minutes.`
    });

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('generateLoginOtp:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /client/login/verify-otp
 * Body: { email, otp }
 */
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const client = await Client.findOne({ email });
    if (
      !client ||
      client.otp !== otp ||
      client.otpExpiry < Date.now()
    ) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    client.otp = undefined;
    client.otpExpiry = undefined;
    await client.save();

    const token = generateToken(client);
    res.status(200).json({
      message: 'Login successful',
      clientId: client.clientId,
      token
    });
  } catch (err) {
    console.error('verifyLoginOtp:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Generate OTP for email update
exports.generateEmailOtp = async (req, res) => {
  try {
    const { clientId, newEmail } = req.body;
    if (!clientId || !newEmail) {
      return res.status(400).json({ message: 'clientId and newEmail are required' });
    }

    const client = await Client.findOne({ clientId });
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    client.pendingEmail = newEmail;
    client.pendingEmailOtp = otp;
    client.pendingEmailOtpExpiry = expiry;
    await client.save();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: newEmail,
      subject: 'Your Email Change OTP',
      text: `Hello ${client.name.firstName},\n\nYour email change OTP is ${otp}. It will expire in 10 minutes.\n\nThank you.`
    });

    res.status(200).json({ message: 'Email change OTP sent' });
  } catch (err) {
    console.error('generateEmailOtp:', err);
    res.status(500).json({ message: err.message });
  }
};

// Verify email update OTP and apply new email
exports.verifyEmailOtp = async (req, res) => {
  try {
    const { clientId, otp } = req.body;
    if (!clientId || !otp) {
      return res.status(400).json({ message: 'clientId and otp are required' });
    }

    const client = await Client.findOne({ clientId });
    if (!client || client.pendingEmailOtp !== otp || client.pendingEmailOtpExpiry < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    client.email = client.pendingEmail;
    client.pendingEmail = undefined;
    client.pendingEmailOtp = undefined;
    client.pendingEmailOtpExpiry = undefined;
    await client.save();

    res.status(200).json({ message: 'Email updated successfully', email: client.email });
  } catch (err) {
    console.error('verifyEmailOtp:', err);
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
    const clients = await Client.find()
      .select('-_id -__v -otp -otpExpiry -pendingEmailOtp -pendingEmailOtpExpiry -pendingEmail');
    res.status(200).json(clients);
  } catch (err) {
    console.error('getAllClients:', err);
    res.status(500).json({ error: err.message });
  }
};
