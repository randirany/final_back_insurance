import { accidentModel } from "../../../../DB/models/Accident.model.js";
import cloudinary from "../../../services/cloudinary.js";
import { insuredModel } from '../../../../DB/models/Insured.model.js';



export const addAccident = async (req, res, next) => {
  try {
    const { insuredId, vehicleId } = req.params;
    const { notes } = req.body;

    if (!insuredId || !vehicleId || !notes) {
      return res.status(400).json({ message: "Missing required fields" });
    }


    const insured = await insuredModel.findById(insuredId);
    if (!insured) {
      return res.status(404).json({ message: "Insured not found" });
    }


    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found for this insured" });
    }


    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "accidents",
        });
        uploadedImages.push(result.secure_url);
      }
    }


    const newAccident = new accidentModel({
      insured: insuredId,
      vehicleId,
      notes,
      images: uploadedImages,
      status: "open"
    });

    const savedAccident = await newAccident.save();

    return res.status(201).json({
      message: "Accident reported successfully",
      accident: savedAccident
    });

  } catch (error) {
    next(error);
  }
};

export const getAccidents = async (req, res, next) => {
  try {
    const { insuredId, vehicleId } = req.query;

    let filter = {};
    if (insuredId) filter.insured = insuredId;
    if (vehicleId) filter.vehicleId = vehicleId;

    const accidents = await accidentModel
      .find(filter)
      .populate("insured", "first_name last_name id_Number")
      .sort({ createdAt: -1 });

    if (!accidents || accidents.length === 0) {
      return res.status(404).json({ message: "No accidents found" });
    }

    return res.status(200).json({ message: "Accidents fetched successfully", accidents });

  } catch (error) {
    next(error);
  }
};
export const deleteAccident = async (req, res, next) => {
  try {
    const { id } = req.params;

    const accident = await accidentModel.findById(id);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
    }

    await accidentModel.findByIdAndDelete(id);

    return res.status(200).json({ message: "Accident deleted successfully" });

  } catch (error) {
    next(error);
  }
};



export const totalAccidents = async (req, res, next) => {
  try {
    const count = await accidentModel.countDocuments();
    return res.status(200).json({ message: "Total accidents count", total: count });
  } catch (error) {
    next(error);
  }
};

export const updateAccident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;


    const accident = await accidentModel.findById(id);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
    }


    if (notes) accident.notes = notes;


    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "accidents",
        });
        accident.images.push(result.secure_url);
      }
    }


    if (req.body.status === "closed") {
      accident.status = "closed";
      accident.closedAt = new Date();
    }

    const updatedAccident = await accident.save();

    return res.status(200).json({
      message: "Accident updated successfully",
      accident: updatedAccident,
    });

  } catch (error) {
    next(error);
  }
};


export const accidentReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.createdAt = { $lte: new Date(endDate) };
    }

    const accidents = await accidentModel
      .find(filter)
      .populate("insured", "first_name last_name id_Number")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Accident report fetched successfully",
      totalAccidents: accidents.length,
      accidents,
    });

  } catch (error) {
    next(error);
  }
};
