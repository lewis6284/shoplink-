const fs = require('fs');
const path = require('path');
const CompanySetting = require('../models/CompanySetting');
const ApiResponse = require('../utils/response');

const uploadDir = path.join(__dirname, '../uploads');

const filePathFromUrl = (url) => {
  if (!url || !url.startsWith('/uploads/')) return null;
  return path.join(uploadDir, path.basename(url));
};

const deleteStampFile = (stampUrl) => {
  const diskPath = filePathFromUrl(stampUrl);
  if (diskPath && fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
  }
};

const buildPayload = (body, file) => {
  const payload = {};
  ['company_name', 'nif', 'rc', 'phone'].forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });

  if (file) {
    payload.stamp_url = `/uploads/${file.filename}`;
  } else if (body.stamp_url !== undefined) {
    payload.stamp_url = body.stamp_url || null;
  }

  return payload;
};

const rejectNonPngStamp = (req, res) => {
  if (!req.file || req.file.mimetype === 'image/png') return false;
  deleteStampFile(`/uploads/${req.file.filename}`);
  ApiResponse.error(res, 'Stamp must be a PNG image', 400);
  return true;
};

exports.getAll = async (req, res, next) => {
  try {
    const records = await CompanySetting.findAll({
      order: [['createdAt', 'DESC']]
    });
    return ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const record = await CompanySetting.findByPk(req.params.id);
    if (!record) {
      return ApiResponse.error(res, 'Company setting not found', 404);
    }
    return ApiResponse.success(res, record);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    if (rejectNonPngStamp(req, res)) return;

    const existing = await CompanySetting.findOne();
    if (existing) {
      if (req.file) deleteStampFile(`/uploads/${req.file.filename}`);
      return ApiResponse.error(res, 'Company settings already exist. Please edit the existing company information.', 409);
    }

    const payload = buildPayload(req.body, req.file);
    const record = await CompanySetting.create(payload);
    return ApiResponse.success(res, record, 'Company setting created successfully', 201);
  } catch (error) {
    if (req.file) deleteStampFile(`/uploads/${req.file.filename}`);
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (rejectNonPngStamp(req, res)) return;

    const record = await CompanySetting.findByPk(req.params.id);
    if (!record) {
      if (req.file) deleteStampFile(`/uploads/${req.file.filename}`);
      return ApiResponse.error(res, 'Company setting not found', 404);
    }

    const previousStampUrl = record.stamp_url;
    const payload = buildPayload(req.body, req.file);
    await record.update(payload);

    if (req.file && previousStampUrl && previousStampUrl !== record.stamp_url) {
      deleteStampFile(previousStampUrl);
    }

    return ApiResponse.success(res, record, 'Company setting updated successfully');
  } catch (error) {
    if (req.file) deleteStampFile(`/uploads/${req.file.filename}`);
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const record = await CompanySetting.findByPk(req.params.id);
    if (!record) {
      return ApiResponse.error(res, 'Company setting not found', 404);
    }

    const stampUrl = record.stamp_url;
    await record.destroy();
    deleteStampFile(stampUrl);

    return ApiResponse.success(res, null, 'Company setting deleted successfully');
  } catch (error) {
    next(error);
  }
};
