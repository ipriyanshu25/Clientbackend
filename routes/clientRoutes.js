const router = require('express').Router();
const {
  generateOtp,
  register,
  login,
  getClientById,
  getAllClients,
  generateResetOtp,
  verifyResetOtp,
  updatePassword
} = require('../controller/clientController');
const { verifyToken } = require('../middleware/auth');

router.post('/generateOtp', generateOtp);      // step 1 of registration
router.post('/register',    register);         // step 2 + password

router.post('/login',       login);            // email+password


/* queries */
router.post('/getById',  getClientById);
router.get ('/getAll',   getAllClients);

/* password reset */
router.post('/generateResetOtp', generateResetOtp); // step 1 of password reset
router.post('/verifyResetOtp', verifyResetOtp);     // step 2 of password reset

router.post('/update', updatePassword); // update passwprd

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Protected data', client: req.client });
});

module.exports = router;
 