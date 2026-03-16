import mongoose from "mongoose";
import {DB} from "./env.ts";

export function con() {
  mongoose.connect(DB)
}

export function discon() {
  mongoose.disconnect()
}