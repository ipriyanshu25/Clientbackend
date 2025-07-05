const express = require('express');
const router = express.Router();
const policyCtrl = require('../controller/cookieController');

router.post('/create',                    policyCtrl.createCookie);
router.get('/get',                     policyCtrl.getAllCookies);

// POST-based lookup & update:
router.post('/getById',             policyCtrl.getCookieById);
router.post('/updateById',          policyCtrl.updateCookie);

module.exports = router;
