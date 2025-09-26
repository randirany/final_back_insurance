

import { Schema, model } from "mongoose";

const departmentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
   
    },
    description: { 
      type: String,
      required: true,  
    },
    headOfEmployee: {
      type: {
        _id: { type: Schema.Types.ObjectId, ref: "user" },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, default: "HeadOfEmployee" },
        status:{type: String, default:'نشط'}
      },
      default: null,
    },
    employees: [
      {
        _id: { type: Schema.Types.ObjectId, ref: "user" },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, default: "employee" },
        status:{type: String, default:'نشط'}
      },
    ],
 
    permissions: [
      {
        type: String,
        enum: [
          "addAccedent", "showAccedent", "deleteAccedent",
          "createNotification", "getNotifications", "markAsRead", "Deletenotification",
          "addInsured", "deleteInsured", "allInsured", "findbyidInsured",
          "addcar", "removeCar", "showVehicles",
          "addRoad", "deleteRoad", "updateRoad", "allRoad",
          "addAgents", "deleteAgents", "updateAgents", "allAgents",
          "addCompany", "deleteCompany", "upateCompany", "allCompany"
        ],
      },
    ],
  },  
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// لحساب عدد الموظفين تلقائياً
departmentSchema.virtual("employeeCount").get(function () {
  return this.employees?.length || 0;
});

export default model("Department", departmentSchema);
