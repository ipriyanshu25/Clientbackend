// controllers/term.js
const Term = require('../models/term');

// Helper: split raw term text into numbered sections
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

// Create a new term record
exports.createTerm = async (req, res) => {
  try {
    const { content} = req.body;
    if (!content) {
      return res
        .status(400)
        .json({ message: 'Content and effectiveDate are required.' });
    }

    const term = new Term({ content});
    const saved = await term.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating term record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Update an existing term by termId
exports.updateTerm = async (req, res) => {
  try {
    const { termId, content} = req.body;
    if (!termId) {
      return res.status(400).json({ message: 'termId is required.' });
    }

    const updateFields = { updatedDate: new Date() };
    if (content)       updateFields.content       = content;

    const updated = await Term.findOneAndUpdate(
      { termId },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Term record not found.' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating term record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get all term records (with parsed sections)
exports.getAllTerms = async (req, res) => {
  try {
    const terms = await Term.find().sort({ effectiveDate: -1 });
    const enriched = terms.map(t => {
      const obj = t.toObject();
      return {
        ...obj,
        sections: parseSections(obj.content)
      };
    });
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching term records:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Get a single term record by termId (with parsed sections)
exports.getTermById = async (req, res) => {
  try {
    const { termId } = req.body;
    if (!termId) {
      return res.status(400).json({ message: 'termId is required.' });
    }

    const record = await Term.findOne({ termId });
    if (!record) {
      return res.status(404).json({ message: 'Term record not found.' });
    }

    const obj = record.toObject();
    res.json({
      ...obj,
      sections: parseSections(obj.content)
    });
  } catch (error) {
    console.error('Error fetching term record:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};
