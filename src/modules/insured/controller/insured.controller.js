import { insuredModel } from "../../../../DB/models/Insured.model.js";
import { userModel } from "../../../../DB/models/user.model.js";
import InsuranceCompany from "../../../../DB/models/insuranceCompany.model.js";
import { InsuranceTypeModel } from "../../../../DB/models/InsuranceType.model.js";
import { ExpenseModel } from "../../../../DB/models/Expense.model.js";
import { RevenueModel } from "../../../../DB/models/Revenue.model.js";
import { accidentModel } from "../../../../DB/models/Accident.model.js";

import mongoose from "mongoose";
import {
  createNotification,
  sendNotificationLogic,
} from "../../notification/controller/notification.controller.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import cloudinary from "../../../services/cloudinary.js";
import axios from "axios";
import { getPaginationParams, buildPaginatedResponse, getSortParams, SORT_FIELDS } from "../../../utils/pagination.js";
import logger from "../../../utils/logService.js";
import { invalidateAllRelatedCaches } from "../../../utils/cacheInvalidation.js";

const logAudit = async ({
  userId,
  action,
  entity,
  entityId,
  userName,
  oldValue = null,
  newValue = null,
}) => {
  try {
    await AuditLogModel.create({
      user: userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      userName,
    });
  } catch (error) {
    logger.error("Failed to create audit log:", error);
  }
};

export const addInsured = async (req, res, next) => {
  const {
    first_name,
    last_name,
    id_Number,
    phone_number,
    joining_date,
    notes,
    vehicles,
    agentsName,
    city,
    email,
    birth_date,
  } = req.body;

  // Start a database session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const findInsured = await insuredModel.findOne({ id_Number }).session(session);
    if (findInsured) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ message: "Insured already exists" });
    }
    let imageUrl = null;

    if (req.file) {
      const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
        folder: "Insured/image/",
      });
      imageUrl = secure_url;
    } else {
      imageUrl =
        "https://th.bing.com/th/id/OIP.eUdZe6jPSNXtNAbxcswuIgHaE8?w=4245&h=2830&rs=1&pid=ImgDetMain";
    }

    const validVehicles =
      vehicles && vehicles.length > 0
        ? vehicles.map((vehicle) => ({
            plateNumber: vehicle.plateNumber || "unknown",
            model: vehicle.model,
            type: vehicle.type,
            ownership: vehicle.ownership,
            modelNumber: vehicle.modelNumber,
            licenseExpiry: vehicle.licenseExpiry,
            lastTest: vehicle.lastTest,
            color: vehicle.color,
            price: vehicle.price,
            image:
              vehicle.image ||
              "https://th.bing.com/th/id/OIP.eUdZe6jPSNXtNAbxcswuIgHaE8?w=4245&h=2830&rs=1&pid=ImgDetMain",
            insurance: vehicle.insurance || [],
          }))
        : [];

    let agent = null;
    if (agentsName) {
      agent = await userModel.findOne({ name: agentsName }).session(session);
    }

    const newInsured = new insuredModel({
      first_name,
      last_name,
      city,
      id_Number,
      phone_number,
      ...(joining_date && { joining_date }), // Only include if provided
      notes,
      image: imageUrl,
      vehicles: validVehicles,
      agentsName: agentsName || null,
      agentsId: agent ? agent._id : null,
      email,
      birth_date,
    });

    const savedInsured = await newInsured.save({ session });
    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added new insured: ${first_name} ${last_name}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message,
    });

    await logAudit({
      userId: req.user._id,
      action: `Add Insured by ${findUser.name}`,
      userName: findUser.name,
      entity: "Insured",
      entityId: savedInsured._id,
      oldValue: null,
      newValue: savedInsured.toObject(),
    });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Invalidate caches
    invalidateAllRelatedCaches().catch(err => logger.error("Cache invalidation failed:", err));

    return res
      .status(201)
      .json({ message: "Added successfully", savedInsured });
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    logger.error("Error adding insured:", error);
    next(error);
  }
};

