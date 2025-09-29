
import { insuredModel } from '../../../../DB/models/Insured.model.js';
import { userModel } from "../../../../DB/models/user.model.js";
import InsuranceCompany from "../../../../DB/models/insuranceCompany.model.js";

import mongoose from "mongoose";
import { createNotification, sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import cloudinary from '../../../services/cloudenary.js';

const logAudit = async ({ userId, action, entity, entityId, userName, oldValue = null, newValue = null }) => {
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

const dropUniqueIndex = async () => {
  try {
    await mongoose.connection.db.collection('insureds').dropIndex("vehicles.plateNumber_1");
    console.log("Unique index dropped successfully.");
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') {
      console.error("Error dropping the index:", error);
    }
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
    birth_date
  } = req.body;

  try {
    await dropUniqueIndex();

    const findInsured = await insuredModel.findOne({ id_Number });
    if (findInsured) return res.status(409).json({ message: "Insured already exists" });
    let imageUrl = null;

    if (req.file) {

      const { secure_url } = await cloudenary.uploader.upload(req.file.path, {
        folder: "Insured/image/",
      });
      imageUrl = secure_url;
    } else {

      imageUrl = "https://th.bing.com/th/id/OIP.eUdZe6jPSNXtNAbxcswuIgHaE8?w=4245&h=2830&rs=1&pid=ImgDetMain"; // هنا رابط الصورة الافتراضية
    }

    const validVehicles = (vehicles && vehicles.length > 0)
      ? vehicles.map(vehicle => ({
        plateNumber: vehicle.plateNumber || 'unknown',
        model: vehicle.model,
        type: vehicle.type,
        ownership: vehicle.ownership,
        modelNumber: vehicle.modelNumber,
        licenseExpiry: vehicle.licenseExpiry,
        lastTest: vehicle.lastTest,
        color: vehicle.color,
        price: vehicle.price,
        image: vehicle.image || 'https://th.bing.com/th/id/OIP.eUdZe6jPSNXtNAbxcswuIgHaE8?w=4245&h=2830&rs=1&pid=ImgDetMain',
        insurance: vehicle.insurance || []
      }))
      : [];

    let agent = null;
    if (agentsName) {
      agent = await userModel.findOne({ name: agentsName });

    }

    const newInsured = new insuredModel({
      first_name,
      last_name,
      city,
      id_Number,
      phone_number,
      joining_date,
      notes,
      image: imageUrl,
      vehicles: validVehicles,
      agentsName: agentsName || null,
      agentsId: agent ? agent._id : null,
      email,
      birth_date
    });

    const savedInsured = await newInsured.save();
    const findUser = await userModel.findById(req.user._id)
    const message = `${findUser.name} add new insured(${first_name} ${last_name})`
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })


    await logAudit({
      userId: req.user._id,
      action: `Add Insured by ${findUser.name}`,
      userName: findUser.name,
      entity: "Insured",
      entityId: savedInsured._id,
      oldValue: null,
      newValue: savedInsured.toObject()
    });

    return res.status(201).json({ message: "Added successfully", savedInsured });

  } catch (error) {
    console.error("Error adding insured:", error);
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
    const findUser = await userModel.findById(req.user._id)



    const message = `${findUser.name} delete${findInsured.first_name} ${findInsured.last_name})`
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })
    await logAudit({
      userId: req.user._id,
      action: `Delete Insured by ${findUser.name}`,
      userName: findUser.name,
      entity: "Insured",
      entityId: deletedInsured._id,
      oldValue: findInsured.toObject(),
      newValue: null
    });

    return res.status(200).json({
      message: "Deleted successfully",
      deletedInsured
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
    console.error("Error counting insureds:", error);
    next(error);
  }
};












export const getAllVehicleInsurances = async (req, res, next) => {
  try {
    const allInsurances = await insuredModel.aggregate([
      {
        $unwind: "$vehicles"
      },
      {
        $unwind: "$vehicles.insurance"
      }, {
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
          vehicleType: "$vehicles.type"
        }
      }, {
        $sort: { "insuranceEndDate": 1 }
      }
    ]);

    return res.status(200).json({
      message: "Successfully",
      count: allInsurances.length,
      insurances: allInsurances
    });

  } catch (error) {
    console.error("Error fetching all vehicle insurances:", error);
    next(error);
  }
};


export const showAll = async (req, res, next) => {
  try {
    const insuredList = await insuredModel.find({});
    return res.status(200).json({ message: "All Insured", insuredList });
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
    console.error("Error getting total insured count:", error);
    next(error);
  }
};


