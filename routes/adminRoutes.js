const express = require('express');
const router  = express.Router();
const adminC  = require('../controller/admincontroller');

router.post('/register',           adminC.register);
router.post('/verify-email-otp',   adminC.verifyEmailOtp);
router.post('/login',              adminC.login);
router.post('/forgot-password',    adminC.forgotPassword);
router.post('/reset-password',     adminC.resetPassword);
router.post('/update',adminC.updateCredentials);

// Protected route to get current admin info
// router.get('/me', protect, (req, res) => {
//   res.json({ adminId: req.admin.adminId, email: req.admin.email });
// });

module.exports = router;
