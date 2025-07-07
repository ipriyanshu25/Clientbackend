// controllers/cookie.js
const Cookie = require('../models/cookie');

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

// Create a new cookie record
exports.createCookie = async (req, res) => {
  try {
    const { content, effectiveDate } = req.body;
    if (!content || !effectiveDate) {
      return res
        .status(400)
        .json({ message: 'Content and effectiveDate are required.' });
    }

    const cookie = new Cookie({
      content,
      effectiveDate,
      updatedDate: new Date()
    });
    const saved = await cookie.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating cookie:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update an existing cookie by cookieId
exports.updateCookie = async (req, res) => {
  try {
    const { cookieId, content, effectiveDate } = req.body;
    if (!cookieId) {
      return res.status(400).json({ message: 'cookieId is required.' });
    }

    const updateFields = { updatedDate: new Date() };
    if (content)       updateFields.content       = content;
    if (effectiveDate) updateFields.effectiveDate = effectiveDate;

    const updated = await Cookie.findOneAndUpdate(
      { cookieId },
      { $set: updateFields },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Cookie not found.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating cookie:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get all cookies (with parsed sections)
exports.getAllCookies = async (req, res) => {
  try {
    const cookies = await Cookie.find().sort({ effectiveDate: -1 });
    const enriched = cookies.map(c => {
      const obj = c.toObject();
      return {
        ...obj,
        sections: parseSections(obj.content)
      };
    });
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching cookies:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get a single cookie by cookieId (with parsed sections)
exports.getCookieById = async (req, res) => {
  try {
    const { cookieId } = req.body;
    if (!cookieId) {
      return res.status(400).json({ message: 'cookieId is required.' });
    }

    const record = await Cookie.findOne({ cookieId });
    if (!record) {
      return res.status(404).json({ message: 'Cookie not found.' });
    }

    const obj = record.toObject();
    res.json({
      ...obj,
      sections: parseSections(obj.content)
    });
  } catch (error) {
    console.error('Error fetching cookie:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
