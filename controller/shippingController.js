// controllers/shipping.js
const Shipping = require('../models/shipping');

// Helper: split raw content into numbered sections
function parseSections(text) {
  const raw = text.split(/\r?\n(?=\d+\.\s)/);
  return raw.map(chunk => {
    const [header, ...bodyLines] = chunk.split(/\r?\n/);
    const [, id, title] = header.match(/^(\d+)\.\s+(.*)$/) || [];
    return {
      id: Number(id),
      title: title || '',
      body: bodyLines.join('\n').trim()
    };
  });
}

// Create a new shipping record
exports.createShipping = async (req, res) => {
  try {
    const { content, effectiveDate } = req.body;
    if (!content || !effectiveDate) {
      return res
        .status(400)
        .json({ message: 'Content and effectiveDate are required.' });
    }
    const shipping = new Shipping({
      content,
      effectiveDate,
      updatedDate: new Date()
    });
    const saved = await shipping.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating shipping record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update an existing shipping by shippingId
exports.updateShipping = async (req, res) => {
  try {
    const { shippingId, content, effectiveDate } = req.body;
    if (!shippingId) {
      return res.status(400).json({ message: 'shippingId is required.' });
    }

    const updateFields = { updatedDate: new Date() };
    if (content)       updateFields.content       = content;
    if (effectiveDate) updateFields.effectiveDate = effectiveDate;

    const updated = await Shipping.findOneAndUpdate(
      { shippingId },
      { $set: updateFields },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Shipping record not found.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating shipping record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get all shipping records (with parsed sections)
exports.getAllShippings = async (req, res) => {
  try {
    const shippings = await Shipping.find().sort({ effectiveDate: -1 });
    const enriched = shippings.map(s => {
      const obj = s.toObject();
      return {
        ...obj,
        sections: parseSections(obj.content)
      };
    });
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching shipping records:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get a single shipping record by shippingId (with parsed sections)
exports.getShippingById = async (req, res) => {
  try {
    const { shippingId } = req.body;
    if (!shippingId) {
      return res.status(400).json({ message: 'shippingId is required.' });
    }
    const record = await Shipping.findOne({ shippingId });
    if (!record) {
      return res.status(404).json({ message: 'Shipping record not found.' });
    }
    const obj = record.toObject();
    res.json({
      ...obj,
      sections: parseSections(obj.content)
    });
  } catch (error) {
    console.error('Error fetching shipping record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