export const getInsuredByMonth = async (req, res, next) => {
  try {
    const monthlyCounts = await insuredModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$joining_date" },
            month: { $month: "$joining_date" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1
        }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" }
                ]
              }
            ]
          },
          count: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json({ data: monthlyCounts });
  } catch (error) {
    console.error("Error getting insured by month:", error);
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
    birth_date
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
      birth_date
    };

    if (req.file) {
      const { secure_url } = await cloudenary.uploader.upload(req.file.path, {
        folder: "Insured/image/"
      });
      updatedData.image = secure_url;
    }

    const updatedInsured = await insuredModel.findByIdAndUpdate(id, updatedData, {
      new: true
    });

    const findUser = await userModel.findById(req.user._id)
    await logAudit({
      userId: req.user._id,
      action: `Update insured by ${findUser.name}`,
      userName: findUser.name,
      entity: "Insured",
      entityId: updatedInsured._id,
      oldValue,
      newValue: updatedInsured.toObject()
    });

    return res.status(200).json({
      message: "Updated successfully",
      updatedInsured
    });

  } catch (error) {
    next(error);
  }
};




export const addVehicle = async (req, res, next) => {
  try {
    const { insuredId } = req.params;
    const {
      plateNumber, model, type, ownership,
      modelNumber, licenseExpiry, lastTest, color, price
    } = req.body;

    // رفع الصورة إن وُجدت
    let secure_url = '';
    if (req.file) {
      const { secure_url: uploadedUrl } = await cloudenary.uploader.upload(req.file.path, {
        folder: "Vehicles/image/"
      });
      secure_url = uploadedUrl;
    }

    // تحضير السيارة الجديدة
    const newVehicle = {
      plateNumber: plateNumber || 'unknown',
      model,
      type,
      ownership,
      modelNumber,
      licenseExpiry,
      lastTest,
      color,
      price,
      image: secure_url,
      insurance: [] 
    };

    
    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

   
    insured.vehicles.push(newVehicle);
    await insured.save({ validateBeforeSave: false }); 


    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added new car, plate number: ${plateNumber}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    // تسجيل الـ audit
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Added new vehicle by ${findUser.name}`,
      entity: "Vehicle",
      entityId: insuredId,
      oldValue: null,
      newValue: newVehicle
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


    const vehicleToRemove = insured.vehicles.find(v => v._id.toString() === vehicleId);

    if (!vehicleToRemove) return res.status(404).json({ message: "Vehicle not found" });


    insured.vehicles.pull({ _id: vehicleId });
    await insured.save();
    const findUser = await userModel.findById(req.user._id)
    const message = `${findUser.name} delete car , the plate number is ${vehicleToRemove.plateNumber}`
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `delete vehicles by ${findUser.name}`,
      entity: "Vehicle",
      entityId: insuredId,
      oldValue: vehicleToRemove,
      newValue: null
    });

    return res.status(200).json({ message: "Vehicle deleted successfully" });

  } catch (error) {
    next(error);
  }
};


export const updateVehicle = async (req, res, next) => {
  const { insuredId, vehicleId } = req.params;
  const {
    plateNumber, model, type, ownership,
    modelNumber, licenseExpiry, lastTest,
    color, price
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
    const findUser = await userModel.findById(req.user._id)


    await logAudit({
      userId: req.user._id,
      userName: findUser.name,

      action: `Update vehicle by ${findUser.name}`,
      entity: "Vehicle",
      entityId: insuredId,
      oldValue,
      newValue
    });

    return res.status(200).json({ message: "Vehicle updated successfully" });

  } catch (error) {
    console.error(error);
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
    console.error(error);

    next(error)
  }
};

export const getTotalVehicles = async (req, res, next) => {
  try {
    const result = await insuredModel.aggregate([
      { $unwind: "$vehicles" },           
      { $count: "totalVehicles" }        
    ]);

    const total = result.length > 0 ? result[0].totalVehicles : 0;

    return res.status(200).json({ totalVehicles: total });
  } catch (error) {
    console.error("Error counting vehicles:", error);
    next(error);
  }
};






















export const uploadCustomerFiles = async (req, res, next) => {
  try {
    const { id } = req.params;

    const insured = await insuredModel.findById(id);
    if (!insured) return res.status(404).json({ message: "Customer not found" });

    let uploadedFiles = [];

    for (let file of req.files) {
      const { secure_url } = await cloudenary.uploader.upload(file.path, {
        folder: `Insured/${id}/attachments`
      });

      uploadedFiles.push({
        fileName: file.originalname,
        fileUrl: secure_url
      });
    }

    insured.attachments.push(...uploadedFiles);
    await insured.save();

    return res.status(200).json({
      message: "Files uploaded successfully",
      attachments: insured.attachments
    });
  } catch (error) {
    console.error("Error uploading customer files:", error);
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

    const insuranceIndex = vehicle.insurance.findIndex(ins => ins._id.toString() === insuranceId);

    if (insuranceIndex === -1) {
      return res.status(404).json({ message: "Insurance not found" });
    }

    vehicle.insurance.splice(insuranceIndex, 1);

    await insured.save();

    const adminUser = await userModel.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const senderId = req.user ? req.user._id : null;
    if (!senderId) {
      return res.status(401).json({ message: "User not logged in" });
    }

    const adminNotificationMessage = `The insurance for vehicle number has been deleted.${vehicleId}`;
    await createNotification(adminUser._id, senderId, adminNotificationMessage);
    const findUser = await userModel.findById(req.user._id)
    const message = `${findUser.name} delete insurance`
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Delete insurance by ${findUser.name}`,
      entity: "Insurance",
      entityId: vehicleId,
      oldValue,
      newValue: null
    });


    return res.status(200).json({ message: "delete sucsses" });

  } catch (error) {
    console.error("Error removing insurance:", error);
    next(error);
  }
};









