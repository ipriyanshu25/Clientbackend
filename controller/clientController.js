const Client = require('../models/client');
const bcrypt = require('bcryptjs'); // bcryptjs sync with model
const { generateToken } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;


    const client = new Client({
      name: { firstName, lastName },
      email,
      password,
      confirmPassword
    });
    await client.save();

    const token = generateToken(client);
    res.status(201).json({ clientId: client.clientId, token });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const client = await Client.findOne({ email }).select('+password');
    if (!client) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, client.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(client);
    res.status(200).json({ message: 'Login successful', clientId: client.clientId, token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getClientById = async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    // Exclude internal _id, __v and password fields
    const client = await Client.findOne({ clientId })
      .select('-_id -__v -password');
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    return res.status(200).json(client);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


exports.updatePassword = async (req, res) => {
  try {
    const { clientId, oldPassword, newPassword } = req.body;
    if (!clientId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'clientId, oldPassword and newPassword are all required' });
    }

    // Fetch client including hashed password
    const client = await Client.findOne({ clientId }).select('+password');
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, client.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }

    // Hash & save new password
    client.password = newPassword;
    await client.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find().select('-_id -__v -password');
    res.status(200).json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
