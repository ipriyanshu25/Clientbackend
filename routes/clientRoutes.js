const router = require('express').Router();
const { generateOtp, login,getClientById,getAllClients,generateEmailOtp,verifyEmailOtp} = require('../controller/clientController');
const { verifyToken } = require('../middleware/auth');

router.post('/generateOtp', generateOtp);
router.post('/login', login);

router.post('/generateEmailOtp', generateEmailOtp);
router.post('/verifyEmailOtp', verifyEmailOtp);


router.post('/getById',getClientById);
router.get('/getAll',getAllClients);

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Protected data', client: req.client });
});

module.exports = router;