export const deleteInsured = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findInsured = await insuredModel.findById(id);
    if (!findInsured) {
      return res.status(404).json({ message: "Insured not found" });
    }

    const deletedInsured = await insuredModel.findByIdAndDelete(id);
    const findUser = await userModel.findById(req.user._id);

    const message = `${findUser.name} deleted insured: ${findInsured.first_name} ${findInsured.last_name}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message,
    });
    await logAudit({
      userId: req.user._id,
      action: `Delete Insured by ${findUser.name}`,
      userName: findUser.name,
      entity: "Insured",
      entityId: deletedInsured._id,
      oldValue: findInsured.toObject(),
      newValue: null,
    });

    // Invalidate caches
    invalidateAllRelatedCaches().catch(err => logger.error("Cache invalidation failed:", err));

    return res.status(200).json({
      message: "Deleted successfully",
      deletedInsured,
    });
  } catch (error) {
    next(error);
  }
};

export const getTotalInsured = async (req, res, next) => {
  try {
    const total = await insuredModel.countDocuments();
    return res.status(200).json({ totalCustomers: total });
  } catch (error) {
    logger.error("Error counting insureds:", error);
    next(error);
  }
};

export const getAllVehicleInsurances = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const pipeline = [
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      {
        $project: {
          _id: "$vehicles.insurance._id",
          insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
          insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
          isUnder24: "$vehicles.insurance.isUnder24",
          insuranceCategory: "$vehicles.insurance.insuranceCategory",
          insuranceType: "$vehicles.insurance.insuranceType",
          insuranceCompany: "$vehicles.insurance.insuranceCompany",
          agent: "$vehicles.insurance.agent",
          paymentMethod: "$vehicles.insurance.paymentMethod",
          insuranceAmount: "$vehicles.insurance.insuranceAmount",
          paidAmount: "$vehicles.insurance.paidAmount",
          remainingDebt: "$vehicles.insurance.remainingDebt",
          insuranceFiles: "$vehicles.insurance.insuranceFiles",
          checkDetails: "$vehicles.insurance.checkDetails",
          insuredId: "$_id",
          insuredName: { $concat: ["$first_name", " ", "$last_name"] },
          insuredIdNumber: "$id_Number",
          vehicleId: "$vehicles._id",
          plateNumber: "$vehicles.plateNumber",
          vehicleModel: "$vehicles.model",
          vehicleType: "$vehicles.type",
        },
      },
      { $sort: { insuranceEndDate: 1 } },
    ];

    const [allInsurances, countResult] = await Promise.all([
      insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      insuredModel.aggregate([...pipeline, { $count: "total" }])
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;
    const response = buildPaginatedResponse(allInsurances, total, page, limit);

    return res.status(200).json({
      message: "Successfully",
      ...response,
      insurances: response.data
    });
  } catch (error) {
    logger.error("Error fetching all vehicle insurances:", error);
    next(error);
  }
};

export const showAll = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const sort = getSortParams(req.query, '-createdAt', SORT_FIELDS.INSURED);

    const [insuredList, total] = await Promise.all([
      insuredModel.find({}).sort(sort).skip(skip).limit(limit).lean(),
      insuredModel.countDocuments({})
    ]);

    const response = buildPaginatedResponse(insuredList, total, page, limit);
    return res.status(200).json({
      message: "All Insured",
      ...response
    });
  } catch (error) {
    next(error);
  }
};

export const showById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const insured = await insuredModel.findById(id);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    return res.status(200).json({ message: "Found Insured", insured });
  } catch (error) {
    next(error);
  }
};

export const getTotalInsuredCount = async (req, res, next) => {
  try {
    const total = await insuredModel.countDocuments();
    res.status(200).json({ total });
  } catch (error) {
    logger.error("Error getting total insured count:", error);
    next(error);
  }
};

/**
 * Customers Overview Endpoint
 * Returns customer acquisition data by month, quarter, or year
 * @query {string} period - 'monthly', 'quarterly', or 'yearly' (default: 'monthly')
 * @query {number} year - Year to filter (default: current year)
 */
export const getCustomersOverview = async (req, res, next) => {
  try {
    const { period = 'monthly', year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Validate period
    if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
      return res.status(400).json({
        message: "Invalid period. Must be 'monthly', 'quarterly', or 'yearly'"
      });
    }

    let customersData = {};

    if (period === 'monthly') {
      // Monthly breakdown for the specified year
      const monthlyData = await insuredModel.aggregate([
        {
          $match: {
            joining_date: { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            year: { $year: "$joining_date" },
            month: { $month: "$joining_date" }
          }
        },
        {
          $match: {
            year: targetYear
          }
        },
        {
          $group: {
            _id: { year: "$year", month: "$month" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.month": 1 } }
      ]);

      // Create array with all 12 months
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyResult = [];

      for (let month = 1; month <= 12; month++) {
        const data = monthlyData.find(item => item._id.month === month);
        monthlyResult.push({
          period: monthNames[month - 1],
          month: month,
          year: targetYear,
          customers: data ? data.count : 0
        });
      }

      customersData = {
        period: 'monthly',
        year: targetYear,
        data: monthlyResult,
        summary: {
          totalCustomers: monthlyResult.reduce((sum, item) => sum + item.customers, 0)
        }
      };

    } else if (period === 'quarterly') {
      // Quarterly breakdown for the specified year
      const quarterlyData = await insuredModel.aggregate([
        {
          $match: {
            joining_date: { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            year: { $year: "$joining_date" },
            quarter: {
              $ceil: {
                $divide: [{ $month: "$joining_date" }, 3]
              }
            }
          }
        },
        {
          $match: {
            year: targetYear
          }
        },
        {
          $group: {
            _id: { year: "$year", quarter: "$quarter" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.quarter": 1 } }
      ]);

      // Create array with all 4 quarters
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterlyResult = [];

      for (let quarter = 1; quarter <= 4; quarter++) {
        const data = quarterlyData.find(item => item._id.quarter === quarter);
        quarterlyResult.push({
          period: quarterNames[quarter - 1],
          quarter: quarter,
          year: targetYear,
          customers: data ? data.count : 0
        });
      }

      customersData = {
        period: 'quarterly',
        year: targetYear,
        data: quarterlyResult,
        summary: {
          totalCustomers: quarterlyResult.reduce((sum, item) => sum + item.customers, 0)
        }
      };

    } else if (period === 'yearly') {
      // Yearly breakdown (last 5 years)
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 4;

      const yearlyData = await insuredModel.aggregate([
        {
          $match: {
            joining_date: { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            year: { $year: "$joining_date" }
          }
        },
        {
          $match: {
            year: { $gte: startYear, $lte: currentYear }
          }
        },
        {
          $group: {
            _id: { year: "$year" },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1 } }
      ]);

      // Create array with last 5 years
      const yearlyResult = [];

      for (let year = startYear; year <= currentYear; year++) {
        const data = yearlyData.find(item => item._id.year === year);
        yearlyResult.push({
          period: year.toString(),
          year: year,
          customers: data ? data.count : 0
        });
      }

      customersData = {
        period: 'yearly',
        yearRange: `${startYear}-${currentYear}`,
        data: yearlyResult,
        summary: {
          totalCustomers: yearlyResult.reduce((sum, item) => sum + item.customers, 0)
        }
      };
    }

    return res.status(200).json({
      message: "Customers overview retrieved successfully",
      timestamp: new Date().toISOString(),
      ...customersData
    });

  } catch (error) {
    logger.error("Error getting customers overview:", error);
    next(error);
  }
};

export const updateInsured = async (req, res, next) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    id_Number,
    phone_number,
    joining_date,
    notes,
    city,
    birth_date,
  } = req.body;

  try {
    const insured = await insuredModel.findById(id);
    if (!insured) {
      return res.status(409).json({ message: "Insured not found" });
    }

    const oldValue = insured.toObject();

    let updatedData = {
      first_name,
      last_name,
      id_Number,
      phone_number,
      joining_date,
      notes,
      city,
      birth_date,
    };

    if (req.file) {
      const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
        folder: "Insured/image/",
      });
      updatedData.image = secure_url;
    }

    const updatedInsured = await insuredModel.findByIdAndUpdate(
      id,
      updatedData,
      {
        new: true,
      }
    );

    const findUser = await userModel.findById(req.user._id);
    await logAudit({
      userId: req.user._id,
      action: `Update insured by ${findUser.name}`,
      userName: findUser.name,
      entity: "Insured",
      entityId: updatedInsured._id,
      oldValue,
      newValue: updatedInsured.toObject(),
    });

    return res.status(200).json({
      message: "Updated successfully",
      updatedInsured,
    });
  } catch (error) {
    next(error);
  }
};

export const addVehicle = async (req, res, next) => {
  try {
    const { insuredId } = req.params;
    const {
      plateNumber,
      model,
      type,
      ownership,
      modelNumber,
      licenseExpiry,
      lastTest,
      color,
      price,
    } = req.body;

    let secure_url = "";
    if (req.file) {
      const { secure_url: uploadedUrl } = await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: "Vehicles/image/",
        }
      );
      secure_url = uploadedUrl;
    }

    const newVehicle = {
      plateNumber: plateNumber || "unknown",
      model,
      type,
      ownership,
      modelNumber,
      licenseExpiry,
      lastTest,
      color,
      price,
      image: secure_url,
      insurance: [],
    };

    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    insured.vehicles.push(newVehicle);
    await insured.save({ validateBeforeSave: false });

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added new car, plate number: ${plateNumber}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message,
    });

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Added new vehicle by ${findUser.name}`,
      entity: "Vehicle",
      entityId: insuredId,
      oldValue: null,
      newValue: newVehicle,
    });

    return res.status(200).json({ message: "Vehicle added successfully" });
  } catch (error) {
    next(error);
  }
};