export const addInsuranceToVehicle = async (req, res, next) => {
  const { insuredId, vehicleId } = req.params;
  const { insuranceType, insuranceCompany, agent, paymentMethod, paidAmount, isUnder24 ,priceisOnTheCustomer } = req.body;


  try {
    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "Insured not found" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });


    const company = await InsuranceCompany.findOne({ name: insuranceCompany });
    if (!company) return res.status(404).json({ message: `Insurance company ${insuranceCompany} not found` });


    const typeInfo = company.insuranceTypes.find(t => t.type === insuranceType);
    if (!typeInfo) return res.status(400).json({ message: `Insurance type ${insuranceType} not available for this company` });

    const insuranceAmount = typeInfo.price;



    let insuranceStartDate = vehicle.insurance.length > 0
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
      priceisOnTheCustomer
    };
   

    vehicle.insurance.push(newInsurance);

await insured.save({ validateBeforeSave: false });

    const findUser = await userModel.findById(req.user._id);

    // إشعارات و audit log
    const message = `${findUser.name} added new insurance`;
    await sendNotificationLogic({ senderId: req.user._id, message });
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Add new insurance to vehicle ${vehicleId}`,
      entity: "Insurance",
      entityId: vehicleId,
      oldValue: null,
      newValue: newInsurance
    });

    res.status(200).json({ message: "Insurance added successfully", insurance: newInsurance });

  } catch (error) {
    console.error("Error adding insurance:", error);
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
    console.error("Error retrieving insurances:", error);
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
    const allInsurances = insured.vehicles.flatMap(vehicle => vehicle.insurance);

    res.status(200).json({ insurances: allInsurances });
  } catch (error) {
    console.error("Error retrieving all insurances:", error);
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
    if (!insurance) return res.status(404).json({ message: "Insurance not found" });

    let checkImageUrl = null;
    if (req.file) {
      const result = await cloudenary.uploader.upload(req.file.path, {
        folder: "Checks/"
      });
      checkImageUrl = result.secure_url;
    }

    const newCheck = {
      checkNumber,
      checkDueDate,
      checkAmount,
      isReturned,
      checkImage: checkImageUrl
    };

    insurance.checkDetails.push(newCheck);
    insurance.paidAmount += checkAmount;
    insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;
    const findUser = await userModel.findById(req.user._id)
    await insured.save();
    const message = `${findUser.name} add new check details ${checkNumber}`
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })
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
        remainingDebt: insurance.remainingDebt
      }
    });

    res.status(200).json({ message: "Check added successfully", insurance });

  } catch (error) {
    console.error("Error adding check:", error);
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
    if (!insurance) return res.status(404).json({ message: "Insurance not found" });

    res.status(200).json({
      message: "Check details fetched successfully",
      checks: insurance.checkDetails
    });

  } catch (error) {
    console.error("Error fetching check details:", error);
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

    vehicle.insurance.forEach(insurance => {
      if (insurance.checkDetails && insurance.checkDetails.length > 0) {
        insurance.checkDetails.forEach(check => {
          allChecks.push({
            ...check.toObject(),
            insuranceId: insurance._id,
            insuranceType: insurance.insuranceType,
            insuranceCompany: insurance.insuranceCompany
          });
        });
      }
    });

    res.status(200).json({
      message: "All checks for the vehicle retrieved successfully",
      checks: allChecks
    });

  } catch (error) {
    console.error("Error fetching checks for vehicle:", error);
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
    if (!insurance) return res.status(404).json({ message: "Insurance not found" });

    const checkIndex = insurance.checkDetails.findIndex(check => check._id.toString() === checkId);
    if (checkIndex === -1) return res.status(404).json({ message: "Check not found" });


    const removedCheck = insurance.checkDetails[checkIndex];
    insurance.paidAmount -= removedCheck.checkAmount;
    insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;


    insurance.checkDetails.splice(checkIndex, 1);
    const findUser = await userModel.findById(req.user._id)
    await insured.save();
    const message = `${findUser.name} delete check `
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Delete check by ${findUser.name}`,
      entity: "Check",
      entityId: checkId,
      oldValue: null,
      newValue: null
    });


    res.status(200).json({ message: "Check deleted successfully" });

  } catch (error) {
    console.error("Error deleting check:", error);
    next(error);
  }
};


