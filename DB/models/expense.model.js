import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema(
  {
    title: { type: String, required: true },         
    amount: { type: Number, required: true },           
    paidBy: { type: String, required: true },          
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "check", "bank_transfer"], 
      default: "cash",
    },
    date: { type: Date, default: Date.now },         
    receiptNumber: { type: String },                   
    description: { type: String },                    
  },
  { timestamps: true }
);

export const ExpenseModel = mongoose.model("Expense", expenseSchema);