export const removeVehicle = async (req, res, next) => {
  try {
    const { insuredId, vehicleId } = req.params;

    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    const vehicleToRemove = insured.vehicles.find(
      (v) => v._id.toString() === vehicleId
    );

    if (!vehicleToRemove)
      return res.status(404).json({ message: "Vehicle not found" });

    insured.vehicles.pull({ _id: vehicleId });
    await insured.save();
    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} deleted vehicle with plate number: ${vehicleToRemove.plateNumber}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message,
    });

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `delete vehicles by ${findUser.name}`,
      entity: "Vehicle",
      entityId: insuredId,
      oldValue: vehicleToRemove,
      newValue: null,
    });

    return res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateVehicle = async (req, res, next) => {
  const { insuredId, vehicleId } = req.params;
  const {
    plateNumber,
    model,
    type,
    ownership,
    modelNumber,
    licenseExpiry,
    lastTest,
    color,
    price,
  } = req.body;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) {
      return res.status(404).json({ message: "Insured not found" });
    }

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const oldValue = { ...vehicle._doc };

    vehicle.plateNumber = plateNumber || vehicle.plateNumber;
    vehicle.model = model || vehicle.model;
    vehicle.type = type || vehicle.type;
    vehicle.ownership = ownership || vehicle.ownership;
    vehicle.modelNumber = modelNumber || vehicle.modelNumber;
    vehicle.licenseExpiry = licenseExpiry || vehicle.licenseExpiry;
    vehicle.lastTest = lastTest || vehicle.lastTest;
    vehicle.color = color || vehicle.color;
    vehicle.price = price || vehicle.price;

    await insured.save();

    const newValue = { ...vehicle._doc };
    const findUser = await userModel.findById(req.user._id);

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,

      action: `Update vehicle by ${findUser.name}`,
      entity: "Vehicle",
      entityId: insuredId,
      oldValue,
      newValue,
    });

    return res.status(200).json({ message: "Vehicle updated successfully" });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

export const showVehicles = async (req, res) => {
  const { id } = req.params;

  try {
    const insured = await insuredModel.findById(id).select("vehicles");

    if (!insured) {
      return res.status(404).json({ message: "Insured not found" });
    }

    return res.status(200).json({ vehicles: insured.vehicles });
  } catch (error) {
    logger.error(error);

    next(error);
  }
};

export const getTotalVehicles = async (req, res, next) => {
  try {
    const result = await insuredModel.aggregate([
      { $unwind: "$vehicles" },
      { $count: "totalVehicles" },
    ]);

    const total = result.length > 0 ? result[0].totalVehicles : 0;

    return res.status(200).json({ totalVehicles: total });
  } catch (error) {
    logger.error("Error counting vehicles:", error);
    next(error);
  }
};

export const uploadCustomerFiles = async (req, res, next) => {
  try {
    const { id } = req.params;

    const insured = await insuredModel.findById(id);
    if (!insured)
      return res.status(404).json({ message: "Customer not found" });

    let uploadedFiles = [];

    for (let file of req.files) {
      const { secure_url } = await cloudinary.uploader.upload(file.path, {
        folder: `Insured/${id}/attachments`,
      });

      uploadedFiles.push({
        fileName: file.originalname,
        fileUrl: secure_url,
      });
    }

    insured.attachments.push(...uploadedFiles);
    await insured.save();

    return res.status(200).json({
      message: "Files uploaded successfully",
      attachments: insured.attachments,
    });
  } catch (error) {
    logger.error("Error uploading customer files:", error);
    next(error);
  }
};

export const removeInsuranceFromVehicle = async (req, res, next) => {
  const { insuredId, vehicleId, insuranceId } = req.params;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) {
      return res.status(404).json({ message: "Insured not found" });
    }

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const insuranceIndex = vehicle.insurance.findIndex(
      (ins) => ins._id.toString() === insuranceId
    );

    if (insuranceIndex === -1) {
      return res.status(404).json({ message: "Insurance not found" });
    }

    // Save the insurance data before removing
    const removedInsurance = vehicle.insurance[insuranceIndex].toObject();

    vehicle.insurance.splice(insuranceIndex, 1);

    await insured.save();

    const adminUser = await userModel.findOne({ role: "admin" });
    if (!adminUser) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const senderId = req.user ? req.user._id : null;
    if (!senderId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const adminNotificationMessage = `The insurance for vehicle number ${vehicleId} has been deleted.`;
    await createNotification(adminUser._id, senderId, adminNotificationMessage);
    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} deleted insurance from vehicle`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message,
    });
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Delete insurance by ${findUser.name}`,
      entity: "Insurance",
      entityId: vehicleId,
      oldValue: removedInsurance,
      newValue: null,
    });

    return res.status(200).json({ message: "Insurance deleted successfully" });
  } catch (error) {
    logger.error("Error removing insurance:", error);
    next(error);
  }
};

