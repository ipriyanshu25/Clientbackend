const router = require('express').Router();
const {sendContact} = require('../controller/contactController');
const { verifyToken } = require('../middleware/auth');

// Routes
router.post('/send', sendContact);

module.exports = router;
