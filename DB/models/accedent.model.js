import mongoose, { Schema } from "mongoose";

const accidentSchema = new Schema(
  {
    insured: {
      type: Schema.Types.ObjectId,
      ref: "Insured",
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId, 
      required: true,
    },
    notes: { type: String, required: true, trim: true },
    images: [{ type: String }],
    status: { type: String, enum: ["open", "closed"], default: "open" },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
const accidentModel = mongoose.model("accident", accidentSchema);

export { accidentModel };
