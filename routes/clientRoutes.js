const router = require('express').Router();
const { register, login,getClientById,updatePassword ,getAllClients} = require('../controller/clientController');
const { verifyToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/getById',getClientById);
router.post('/update',updatePassword);
router.get('/getAll',getAllClients);
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Protected data', client: req.client });
});

module.exports = router;
