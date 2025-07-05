// controllers/return.js
const Return = require('../models/return');

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

// Create a new return record
exports.createReturn = async (req, res) => {
  try {
    const { content, effectiveDate } = req.body;
    if (!content || !effectiveDate) {
      return res
        .status(400)
        .json({ message: 'Content and effectiveDate are required.' });
    }

    const newReturn = new Return({
      content,
      effectiveDate,
      updatedDate: new Date()
    });
    const saved = await newReturn.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating return record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update an existing return by returnId
exports.updateReturn = async (req, res) => {
  try {
    const { returnId, content, effectiveDate } = req.body;
    if (!returnId) {
      return res.status(400).json({ message: 'returnId is required.' });
    }

    const updateFields = { updatedDate: new Date() };
    if (content)       updateFields.content       = content;
    if (effectiveDate) updateFields.effectiveDate = effectiveDate;

    const updated = await Return.findOneAndUpdate(
      { returnId },
      { $set: updateFields },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Return record not found.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating return record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get all return records (with parsed sections)
exports.getAllReturns = async (req, res) => {
  try {
    const returns = await Return.find().sort({ effectiveDate: -1 });
    const enriched = returns.map(r => {
      const obj = r.toObject();
      return {
        ...obj,
        sections: parseSections(obj.content)
      };
    });
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching return records:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get a single return record by returnId (with parsed sections)
exports.getReturnById = async (req, res) => {
  try {
    const { returnId } = req.body;
    if (!returnId) {
      return res.status(400).json({ message: 'returnId is required.' });
    }
    const record = await Return.findOne({ returnId });
    if (!record) {
      return res.status(404).json({ message: 'Return record not found.' });
    }
    const obj = record.toObject();
    res.json({
      ...obj,
      sections: parseSections(obj.content)
    });
  } catch (error) {
    console.error('Error fetching return record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