export const addInsuranceToVehicle = async (req, res, next) => {
  const { insuredId, vehicleId } = req.params;
  const {
    insuranceType,
    insuranceCompany,
    agent,
    paymentMethod,
    paidAmount,
    isUnder24,
    priceisOnTheCustomer,
    insuranceAmount,
  } = req.body;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const company = await InsuranceCompany.findOne({
      name: insuranceCompany,
    }).populate("insuranceTypes", "name");
    if (!company)
      return res
        .status(404)
        .json({ message: `Insurance company ${insuranceCompany} not found` });

    // Check if the insurance type exists globally
    const insuranceTypeDoc = await InsuranceTypeModel.findOne({
      name: { $regex: new RegExp(`^${insuranceType}$`, "i") },
    });
    if (!insuranceTypeDoc) {
      return res
        .status(400)
        .json({ message: `Insurance type '${insuranceType}' does not exist` });
    }

    // Check if the insurance type is available for this company
    const typeAvailable = company.insuranceTypes.some(
      (t) => t._id.toString() === insuranceTypeDoc._id.toString()
    );
    if (!typeAvailable) {
      return res
        .status(400)
        .json({
          message: `Insurance type '${insuranceType}' is not available for company '${insuranceCompany}'`,
        });
    }

    if (!insuranceAmount || insuranceAmount <= 0) {
      return res
        .status(400)
        .json({
          message: "Insurance amount is required and must be greater than 0",
        });
    }

    let insuranceStartDate =
      vehicle.insurance.length > 0
        ? vehicle.insurance[vehicle.insurance.length - 1].insuranceEndDate
        : new Date();

    const insuranceEndDate = new Date(insuranceStartDate);
    insuranceEndDate.setFullYear(insuranceEndDate.getFullYear() + 1);

    let insuranceFilesUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "Insured/insuranceFiles/",
        });
        insuranceFilesUrls.push(result.secure_url);
      }
    }

    const newInsurance = {
      insuranceStartDate,
      insuranceEndDate,
      isUnder24,
      insuranceCategory: "vehicle_insurance",
      insuranceType,
      insuranceCompany,
      agent,
      paymentMethod,
      insuranceAmount,
      paidAmount: paidAmount || 0,
      insuranceFiles: insuranceFilesUrls,
      priceisOnTheCustomer,
    };

    vehicle.insurance.push(newInsurance);

    await insured.save({ validateBeforeSave: false });

    const findUser = await userModel.findById(req.user._id);

    const message = `${findUser.name} added new insurance`;
    await sendNotificationLogic({ senderId: req.user._id, message });
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Add new insurance to vehicle ${vehicleId}`,
      entity: "Insurance",
      entityId: vehicleId,
      oldValue: null,
      newValue: newInsurance,
    });

    res
      .status(200)
      .json({
        message: "Insurance added successfully",
        insurance: newInsurance,
      });
  } catch (error) {
    logger.error("Error adding insurance:", error);
    next(error);
  }
};

export const getInsurancesForVehicle = async (req, res, next) => {
  const { insuredId, vehicleId } = req.params;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) {
      return res.status(404).json({ message: "Insured not found" });
    }

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const insurances = vehicle.insurance;

    res.status(200).json({ insurances });
  } catch (error) {
    logger.error("Error retrieving insurances:", error);
    next(error);
  }
};

// API to get all insurances for an insured (for all vehicles)
export const getAllInsurancesForInsured = async (req, res, next) => {
  const { insuredId } = req.params;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) {
      return res.status(404).json({ message: "Insured not found" });
    }

    // نجمع كل التأمينات من كل السيارات
    const allInsurances = insured.vehicles.flatMap(
      (vehicle) => vehicle.insurance
    );

    res.status(200).json({ insurances: allInsurances });
  } catch (error) {
    logger.error("Error retrieving all insurances:", error);
    next(error);
  }
};

export const addCheckToInsurance = async (req, res, next) => {
  const { insuredId, vehicleId, insuranceId } = req.params;
  const { checkNumber, checkDueDate, checkAmount, isReturned } = req.body;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const insurance = vehicle.insurance.id(insuranceId);
    if (!insurance)
      return res.status(404).json({ message: "Insurance not found" });

    let checkImageUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "Checks/",
      });
      checkImageUrl = result.secure_url;
    }

    const newCheck = {
      checkNumber,
      checkDueDate,
      checkAmount,
      isReturned,
      checkImage: checkImageUrl,
    };

    insurance.checkDetails.push(newCheck);
    insurance.paidAmount += checkAmount;
    insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;
    const findUser = await userModel.findById(req.user._id);
    await insured.save();
    const message = `${findUser.name} added new check #${checkNumber}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message,
    });
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Add chack by ${findUser.name}`,
      entity: "Check",
      entityId: insuranceId,
      oldValue: null,
      newValue: {
        addedCheck: newCheck,
        paidAmount: insurance.paidAmount,
        remainingDebt: insurance.remainingDebt,
      },
    });

    res.status(200).json({ message: "Check added successfully", insurance });
  } catch (error) {
    logger.error("Error adding check:", error);
    next(error);
  }
};

export const getInsuranceChecks = async (req, res, next) => {
  const { insuredId, vehicleId, insuranceId } = req.params;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const insurance = vehicle.insurance.id(insuranceId);
    if (!insurance)
      return res.status(404).json({ message: "Insurance not found" });

    res.status(200).json({
      message: "Check details fetched successfully",
      checks: insurance.checkDetails,
    });
  } catch (error) {
    logger.error("Error fetching check details:", error);
    next(error);
  }
};

export const getAllChecksForVehicle = async (req, res, next) => {
  const { insuredId, vehicleId } = req.params;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    let allChecks = [];

    vehicle.insurance.forEach((insurance) => {
      if (insurance.checkDetails && insurance.checkDetails.length > 0) {
        insurance.checkDetails.forEach((check) => {
          allChecks.push({
            ...check.toObject(),
            insuranceId: insurance._id,
            insuranceType: insurance.insuranceType,
            insuranceCompany: insurance.insuranceCompany,
          });
        });
      }
    });

    res.status(200).json({
      message: "All checks for the vehicle retrieved successfully",
      checks: allChecks,
    });
  } catch (error) {
    logger.error("Error fetching checks for vehicle:", error);
    next(error);
  }
};

export const deleteCheckFromInsurance = async (req, res, next) => {
  const { insuredId, vehicleId, insuranceId, checkId } = req.params;

  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const insurance = vehicle.insurance.id(insuranceId);
    if (!insurance)
      return res.status(404).json({ message: "Insurance not found" });

    const checkIndex = insurance.checkDetails.findIndex(
      (check) => check._id.toString() === checkId
    );
    if (checkIndex === -1)
      return res.status(404).json({ message: "Check not found" });

    const removedCheck = insurance.checkDetails[checkIndex];
    insurance.paidAmount -= removedCheck.checkAmount;
    insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;

    insurance.checkDetails.splice(checkIndex, 1);
    const findUser = await userModel.findById(req.user._id);
    await insured.save();
    const message = `${findUser.name} deleted check from insurance`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message,
    });
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Delete check by ${findUser.name}`,
      entity: "Check",
      entityId: checkId,
      oldValue: null,
      newValue: null,
    });

    res.status(200).json({ message: "Check deleted successfully" });
  } catch (error) {
    logger.error("Error deleting check:", error);
    next(error);
  }
};

