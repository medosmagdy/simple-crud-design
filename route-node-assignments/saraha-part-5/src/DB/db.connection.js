import mongoose from "mongoose";
import { getDatabaseUri } from "../Config/db.config.js";
export const connectDB = () => mongoose.connect(getDatabaseUri());
