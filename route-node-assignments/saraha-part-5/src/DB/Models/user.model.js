import mongoose from "mongoose";
import { roleEnum, genderEnum } from "../../Common/constants.js";
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 60,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 60,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: { unique: true, name: "idx_email_unique" },
    },
    password: { type: String, select: false },
    phoneNumber: { type: String, select: false },
    gender: {
      type: String,
      enum: Object.values(genderEnum),
      default: genderEnum.OTHER,
    },
    age: { type: Number, min: 18, max: 60 },
    role: {
      type: String,
      enum: Object.values(roleEnum),
      default: roleEnum.USER,
    },
    isEmailVerified: { type: Boolean, default: false },
    profileImage: String,
    provider: { type: String, enum: ["local", "google"], default: "local" },
    googleId: { type: String, index: { unique: true, sparse: true } },
    credentialsChangedAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true } },
);
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});
export default mongoose.models.User || mongoose.model("User", userSchema);