export const getActiveInsurancesCount = async (req, res, next) => {
  try {
    const result = await insuredModel.aggregate([
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      {
        $match: {
          "vehicles.insurance.insuranceEndDate": { $gte: new Date() }
        }
      },
      { $count: "activeInsurances" }
    ]);

    const activeCount = result.length > 0 ? result[0].activeInsurances : 0;
    return res.status(200).json({ activeInsurances: activeCount });
  } catch (error) {
    logger.error("Error counting active insurances:", error);
    next(error);
  }
};

export const getExpiredInsurancesCount = async (req, res, next) => {
  try {
    const result = await insuredModel.aggregate([
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      {
        $match: {
          "vehicles.insurance.insuranceEndDate": { $lt: new Date() }
        }
      },
      { $count: "expiredInsurances" }
    ]);

    const expiredCount = result.length > 0 ? result[0].expiredInsurances : 0;
    return res.status(200).json({ expiredInsurances: expiredCount });
  } catch (error) {
    logger.error("Error counting expired insurances:", error);
    next(error);
  }
};

export const getTotalPayments = async (req, res, next) => {
  try {
    const result = await insuredModel.aggregate([
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: "$vehicles.insurance.paidAmount" }
        }
      }
    ]);

    const totalPayments = result.length > 0 ? result[0].totalPayments : 0;
    return res.status(200).json({ totalPayments });
  } catch (error) {
    logger.error("Error calculating total payments:", error);
    next(error);
  }
};

export const getPaymentsByMethod = async (req, res, next) => {
  try {
    const result = await insuredModel.aggregate([
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      {
        $group: {
          _id: "$vehicles.insurance.paymentMethod",
          totalAmount: { $sum: "$vehicles.insurance.paidAmount" }
        }
      }
    ]);

    let visaPayments = 0;
    let cashPayments = 0;
    let checkPayments = 0;
    let bankPayments = 0;

    result.forEach(item => {
      const method = item._id ? item._id.toLowerCase() : '';
      const amount = item.totalAmount || 0;

      if (method === "card" || method === "visa" || method === "فيزا") {
        visaPayments += amount;
      } else if (method === "cash" || method === "نقداً") {
        cashPayments += amount;
      } else if (method === "check" || method === "cheque" || method === "شيكات") {
        checkPayments += amount;
      } else if (method === "bank_transfer") {
        bankPayments += amount;
      }
    });

    return res.status(200).json({
      visaPayments,
      cashPayments,
      checkPayments,
      bankPayments,
    });
  } catch (error) {
    logger.error("Error calculating payments by method:", error);
    next(error);
  }
};

export const getReturnedChecksAmount = async (req, res, next) => {
  try {
    const result = await insuredModel.aggregate([
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      { $unwind: "$vehicles.insurance.checkDetails" },
      {
        $match: {
          "vehicles.insurance.checkDetails.isReturned": true
        }
      },
      {
        $group: {
          _id: null,
          returnedChecksTotal: { $sum: "$vehicles.insurance.checkDetails.checkAmount" }
        }
      }
    ]);

    const returnedChecksTotal = result.length > 0 ? result[0].returnedChecksTotal : 0;
    return res.status(200).json({ returnedChecksTotal });
  } catch (error) {
    logger.error("Error calculating returned checks:", error);
    next(error);
  }
};

export const getDebtsByCustomer = async (req, res, next) => {
  try {
    const customerDebts = await insuredModel.aggregate([
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      {
        $group: {
          _id: "$_id",
          customer: {
            $first: { $concat: ["$first_name", " ", "$last_name"] }
          },
          totalDebt: { $sum: "$vehicles.insurance.remainingDebt" }
        }
      },
      {
        $project: {
          _id: 0,
          customer: 1,
          totalDebt: 1
        }
      },
      { $sort: { totalDebt: -1 } }
    ]);

    return res.status(200).json({ customerDebts });
  } catch (error) {
    logger.error("Error calculating debts by customer:", error);
    next(error);
  }
};

