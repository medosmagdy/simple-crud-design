import mongoose from "mongoose";
const schema = new mongoose.Schema(
  {
    content: {
      type: String,
      trim: true,
      required: true,
      minLength: 1,
      maxLength: 1000,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);
export default mongoose.models.Message || mongoose.model("Message", schema);
