// controllers/contactController.js
const Contact    = require('../models/contact');
const nodemailer = require('nodemailer');

exports.sendContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Save to database
    await new Contact({ name, email, subject, message }).save();

    // Configure your SMTP transporter
    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST1,                      // e.g. "smtp.example.com"
      port:   Number(process.env.SMTP_PORT1),              // 465 or 587
      secure: process.env.SMTP_SECURE1 === 'true',         // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER1,
        pass: process.env.SMTP_PASS1,
      },
      logger: true,      // log to console
      debug:  true,      // include SMTP traffic in logs
      tls: {
        // set to false to allow self-signed certs (ONLY if you understand the risks)
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
      }
    });

    // Verify connection configuration
    await transporter.verify();
    console.log('SMTP connection successful');

    // Send the email
    await transporter.sendMail({
      from:    email,                          // sender address
      to:      process.env.MAIL_TO1,            // receiver address
      replyTo: email,                          // replies go back to client
      subject: `Contact Us: ${subject}`,
      text:    `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    return res.status(200).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('ContactController Error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
