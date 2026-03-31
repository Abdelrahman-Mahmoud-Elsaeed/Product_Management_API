import mongoose from "mongoose";
import {DB} from "./env.ts";
import User from "../models/users.model.ts";

export async function con() {
  try {
    await mongoose.connect(DB);
    const existingAdmin = await User.findOne({ email: "admin@mystore.com" });
    if (!existingAdmin) {
      const admin = new User({
        name: "SUPERADMIN",
        email: "admin@mystore.com",
        password: "SuperSecretPassword!",
        role: "admin",
      });
      await admin.save();
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

export function discon() {
  mongoose.disconnect()
}