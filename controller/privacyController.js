// controllers/privacyPolicy.js
const PrivacyPolicy = require('../models/privacypolicy');

// Helper: turn the raw policy text into section objects
function parseSections(text) {
  // Split whenever you see a line starting with “<number>. ”
  const rawSections = text.split(/\r?\n(?=\d+\.\s)/);

  return rawSections.map(sectionText => {
    // First line is “<id>. <Title>”
    const [headerLine, ...bodyLines] = sectionText.split(/\r?\n/);
    const [, idStr, title] = headerLine.match(/^(\d+)\.\s+(.*)$/) || [];
    return {
      id: Number(idStr),
      title: title || '',
      body: bodyLines.join('\n').trim()
    };
  });
}

// Create a new privacy policy
exports.createPrivacyPolicy = async (req, res) => {
  try {
    const { effectiveDate, content } = req.body;
    const policy = new PrivacyPolicy({
      effectiveDate,
      updatedDate: new Date(),
      content
    });
    await policy.save();
    return res.status(201).json(policy);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update an existing policy by privacyId
exports.updatePrivacyPolicyByBody = async (req, res) => {
  try {
    const { privacyId, content } = req.body;
    if (!privacyId) {
      return res.status(400).json({ message: 'privacyId is required in body' });
    }
    const policy = await PrivacyPolicy.findOne({ privacyId });
    if (!policy) {
      return res.status(404).json({ message: 'Privacy policy not found' });
    }
    policy.content = content;
    policy.updatedDate = new Date();
    await policy.save();
    return res.json(policy);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all privacy policies, with sections
exports.getAllPrivacyPolicies = async (req, res) => {
  try {
    const policies = await PrivacyPolicy.find().sort({ effectiveDate: -1 });
    const withSections = policies.map(pol => {
      const obj = pol.toObject();
      return {
        ...obj,
        sections: parseSections(obj.content)
      };
    });
    return res.json(withSections);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get a single privacy policy by privacyId, with sections
exports.getPrivacyPolicyByBody = async (req, res) => {
  try {
    const { privacyId } = req.body;
    if (!privacyId) {
      return res.status(400).json({ message: 'privacyId is required in body' });
    }
    const policy = await PrivacyPolicy.findOne({ privacyId });
    if (!policy) {
      return res.status(404).json({ message: 'Privacy policy not found' });
    }
    const obj = policy.toObject();
    return res.json({
      ...obj,
      sections: parseSections(obj.content)
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
