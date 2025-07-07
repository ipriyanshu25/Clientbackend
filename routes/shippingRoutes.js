const express = require('express');
const router = express.Router();
const policyCtrl = require('../controller/shippingController');

router.post('/create',                    policyCtrl.createShipping);
router.get('/get',                     policyCtrl.getAllShippings);

// POST-based lookup & update:
router.post('/getById',             policyCtrl.getShippingById);
router.post('/updateById',          policyCtrl.updateShipping);

module.exports = router;
