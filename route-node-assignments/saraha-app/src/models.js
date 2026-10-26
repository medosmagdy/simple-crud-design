const mongoose = require("mongoose");
function defineModels(connection) {
  const { Schema } = mongoose;
  const userSchema = new Schema(
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
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      },
      password: { type: String, select: false },
      phone: { type: String, select: false },
      age: { type: Number, min: 18, max: 100 },
      role: { type: String, enum: ["user", "admin"], default: "user" },
      provider: { type: String, enum: ["local", "google"], default: "local" },
      googleId: { type: String, index: { unique: true, sparse: true } },
      emailConfirmed: { type: Boolean, default: false },
      avatar: String,
      otpHash: { type: String, select: false },
      otpPurpose: { type: String, select: false },
      otpExpires: { type: Date, select: false },
      otpAttempts: { type: Number, default: 0, select: false },
    },
    { timestamps: true, toJSON: { virtuals: true } },
  );
  userSchema.virtual("fullName").get(function () {
    return this.firstName + " " + this.lastName;
  });
  const messageSchema = new Schema(
    {
      content: {
        type: String,
        required: true,
        trim: true,
        minLength: 1,
        maxLength: 1000,
      },
      recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
    },
    { timestamps: true },
  );
  const sessionSchema = new Schema(
    {
      jti: { type: String, required: true, unique: true },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      expiresAt: { type: Date, required: true, index: { expires: 0 } },
    },
    { timestamps: true },
  );
  return {
    User: connection.model("User", userSchema),
    Message: connection.model("Message", messageSchema),
    Session: connection.model("Session", sessionSchema),
  };
}
module.exports = { defineModels };