export const getActiveInsurancesCount = async (req, res, next) => {
  try {
    const insureds = await insuredModel.find().select("vehicles.insurance");
    let activeCount = 0;

    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          if (new Date(insurance.insuranceEndDate) >= new Date()) {
            activeCount++;
          }
        });
      });
    });

    return res.status(200).json({ activeInsurances: activeCount });
  } catch (error) {
    console.error("Error counting active insurances:", error);
    next(error);
  }
};


export const getExpiredInsurancesCount = async (req, res, next) => {
  try {
    const insureds = await insuredModel.find().select("vehicles.insurance");
    let expiredCount = 0;

    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          if (new Date(insurance.insuranceEndDate) < new Date()) {
            expiredCount++;
          }
        });
      });
    });

    return res.status(200).json({ expiredInsurances: expiredCount });
  } catch (error) {
    console.error("Error counting expired insurances:", error);
    next(error);
  }
};

export const getTotalPayments = async (req, res, next) => {
  try {
    const insureds = await insuredModel.find().select("vehicles.insurance");
    let totalPayments = 0;

    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          totalPayments += insurance.paidAmount || 0;
        });
      });
    });

    return res.status(200).json({ totalPayments });
  } catch (error) {
    console.error("Error calculating total payments:", error);
    next(error);
  }
};



export const getPaymentsByMethod = async (req, res, next) => {
  try {
    const insureds = await insuredModel.find().select("vehicles.insurance");

    let visaPayments = 0;
    let cashPayments = 0;
    let checkPayments = 0;
    let bankPayments = 0; // 💰 إضافة بنك ترانسفير

    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          const method = insurance.paymentMethod;
          const amount = insurance.paidAmount || 0;

          if (method === "فيزا" || method.toLowerCase() === "visa") {
            visaPayments += amount;
          } else if (method === "نقداً" || method.toLowerCase() === "cash") {
            cashPayments += amount;
          } else if (method === "شيكات" || method.toLowerCase() === "check" || method.toLowerCase() === "cheque") {
            checkPayments += amount;
          } else if (method === "bank_transfer" || method.toLowerCase() === "bank_transfer") {
            bankPayments += amount;
          }
        });
      });
    });

    return res.status(200).json({
      visaPayments,
      cashPayments,
      checkPayments,
      bankPayments 
    });
  } catch (error) {
    console.error("Error calculating payments by method:", error);
    next(error);
  }
};


export const getReturnedChecksAmount = async (req, res, next) => {
  try {
    const insureds = await insuredModel.find().select("vehicles.insurance");
    let returnedChecksTotal = 0;

    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          if (insurance.checkDetails && insurance.checkDetails.length > 0) {
            insurance.checkDetails.forEach(check => {
              if (check.isReturned) {
                returnedChecksTotal += check.checkAmount || 0;
              }
            });
          }
        });
      });
    });

    return res.status(200).json({ returnedChecksTotal });
  } catch (error) {
    console.error("Error calculating returned checks:", error);
    next(error);
  }
};



