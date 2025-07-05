const express = require('express');
const router = express.Router();
const policyCtrl = require('../controller/privacyController');

router.post('/create',                    policyCtrl.createPrivacyPolicy);
router.get('/get',                     policyCtrl.getAllPrivacyPolicies);

// POST-based lookup & update:
router.post('/getById',             policyCtrl.getPrivacyPolicyByBody);
router.post('/updateById',          policyCtrl.updatePrivacyPolicyByBody);

module.exports = router;
