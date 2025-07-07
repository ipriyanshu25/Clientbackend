const express = require('express');
const router = express.Router();
const { login } = require('../controller/admincontroller');
// const { protect } = require('../middleware/authMiddleware');

// Public route
router.post('/login', login);

// Protected route to get current admin info
// router.get('/me', protect, (req, res) => {
//   res.json({ adminId: req.admin.adminId, email: req.admin.email });
// });

module.exports = router;
