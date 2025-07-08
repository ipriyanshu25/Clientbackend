// app.js
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const http     = require('http');

const clientRouter = require('./routes/clientRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const paymentRoutes       = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes'); // Uncomment if you have admin routes
const contactRoutes = require('./routes/contactRoutes'); // Uncomment if you have contact routes
const privacyRoutes = require('./routes/privacyRoutes'); // Privacy policy routes
const cookieRoutes = require('./routes/cookieRoutes'); // Cookie policy routes
const returnRoutes = require('./routes/returnRoutes'); // Return policy routes
const shippingRoutes = require('./routes/shippingRoutes'); // Shipping policy routes
const termsRoutes = require('./routes/termRoutes'); // Terms of service routes
const faqRoutes = require('./routes/faqsRoutes'); // Uncomment if you have FAQ routes


const app    = express();
const server = http.createServer(app);

// attach Socket.io
app.use(cors({
  origin:      process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/client', clientRouter);
app.use('/service', serviceRoutes);
app.use('/campaign', campaignRoutes);
app.use('/payment', paymentRoutes);
app.use('/admin', adminRoutes); // Uncomment if you have admin routes
app.use('/contact', contactRoutes); // Uncomment if you have contact routes
app.use('/privacy', privacyRoutes); // Privacy policy routes
app.use('/cookie', cookieRoutes); // Cookie policy routes
app.use('/return', returnRoutes); // Return policy routes
app.use('/shipping', shippingRoutes); // Shipping policy routes
app.use('/terms', termsRoutes); // Terms of service routes
app.use('/faqs', faqRoutes); // Uncomment if you have FAQ routes


// connect to Mongo & start server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
