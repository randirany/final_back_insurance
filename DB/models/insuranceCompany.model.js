import mongoose from "mongoose";


const insuranceTypeSchema = new mongoose.Schema({
  type: { type: String, enum: ["compulsory", "comprehensive"], required: true },
  price: { type: Number, required: true, min: [0, "Price must be >= 0"] }
}, { _id: false });


const roadServiceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: [0, "Service price must be >= 0"] }
}, { _id: false });


const insuranceCompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  
  insuranceTypes: [insuranceTypeSchema], 
  roadServices: [roadServiceSchema]      
}, { timestamps: true });

const InsuranceCompany = mongoose.model("InsuranceCompany", insuranceCompanySchema);

export default InsuranceCompany;
