// controllers/serviceController.js
const Service = require('../models/services');
const { v4: uuidv4 } = require('uuid');

// Create a new service
exports.createService = async (req, res) => {
  try {
    const { serviceHeading, serviceDescription, serviceContent } = req.body;

    if (
      !Array.isArray(serviceContent) ||
      !serviceContent.every(
        item =>
          item &&
          typeof item.key === 'string' &&
          item.key.trim() &&
          typeof item.value === 'string' &&
          item.value.trim()
      )
    ) {
      return res
        .status(400)
        .json({ error: 'serviceContent must be an array of { key: string, value: string }' });
    }

    const service = new Service({ serviceHeading, serviceDescription, serviceContent });
    await service.save();
    return res.status(201).json(service);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get all services (with pagination + optional search)
exports.getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum  = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const query = {};
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      query.$or = [
        { serviceHeading: regex },
        { serviceDescription: regex },
        { 'serviceContent.key': regex },
        { 'serviceContent.value': regex }
      ];
    }

    const total    = await Service.countDocuments(query);
    const services = await Service.find(query)
      .select('-_id -__v')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      total,
      page:       pageNum,
      totalPages: Math.ceil(total / limitNum),
      data:       services
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get one service by its UUID
exports.getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.body;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }

    const service = await Service.findOne({ serviceId }).select('-_id -__v');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.status(200).json(service);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Update an existing service
exports.updateService = async (req, res) => {
  try {
    const { serviceId, serviceHeading, serviceDescription, serviceContent } = req.body;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }

    const service = await Service.findOne({ serviceId });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Overwrite heading/description if provided
    if (typeof serviceHeading === 'string') {
      service.serviceHeading = serviceHeading.trim();
    }
    if (typeof serviceDescription === 'string') {
      service.serviceDescription = serviceDescription.trim();
    }

    // Merge incoming serviceContent
    if (serviceContent !== undefined) {
      if (
        !Array.isArray(serviceContent) ||
        !serviceContent.every(item =>
          item &&
          typeof item.key === 'string' &&
          item.key.trim() &&
          typeof item.value === 'string' &&
          item.value.trim() &&
          // if contentId is present, it must be a string:
          (item.contentId === undefined || typeof item.contentId === 'string')
        )
      ) {
        return res
          .status(400)
          .json({ error: 'serviceContent must be an array of { contentId?: string, key: string, value: string }' });
      }

      serviceContent.forEach(({ contentId, key, value }) => {
        const k = key.trim();
        const v = value.trim();

        if (contentId) {
          // update existing item
          const existing = service.serviceContent.find(c => c.contentId === contentId);
          if (existing) {
            existing.key   = k;
            existing.value = v;
          }
          // else: ignore invalid contentId
        } else {
          // add new item
          service.serviceContent.push({
            contentId: uuidv4(),
            key:       k,
            value:     v
          });
        }
      });
    }

    await service.save();

    const out = service.toObject();
    delete out._id;
    delete out.__v;

    return res.status(200).json({
      message: 'Service updated successfully',
      service: out
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Delete an entire service
exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.body;
    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }

    const deleted = await Service.findOneAndDelete({ serviceId });
    if (!deleted) {
      return res.status(404).json({ error: 'Service not found' });
    }

    return res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Delete a single content item from a service
exports.deleteServiceContent = async (req, res) => {
  try {
    const { serviceId, contentId } = req.body;
    if (!serviceId || !contentId) {
      return res
        .status(400)
        .json({ error: 'serviceId and contentId are required to delete content' });
    }

    const service = await Service.findOne({ serviceId });
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const originalLength = service.serviceContent.length;
    service.serviceContent = service.serviceContent.filter(c => c.contentId !== contentId);

    if (service.serviceContent.length === originalLength) {
      return res.status(404).json({ error: `Content with id "${contentId}" not found` });
    }

    await service.save();

    const out = service.toObject();
    delete out._id;
    delete out.__v;

    return res.status(200).json({
      message: 'Service content deleted successfully',
      service: out
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};