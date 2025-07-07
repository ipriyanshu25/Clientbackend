const express = require('express');
const router = express.Router();
const policyCtrl = require('../controller/termController');

router.post('/create',                    policyCtrl.createTerm);
router.get('/get',                     policyCtrl.getAllTerms);

// POST-based lookup & update:
router.post('/getById',             policyCtrl.getTermById);
router.post('/updateById',          policyCtrl.updateTerm);

module.exports = router;