export const getDebtsByCustomer = async (req, res, next) => {
  try {
    const insureds = await insuredModel.find().select("first_name last_name vehicles.insurance");

    const customerDebts = insureds.map(insured => {
      let totalDebt = 0;
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          totalDebt += insurance.remainingDebt || 0;
        });
      });

      return {
        customer: `${insured.first_name} ${insured.last_name}`,
        totalDebt
      };
    });

    return res.status(200).json({ customerDebts });
  } catch (error) {
    console.error("Error calculating debts by customer:", error);
    next(error);
  }
};


export const getPaymentsAndDebtsByAgent = async (req, res, next) => {
  try {
    const { agentName } = req.params;


    const insureds = await insuredModel.find({
      "vehicles.insurance.agent": agentName
    }).select("first_name last_name vehicles.insurance");

    let totalPaid = 0;
    let totalDebts = 0;
    let insuranceList = [];

    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
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
                remaining: insurance.remainingDebt || 0
              }
            });
          }
        });
      });
    });

    return res.status(200).json({
      agent: agentName,
      totalPaid,
      totalDebts,
      insuranceList
    });
  } catch (error) {
    console.error("Error calculating payments and debts by agent:", error);
    next(error);
  }
};


export const getCustomersReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agentName } = req.query;
    const filter = {};


    if (startDate && endDate) {
      filter.joining_date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }


    if (agentName) {
      filter.agentsName = agentName;
    }

    const customers = await insuredModel.find(filter).select(
      "first_name last_name id_Number phone_number city email joining_date agentsName"
    );

    return res.status(200).json({
      total: customers.length,
      customers
    });
  } catch (error) {
    console.error("Error generating customers report:", error);
    next(error);
  }
};


export const getVehicleInsuranceReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agent, company } = req.query;


    const matchStage = { "vehicles.insurance.insuranceCategory": "vehicle_insurance" };

    if (startDate && endDate) {
      matchStage["vehicles.insurance.insuranceStartDate"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (agent) {
      matchStage["agentsName"] = agent;
    }

    if (company) {
      matchStage["vehicles.insurance.insuranceCompany"] = company;
    }


    const report = await insuredModel.aggregate([
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
          model: "$vehicles.model"
        }
      }
    ]);

    res.status(200).json({ count: report.length, report });
  } catch (error) {
    console.error("Error generating vehicle insurance report:", error);
    next(error);
  }
};


export const getOutstandingDebtsReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agentName } = req.query;

    const insureds = await insuredModel.find().select("first_name last_name agentsName vehicles.insurance");

    let totalDebt = 0;
    let outstandingChecks = [];
    let unpaidInsurances = [];

    insureds.forEach(insured => {

      if (agentName && insured.agentsName !== agentName) return;

      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {


          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const insuranceDate = new Date(insurance.insuranceStartDate);
            if (insuranceDate < start || insuranceDate > end) return;
          }


          if (insurance.checkDetails && insurance.checkDetails.length > 0) {
            insurance.checkDetails.forEach(check => {
              if (!check.isReturned && check.checkDueDate && new Date(check.checkDueDate) <= new Date()) {
                outstandingChecks.push({
                  customer: `${insured.first_name} ${insured.last_name}`,
                  vehiclePlate: vehicle.plateNumber,
                  insuranceCompany: insurance.insuranceCompany,
                  insuranceType: insurance.insuranceType,
                  checkNumber: check.checkNumber,
                  checkAmount: check.checkAmount,
                  dueDate: check.checkDueDate
                });
              }
            });
          }


          if (insurance.remainingDebt > 0 && insurance.insuranceStatus === "active") {
            unpaidInsurances.push({
              customer: `${insured.first_name} ${insured.last_name}`,
              vehiclePlate: vehicle.plateNumber,
              insuranceCompany: insurance.insuranceCompany,
              insuranceType: insurance.insuranceType,
              insuranceStartDate: insurance.insuranceStartDate,
              insuranceEndDate: insurance.insuranceEndDate,
              remainingDebt: insurance.remainingDebt,
              paidAmount: insurance.paidAmount,
              totalAmount: insurance.insuranceAmount
            });

            totalDebt += insurance.remainingDebt;
          }

        });
      });
    });

    res.status(200).json({
      totalDebt,
      outstandingChecksCount: outstandingChecks.length,
      unpaidInsurancesCount: unpaidInsurances.length,
      outstandingChecks,
      unpaidInsurances
    });

  } catch (error) {
    console.error("Error generating outstanding debts report:", error);
    next(error);
  }
};


