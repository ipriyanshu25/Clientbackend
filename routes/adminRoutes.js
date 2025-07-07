const express = require('express');
const router = express.Router();
const { login ,updateCredentials} = require('../controller/admincontroller');
// const { protect } = require('../middleware/authMiddleware');

// Public route
router.post('/login', login);
router.post('/update',updateCredentials);

// Protected route to get current admin info
// router.get('/me', protect, (req, res) => {
//   res.json({ adminId: req.admin.adminId, email: req.admin.email });
// });

module.exports = router;
