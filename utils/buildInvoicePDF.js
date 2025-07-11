//utils/buildInvoicePDF.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Default settings, switched to a light-green theme
const DEFAULT_SETTINGS = {
  logoPath: path.join(__dirname, '..', 'static', 'assets', 'logo.png'),
  fonts: {
    regular: path.join(__dirname, '..', 'static', 'Lexend-Regular.ttf'),
    bold: path.join(__dirname, '..', 'static', 'Lexend-Bold.ttf')
  },
  colors: {
    black: [0, 0, 0],
    lightGreen: [225, 255, 228],
    darkGreen: [34, 139, 34]
  },
  companyInfo: {
    name: 'ShareMitra',
    address: '8825 Perimeter Parkway, Suite 501',
    cityState: 'Jaksonville, Florida, 32216, USA',
    phone: '+1-904-219-4648',
    email: 'care@sharemitra.com'
  }
};

// Column positions for items table
const COLUMNS = {
  desc: 50,
  unit: 300,
  qty: 380,
  amount: 440
};

/**
 * Build a PDFDocument in memory and return a Promise<Buffer>
 * @param {Object} invoice     – the saved invoice record
 * @param {Object} campaign    – the campaign.lean() document
 * @param {Object} client      – the client.lean() document
 * @param {Object} payment     – the payment document
 */
function buildInvoicePDF(invoice, campaign, client, payment) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // Header with logo and company info
    if (fs.existsSync(DEFAULT_SETTINGS.logoPath)) {
      const imgSize = 100;
      const imgX = 40;
      const imgY = 45;
      doc.save();
      doc.circle(imgX + imgSize / 2, imgY + imgSize / 2, imgSize / 2).clip();
      doc.image(DEFAULT_SETTINGS.logoPath, imgX, imgY, { width: imgSize, height: imgSize });
      doc.restore();
      doc.moveDown(1.5);
    }
    doc
      .registerFont('Lexend', DEFAULT_SETTINGS.fonts.regular)
      .registerFont('Lexend-B', DEFAULT_SETTINGS.fonts.bold)
      .font('Lexend-B').fontSize(20).fillColor(DEFAULT_SETTINGS.colors.darkGreen)
      .text(DEFAULT_SETTINGS.companyInfo.name, { align: 'right' })
      .moveDown(0.5)
      .font('Lexend').fontSize(10).fillColor(DEFAULT_SETTINGS.colors.black)
      .text(DEFAULT_SETTINGS.companyInfo.address, { align: 'right' })
      .text(DEFAULT_SETTINGS.companyInfo.cityState, { align: 'right' })
      .text(`Phone: ${DEFAULT_SETTINGS.companyInfo.phone}`, { align: 'right' })
      .text(DEFAULT_SETTINGS.companyInfo.email, { align: 'right' })
      .moveDown(1.5);

    // Bill To Box
    let y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 60)
      .fill(DEFAULT_SETTINGS.colors.lightGreen).stroke();
    doc
      .fillColor(DEFAULT_SETTINGS.colors.black)
      .font('Lexend-B').text('Bill To:', 50, y + 10)
      .font('Lexend').text(`${client.name.firstName} ${client.name.lastName}`, 50, doc.y + 4)
      .text(client.email, 50)
      .moveDown(1.5);

    // Transaction Details Box
    y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 80)
      .fill(DEFAULT_SETTINGS.colors.lightGreen).stroke();
    doc
      .fillColor(DEFAULT_SETTINGS.colors.black)
      .font('Lexend-B').text('Transaction Details:', 50, y + 10)
      .font('Lexend').text(`Order ID: ${payment.orderId}`, 50, doc.y + 4)
      .text(`Payment ID: ${payment.paymentId}`, 50)
      .text(`Amount: $${(payment.amount / 100).toFixed(2)} ${payment.currency}`, 50)
      .text(`Date: ${invoice.invoiceDate}`, 50)
      .moveDown(2);

    // Table Header
    y = doc.y;
    doc.rect(40, y, doc.page.width - 80, 25)
      .fill(DEFAULT_SETTINGS.colors.darkGreen);
    doc
      .fillColor('white').font('Lexend-B').fontSize(11)
      .text('SERVICES', COLUMNS.desc, y + 8, { width: 250 })
      .text('UNIT PRICE', COLUMNS.unit, y + 8, { width: 80, align: 'center' })
      .text('QTY', COLUMNS.qty, y + 8, { width: 60, align: 'center' })
      .text('AMOUNT', COLUMNS.amount, y + 8, { width: 100, align: 'right' })
      .moveDown();

    // Table Rows
    doc.font('Lexend').fontSize(10).fillColor(DEFAULT_SETTINGS.colors.black);
    let subtotal = 0;
    invoice.items.forEach(item => {
      const rate = parseFloat(item.unitPrice) || 0;
      const qty = parseInt(item.quantity, 10) || 1;
      const amt = parseFloat(item.totalCost) || rate * qty;
      subtotal += amt;
      const rowY = doc.y;
      doc
        .text(item.contentKey, COLUMNS.desc, rowY, { width: 250 })
        .text(`$${rate.toFixed(2)}`, COLUMNS.unit, rowY, { width: 80, align: 'center' })
        .text(qty, COLUMNS.qty, rowY, { width: 60, align: 'center' })
        .text(`$${amt.toFixed(2)}`, COLUMNS.amount, rowY, { width: 100, align: 'right' })
        .moveDown();
    });

    // Total
    y = doc.y + 5;
    doc
      .font('Lexend-B').text('TOTAL:', COLUMNS.qty, y, { width: 60, align: 'right' })
      .text(`$${subtotal.toFixed(2)}`, COLUMNS.amount, y, { width: 100, align: 'right' })
      .moveDown(2);

    const footerY = doc.page.height - doc.page.margins.bottom - 70;
    doc
      .font('Lexend-B')
      .fontSize(10)
      .fillColor(DEFAULT_SETTINGS.colors.black)
      // “Note:” header in bold
      .text('Note:', 0, footerY, { align: 'center' })
      // move down just a bit for the body lines
      .moveDown(0.3)
      .font('Lexend')
      .fontSize(9)
      // main note
      .text(invoice.note || 'This is a system generated invoice.', {
        align: 'center'
      })
      .moveDown(0.2)
      // brand disclosure
      .text('ShareMitra is a registered brand under Enoylity Media Creations.', {
        align: 'center'
      })
      .moveDown(0.2)
      // copyright
      .text('All rights reserved.', {
        align: 'center'
      })
      .moveDown(0.1)
      .fillColor('blue')
      .text('sharemitra.com', {
        align: 'center',
        link: 'https://sharemitra.com',
        underline: true
      });

    doc.end();
  });
}

module.exports = {
  buildInvoicePDF,
  DEFAULT_SETTINGS,
};

