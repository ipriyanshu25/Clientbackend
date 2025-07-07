const express = require('express');
const router = express.Router();
const policyCtrl = require('../controller/returnController');

router.post('/create',                    policyCtrl.createReturn);
router.get('/get',                     policyCtrl.getAllReturns);

// POST-based lookup & update:
router.post('/getById',             policyCtrl.getReturnById);
router.post('/updateById',          policyCtrl.updateReturn);

module.exports = router;
