import mongoose, { Schema } from "mongoose";


const vehicleInsuranceSchema = new mongoose.Schema({
  insuranceStartDate: { type: Date},
  insuranceEndDate: { type: Date },
  isUnder24: { type: Boolean, required: true },

  insuranceCategory: {
    type: String,
    required: true,
    enum: ["تأمين سيارات"]
  },

  insuranceType: {
    type: String,
    required: true,
enum: ["compulsory", "comprehensive"]
  },

  insuranceCompany: { type: String, required: true },
  agent: { type: String },

  paymentMethod: {
    type: String,
    required: true,
    enum: ["cash","card","check","bank_transfer"]
  },

  insuranceAmount: { type: Number },
  paidAmount: { type: Number, required: true },
  remainingDebt: { type: Number },
  insuranceStatus: { type: String, default: "active" }, 
  refundAmount: { type: Number, default: 0 }, 
  insuranceFiles: [{ type: String, required: true }],


  checkDetails: [{
    checkNumber: { type: String },
    checkDueDate: { type: Date },
    checkAmount: { type: Number },
    isReturned: { type: Boolean, default: false },
    checkImage: { type: String }
  }]
});


vehicleInsuranceSchema.pre("save", function (next) {
  this.remainingDebt = this.insuranceAmount - this.paidAmount;
  next();
});



const vehicleSchema = new mongoose.Schema({
  plateNumber: { type: Number, required: true },
  model: { type: String, required: true },
  type: { type: String, required: true },
  ownership: { type: String, required: true },
  modelNumber: { type: String, required: true },
  licenseExpiry: { type: Date, required: true },
  lastTest: { type: Date, required: true },
  color: { type: String, required: true },
  price: { type: Number, required: true },
  image: {
    type: String,
    default: "https://www.bing.com/images/search?view=detailV2&ccid=eUdZe6jP&id=4FC8766F458838654929A06B2EC9D65088D0A1C8&thid=OIP.eUdZe6jPSNXtNAbxcswuIgHaE8"
  },
  insurance: [vehicleInsuranceSchema]
});



const insuredSchema = new mongoose.Schema({
  image: { type: String ,  default: "https://www.bing.com/images/search?view=detailV2&ccid=eUdZe6jP&id=4FC8766F458838654929A06B2EC9D65088D0A1C8&thid=OIP.eUdZe6jPSNXtNAbxcswuIgHaE8" },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  id_Number: { type: Number, required: true },
  phone_number: { type: String, required: true },
  joining_date: { type: Date, default:Date.now },
  notes: { type: String },
  city: { type: String, required: true },
  email: { type: String, required: true },
  birth_date: { type: Date, required: true },
  agentsId: { type: Schema.Types.ObjectId, ref: "user" },
  agentsName: { type: String },
    attachments: [{
    fileName: { type: String },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  vehicles: [vehicleSchema]
}, { timestamps: true });



const insuredModel = mongoose.model("Insured", insuredSchema);

export { insuredModel };


