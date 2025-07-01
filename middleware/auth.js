const jwt = require('jsonwebtoken');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error('JWT_SECRET not set in .env');
}

// Generate a token for a client
exports.generateToken = (client) => {
  return jwt.sign({ clientId: client.clientId, email: client.email }, SECRET, { expiresIn: '1h' });
};

// Middleware to verify token
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.client = decoded; // attach client payload
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};