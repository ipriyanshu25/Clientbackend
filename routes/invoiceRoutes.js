const express            = require('express');
const router             = express.Router();
const invoiceController  = require('../controller/invoiceController');

// Generate a new invoice PDF
router.post('/generate', invoiceController.generateInvoice);

// Get all invoices for a campaign (JSON)
router.post('/by-campaignId', invoiceController.getInvoicesByCampaign);

// Download (view + download) PDF invoice for a campaign
router.post('/download', invoiceController.downloadInvoiceByCampaign);

// Get a single invoice by its ID (JSON)
router.post('/get-invoice-by-id', invoiceController.getInvoiceById);

module.exports = router;
