import InsuranceCompany from "../../../../DB/models/insuranceCompany.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import { userModel } from "../../../../DB/models/user.model.js";
import {  sendNotificationLogic } from "../../notification/controller/notification.controller.js";
const logAudit = async ({ userId, action, entity, entityId,userName, oldValue = null, newValue = null }) => {
  try {
    await AuditLogModel.create({
      user: userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      userName
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};

export const addInsuranceCompany = async (req, res, next) => {
  try {
    const { name, insuranceTypes, roadServices } = req.body;

    
    if (!name || !Array.isArray(insuranceTypes) || insuranceTypes.length === 0) {
      return res.status(400).json({ message: "Name and at least one insurance type are required!" });
    }
    

   
    for (const ins of insuranceTypes) {
      if (!ins.type || ins.price == null) {
        return res.status(400).json({ message: "Each insurance type must have a type and a price!" });
      }
      if (!["compulsory", "comprehensive"].includes(ins.type)) {
        return res.status(400).json({ message: "Insurance type must be 'compulsory' or 'comprehensive'!" });
      }
    }

  
    const validRoadServices = (roadServices || []).map(service => {
      if (!service.name || service.price == null) {
        throw new Error("Each road service must have a name and price");
      }
      return service;
    });

    const newCompany = new InsuranceCompany({
      name,
      insuranceTypes,
      roadServices: validRoadServices
    });

    await newCompany.save();


    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added a new insurance company: ${name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

   
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Create InsuranceCompany by ${findUser.name}`,
      entity: "InsuranceCompany",
      entityId: newCompany._id,
      newValue: newCompany
    });

    res.status(201).json({
      message: "Insurance company added successfully!",
      company: newCompany
    });

  } catch (error) {
    next(error);
  }
};

export const updateInsuranceCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, insuranceTypes, roadServices } = req.body;

    const existingCompany = await InsuranceCompany.findById(id);
    if (!existingCompany) {
      return res.status(404).json({ message: "Insurance company not found!" });
    }

    const oldValue = existingCompany.toObject();

    
    const updatedData = {};
    if (name) updatedData.name = name;

    if (Array.isArray(insuranceTypes) && insuranceTypes.length > 0) {
      for (const ins of insuranceTypes) {
        if (!ins.type || ins.price == null) {
          return res.status(400).json({ message: "Each insurance type must have a type and a price!" });
        }
        if (!["compulsory", "comprehensive"].includes(ins.type)) {
          return res.status(400).json({ message: "Insurance type must be 'compulsory' or 'comprehensive'!" });
        }
      }
      updatedData.insuranceTypes = insuranceTypes;
    }

    if (Array.isArray(roadServices)) {
      for (const service of roadServices) {
        if (!service.name || service.price == null) {
          return res.status(400).json({ message: "Each road service must have a name and price!" });
        }
      }
      updatedData.roadServices = roadServices;
    }

    const updatedCompany = await InsuranceCompany.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} updated insurance company: ${updatedCompany.name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Update InsuranceCompany by ${findUser.name}`,
      entity: "InsuranceCompany",
      entityId: updatedCompany._id,
      oldValue,
      newValue: updatedCompany
    });

    res.status(200).json({
      message: "Insurance company updated successfully!",
      company: updatedCompany
    });

  } catch (error) {
    next(error);
  }
};



export const deleteInsuranceCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedCompany = await InsuranceCompany.findByIdAndDelete(id);
    if (!deletedCompany) {
      return res.status(404).json({ message: "Insurance company not found!" });
    }

    const user = req.user;
    const message = `${user.name} delete insurance company `
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })

    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Delete InsuranceCompany by ${user.name}`,
      entity: "InsuranceCompany",
      entityId: deletedCompany._id,
      oldValue: deletedCompany,
      newValue: null
    });

    res.status(200).json({ message: "Insurance company deleted successfully!" });

  } catch (error) {
    next(error);
  }
};


export const getAllInsuranceCompanies = async (req, res, next) => {
  try {
    const companies = await InsuranceCompany.find();
    res.status(200).json(companies);
  } catch (error) {

    next(error);
  }
};