export const getPaymentsAndDebtsByAgent = async (req, res, next) => {
  try {
    const { agentName } = req.params;

    const insureds = await insuredModel
      .find({
        "vehicles.insurance.agent": agentName,
      })
      .select("first_name last_name vehicles.insurance");

    let totalPaid = 0;
    let totalDebts = 0;
    let insuranceList = [];

    insureds.forEach((insured) => {
      insured.vehicles.forEach((vehicle) => {
        vehicle.insurance.forEach((insurance) => {
          if (insurance.agent === agentName) {
            totalPaid += insurance.paidAmount || 0;
            totalDebts += insurance.remainingDebt || 0;

            insuranceList.push({
              customer: `${insured.first_name} ${insured.last_name}`,
              insuranceCompany: insurance.insuranceCompany,
              insuranceType: insurance.insuranceType,
              insuranceAmount: insurance.insuranceAmount,
              paidAmount: insurance.paidAmount,
              remainingDebt: insurance.remainingDebt,
              paymentMethod: insurance.paymentMethod,
              insuranceStartDate: insurance.insuranceStartDate,
              insuranceEndDate: insurance.insuranceEndDate,

              summary: {
                total: insurance.insuranceAmount || 0,
                paid: insurance.paidAmount || 0,
                remaining: insurance.remainingDebt || 0,
              },
            });
          }
        });
      });
    });

    return res.status(200).json({
      agent: agentName,
      totalPaid,
      totalDebts,
      insuranceList,
    });
  } catch (error) {
    logger.error("Error calculating payments and debts by agent:", error);
    next(error);
  }
};

export const getCustomersReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agentName } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);
    const sort = getSortParams(req.query, '-joining_date', SORT_FIELDS.INSURED);

    const filter = {};

    if (startDate && endDate) {
      filter.joining_date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (agentName) {
      filter.agentsName = agentName;
    }

    const [customers, total] = await Promise.all([
      insuredModel
        .find(filter)
        .select("first_name last_name id_Number phone_number city email joining_date agentsName")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      insuredModel.countDocuments(filter)
    ]);

    const response = buildPaginatedResponse(customers, total, page, limit);
    return res.status(200).json({
      message: "Customers report",
      ...response,
      customers: response.data
    });
  } catch (error) {
    logger.error("Error generating customers report:", error);
    next(error);
  }
};

export const getVehicleInsuranceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agent, company } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);

    const matchStage = {
      "vehicles.insurance.insuranceCategory": "vehicle_insurance",
    };

    if (startDate && endDate) {
      matchStage["vehicles.insurance.insuranceStartDate"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (agent) {
      matchStage["agentsName"] = agent;
    }

    if (company) {
      matchStage["vehicles.insurance.insuranceCompany"] = company;
    }

    const pipeline = [
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      { $match: matchStage },
      {
        $project: {
          _id: 0,
          customerName: { $concat: ["$first_name", " ", "$last_name"] },
          phone_number: 1,
          agentsName: 1,
          insuranceCompany: "$vehicles.insurance.insuranceCompany",
          insuranceType: "$vehicles.insurance.insuranceType",
          insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
          insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
          paidAmount: "$vehicles.insurance.paidAmount",
          remainingDebt: "$vehicles.insurance.remainingDebt",
          plateNumber: "$vehicles.plateNumber",
          model: "$vehicles.model",
        },
      },
    ];

    const [report, countResult] = await Promise.all([
      insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      insuredModel.aggregate([...pipeline, { $count: "total" }])
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;
    const response = buildPaginatedResponse(report, total, page, limit);

    res.status(200).json({
      message: "Vehicle insurance report",
      ...response,
      report: response.data
    });
  } catch (error) {
    logger.error("Error generating vehicle insurance report:", error);
    next(error);
  }
};

export const getOutstandingDebtsReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agentName } = req.query;

    const matchStage = {};
    if (agentName) {
      matchStage.agentsName = agentName;
    }

    const insuranceMatchStage = {};
    if (startDate && endDate) {
      insuranceMatchStage["vehicles.insurance.insuranceStartDate"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get unpaid insurances with aggregation
    const unpaidPipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      {
        $match: {
          ...insuranceMatchStage,
          "vehicles.insurance.remainingDebt": { $gt: 0 },
          "vehicles.insurance.insuranceStatus": "active"
        }
      },
      {
        $project: {
          customer: { $concat: ["$first_name", " ", "$last_name"] },
          vehiclePlate: "$vehicles.plateNumber",
          insuranceCompany: "$vehicles.insurance.insuranceCompany",
          insuranceType: "$vehicles.insurance.insuranceType",
          insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
          insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
          remainingDebt: "$vehicles.insurance.remainingDebt",
          paidAmount: "$vehicles.insurance.paidAmount",
          totalAmount: "$vehicles.insurance.insuranceAmount"
        }
      }
    ];

    // Get outstanding checks with aggregation
    const checksPipeline = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      ...(Object.keys(insuranceMatchStage).length > 0 ? [{ $match: insuranceMatchStage }] : []),
      { $unwind: "$vehicles.insurance.checkDetails" },
      {
        $match: {
          "vehicles.insurance.checkDetails.isReturned": false,
          "vehicles.insurance.checkDetails.checkDueDate": { $lte: new Date() }
        }
      },
      {
        $project: {
          customer: { $concat: ["$first_name", " ", "$last_name"] },
          vehiclePlate: "$vehicles.plateNumber",
          insuranceCompany: "$vehicles.insurance.insuranceCompany",
          insuranceType: "$vehicles.insurance.insuranceType",
          checkNumber: "$vehicles.insurance.checkDetails.checkNumber",
          checkAmount: "$vehicles.insurance.checkDetails.checkAmount",
          dueDate: "$vehicles.insurance.checkDetails.checkDueDate"
        }
      }
    ];

    const [unpaidInsurances, outstandingChecks, debtTotal] = await Promise.all([
      insuredModel.aggregate(unpaidPipeline),
      insuredModel.aggregate(checksPipeline),
      insuredModel.aggregate([
        ...unpaidPipeline,
        {
          $group: {
            _id: null,
            totalDebt: { $sum: "$remainingDebt" }
          }
        }
      ])
    ]);

    const totalDebt = debtTotal.length > 0 ? debtTotal[0].totalDebt : 0;

    res.status(200).json({
      totalDebt,
      outstandingChecksCount: outstandingChecks.length,
      unpaidInsurancesCount: unpaidInsurances.length,
      outstandingChecks,
      unpaidInsurances,
    });
  } catch (error) {
    logger.error("Error generating outstanding debts report:", error);
    next(error);
  }
};

