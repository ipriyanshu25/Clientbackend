const router = require('express').Router();
const { generateOtp, register,getClientById,getAllClients,generateEmailOtp,verifyEmailOtp,generateLoginOtp,verifyLoginOtp} = require('../controller/clientController');
const { verifyToken } = require('../middleware/auth');

router.post('/generateOtp', generateOtp);
router.post('/register', register);

router.post('/generateLoginOtp', generateLoginOtp);
router.post('/verifyLoginOtp', verifyLoginOtp);

router.post('/generateEmailOtp', generateEmailOtp);
router.post('/verifyEmailOtp', verifyEmailOtp);


router.post('/getById',getClientById);
router.get('/getAll',getAllClients);

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Protected data', client: req.client });
});

module.exports = router;
