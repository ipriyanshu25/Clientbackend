const express = require('express');
const router = express.Router();
const { createService, getAllServices ,getServiceById,updateService,deleteServiceContent,deleteService} = require('../controller/servicesController');

// Routes
router.post('/create', createService);
router.get('/getAll', getAllServices);
router.post('/getById', getServiceById);
router.post('/update', updateService);
router.post('/deleteContent', deleteServiceContent);
router.post('/delete', deleteService);

module.exports = router;