export const getVehicleDataFromGovApi = async (req, res, next) => {
  try {
    const { plateNumber } = req.params;

    if (!plateNumber) {
      return res.status(400).json({ message: "Plate number is required" });
    }

    // Sanitize and validate plate number
    const trimmedPlateNumber = String(plateNumber).trim();

    // Validate format: only alphanumeric characters and hyphens, length between 1-20
    if (!/^[a-zA-Z0-9-]{1,20}$/.test(trimmedPlateNumber)) {
      return res.status(400).json({
        message: "Invalid plate number format. Only alphanumeric characters and hyphens are allowed."
      });
    }

    // URL encode to prevent injection
    const sanitizedPlateNumber = encodeURIComponent(trimmedPlateNumber);

    const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=053cea08-09bc-40ec-8f7a-156f0677aff3&limit=5&q=${sanitizedPlateNumber}`;

    const response = await axios.get(apiUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'InsuranceManagementSystem/1.0'
      }
    });

    if (response.data && response.data.success) {
      const records = response.data.result.records;

      if (records.length === 0) {
        return res.status(404).json({
          message: "No vehicle data found for this plate number",
          plateNumber: trimmedPlateNumber,
        });
      }

      return res.status(200).json({
        message: "Vehicle data retrieved successfully",
        plateNumber: trimmedPlateNumber,
        count: records.length,
        data: records,
      });
    } else {
      return res.status(500).json({
        message: "Failed to retrieve data from government API",
        error: response.data,
      });
    }
  } catch (error) {
    logger.error("Error fetching vehicle data from government API:", error);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        message: "Request timeout - government API did not respond in time"
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        message: "Error from external API",
        error: error.response.data,
      });
    }

    next(error);
  }
};

/**
 * Dashboard Statistics Endpoint
 * Returns all key metrics for the dashboard in a single request
 */
export const getDashboardStatistics = async (req, res, next) => {
  try {
    // Run all aggregations in parallel for performance
    const [
      totalCustomers,
      totalVehicles,
      activeInsurances,
      expiredInsurances,
      totalAgents,
      totalSystemUsers,
      insurancePayments,
      totalExpenses,
      totalRevenue,
      totalCheques,
      returnedCheques,
      totalAccidents,
      activeAccidents
    ] = await Promise.all([
      // 1. Total Customers
      insuredModel.countDocuments(),

      // 2. Total Vehicles
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $count: "total" }
      ]),

      // 3. Active Insurances (not expired)
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        {
          $match: {
            "vehicles.insurance.insuranceEndDate": { $gte: new Date() }
          }
        },
        { $count: "total" }
      ]),

      // 4. Expired Insurances
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        {
          $match: {
            "vehicles.insurance.insuranceEndDate": { $lt: new Date() }
          }
        },
        { $count: "total" }
      ]),

      // 5. Total Agents
      userModel.countDocuments({ role: "agents" }),

      // 6. Total System Users
      userModel.countDocuments(),

      // 7. Insurance Payments by Method (from insurance paid amounts)
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        {
          $group: {
            _id: "$vehicles.insurance.paymentMethod",
            totalAmount: { $sum: "$vehicles.insurance.paidAmount" }
          }
        }
      ]),

      // 8. Total Expenses
      ExpenseModel.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" }
          }
        }
      ]),

      // 9. Total Revenue
      RevenueModel.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" }
          }
        }
      ]),

      // 10. Total Cheques and Cheque Income
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        { $unwind: "$vehicles.insurance.checkDetails" },
        {
          $group: {
            _id: null,
            totalCheques: { $sum: 1 },
            totalChequeIncome: { $sum: "$vehicles.insurance.checkDetails.checkAmount" }
          }
        }
      ]),

      // 11. Returned Cheques Amount
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        { $unwind: "$vehicles.insurance.checkDetails" },
        {
          $match: {
            "vehicles.insurance.checkDetails.isReturned": true
          }
        },
        {
          $group: {
            _id: null,
            totalReturnedCheques: { $sum: "$vehicles.insurance.checkDetails.checkAmount" }
          }
        }
      ]),

      // 12. Total Accidents
      accidentModel.countDocuments(),

      // 13. Active Accidents (status = "open")
      accidentModel.countDocuments({ status: "open" })
    ]);

    // Process insurance payments by method
    let visaIncome = 0;
    let cashIncome = 0;
    let chequeIncome = 0;
    let bankTransferIncome = 0;

    insurancePayments.forEach(item => {
      const method = item._id ? item._id.toLowerCase() : '';
      const amount = item.totalAmount || 0;

      if (method === "card" || method === "visa") {
        visaIncome += amount;
      } else if (method === "cash") {
        cashIncome += amount;
      } else if (method === "check" || method === "cheque") {
        chequeIncome += amount;
      } else if (method === "bank_transfer") {
        bankTransferIncome += amount;
      }
    });

    // Calculate total income from all insurance payments
    const totalInsuranceIncome = visaIncome + cashIncome + chequeIncome + bankTransferIncome;

    // Extract values from aggregation results
    const totalVehiclesCount = totalVehicles.length > 0 ? totalVehicles[0].total : 0;
    const activeInsurancesCount = activeInsurances.length > 0 ? activeInsurances[0].total : 0;
    const expiredInsurancesCount = expiredInsurances.length > 0 ? expiredInsurances[0].total : 0;
    const totalExpensesAmount = totalExpenses.length > 0 ? totalExpenses[0].totalAmount : 0;
    const totalRevenueAmount = totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0;
    const totalChequesCount = totalCheques.length > 0 ? totalCheques[0].totalCheques : 0;
    const totalChequeIncomeAmount = totalCheques.length > 0 ? totalCheques[0].totalChequeIncome : 0;
    const returnedChequesAmount = returnedCheques.length > 0 ? returnedCheques[0].totalReturnedCheques : 0;

    // Calculate total profit (income - expenses)
    const totalProfit = totalInsuranceIncome + totalRevenueAmount - totalExpensesAmount;

    // Prepare the response
    const dashboardStats = {
      customers: {
        totalCustomers,
      },
      vehicles: {
        totalVehicles: totalVehiclesCount,
      },
      insurances: {
        activeInsurances: activeInsurancesCount,
        expiredInsurances: expiredInsurancesCount,
        totalInsurances: activeInsurancesCount + expiredInsurancesCount,
      },
      agents: {
        totalAgents,
      },
      users: {
        totalSystemUsers,
      },
      financials: {
        totalIncome: totalInsuranceIncome + totalRevenueAmount,
        totalInsuranceIncome,
        totalOtherRevenue: totalRevenueAmount,
        totalExpenses: totalExpensesAmount,
        totalProfit,
      },
      incomeByMethod: {
        visaIncome,
        cashIncome,
        chequeIncome,
        bankTransferIncome,
      },
      cheques: {
        totalCheques: totalChequesCount,
        totalChequeIncome: totalChequeIncomeAmount,
        returnedChequesAmount,
      },
      accidents: {
        totalAccidents,
        activeAccidents,
        closedAccidents: totalAccidents - activeAccidents,
      },
      summary: {
        totalCustomers,
        totalIncome: totalInsuranceIncome + totalRevenueAmount,
        totalExpenses: totalExpensesAmount,
        visaIncome,
        cashIncome,
        bankTransferIncome,
        totalVehicles: totalVehiclesCount,
        activeInsurances: activeInsurancesCount,
        expiredInsurances: expiredInsurancesCount,
        totalAgents,
        totalCheques: totalChequesCount,
        totalChequeIncome: totalChequeIncomeAmount,
        totalProfit,
        totalAccidents,
        activeAccidents,
        returnedChequesAmount,
        totalSystemUsers,
      }
    };

    return res.status(200).json({
      message: "Dashboard statistics retrieved successfully",
      timestamp: new Date().toISOString(),
      data: dashboardStats
    });

  } catch (error) {
    logger.error("Error fetching dashboard statistics:", error);
    next(error);
  }
};

// Export financial overview from separate module
export { getFinancialOverview } from './financialOverview.js';

/**
 * Get All Cheques with Filters
 * Returns all cheques across all customers, vehicles, and insurances
 * @query {string} startDate - Filter by check due date from (optional)
 * @query {string} endDate - Filter by check due date to (optional)
 * @query {string} status - Filter by status: 'active', 'returned', or 'all' (default: 'all')
 * @query {number} page - Page number for pagination (optional)
 * @query {number} limit - Number of items per page (optional)
 */
export const getAllCheques = async (req, res, next) => {
  try {
    const { startDate, endDate, status = 'all' } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);

    // Build match conditions
    const matchConditions = {};

    // Filter by date range
    if (startDate || endDate) {
      matchConditions["vehicles.insurance.checkDetails.checkDueDate"] = {};
      if (startDate) {
        matchConditions["vehicles.insurance.checkDetails.checkDueDate"].$gte = new Date(startDate);
      }
      if (endDate) {
        matchConditions["vehicles.insurance.checkDetails.checkDueDate"].$lte = new Date(endDate);
      }
    }

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'returned') {
        matchConditions["vehicles.insurance.checkDetails.isReturned"] = true;
      } else if (status === 'active') {
        matchConditions["vehicles.insurance.checkDetails.isReturned"] = false;
      }
    }

    const pipeline = [
      { $unwind: "$vehicles" },
      { $unwind: "$vehicles.insurance" },
      { $unwind: "$vehicles.insurance.checkDetails" },
      ...(Object.keys(matchConditions).length > 0 ? [{ $match: matchConditions }] : []),
      {
        $project: {
          checkId: "$vehicles.insurance.checkDetails._id",
          checkNumber: "$vehicles.insurance.checkDetails.checkNumber",
          checkAmount: "$vehicles.insurance.checkDetails.checkAmount",
          checkDueDate: "$vehicles.insurance.checkDetails.checkDueDate",
          isReturned: "$vehicles.insurance.checkDetails.isReturned",
          checkImage: "$vehicles.insurance.checkDetails.checkImage",
          customerName: { $concat: ["$first_name", " ", "$last_name"] },
          customerId: "$_id",
          customerPhone: "$phone_number",
          customerIdNumber: "$id_Number",
          vehicleId: "$vehicles._id",
          plateNumber: "$vehicles.plateNumber",
          vehicleModel: "$vehicles.model",
          insuranceId: "$vehicles.insurance._id",
          insuranceCompany: "$vehicles.insurance.insuranceCompany",
          insuranceType: "$vehicles.insurance.insuranceType",
          insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
          insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
          paymentMethod: "$vehicles.insurance.paymentMethod",
        }
      },
      { $sort: { checkDueDate: -1 } }
    ];

    const [cheques, countResult] = await Promise.all([
      insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      insuredModel.aggregate([...pipeline, { $count: "total" }])
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Calculate summary statistics
    const allCheques = await insuredModel.aggregate([
      ...pipeline.slice(0, -1) // All except sort
    ]);

    const summary = {
      totalCheques: allCheques.length,
      totalAmount: allCheques.reduce((sum, c) => sum + (c.checkAmount || 0), 0),
      returnedCount: allCheques.filter(c => c.isReturned).length,
      returnedAmount: allCheques.filter(c => c.isReturned).reduce((sum, c) => sum + (c.checkAmount || 0), 0),
      activeCount: allCheques.filter(c => !c.isReturned).length,
      activeAmount: allCheques.filter(c => !c.isReturned).reduce((sum, c) => sum + (c.checkAmount || 0), 0),
    };

    const response = buildPaginatedResponse(cheques, total, page, limit);

    return res.status(200).json({
      message: "Cheques retrieved successfully",
      timestamp: new Date().toISOString(),
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || 'all'
      },
      summary,
      ...response,
      cheques: response.data
    });

  } catch (error) {
    logger.error("Error fetching all cheques:", error);
    next(error);
  }
};
