import User from "../models/users.model.ts";
import { type Request, type Response } from "express";
import bcrypt from "bcrypt";
import { signToken } from "../services/jwt.service.ts";
import { sendResponse } from "../utils/sendResponse.ts";
import { AuthRequest } from "../middlewares/auth.middleware.ts";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return sendResponse(res, 401, "Invalid credentials", null);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return sendResponse(res, 401, "Invalid credentials", null);
  }

  const payload = {
    _id: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = signToken(payload, 4 * 3600);

  return sendResponse(res, 200, "Login successful", {
    token,
    user: payload,
  });
};

export const register = async (req: Request, res: Response) => {
  const { name, email, age, password, role } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return sendResponse(res, 409, "Email already exists", null);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const createdUser = await User.create({
    name,
    email,
    age,
    password: hashedPassword,
    role: role || "user",
  });

  const payload = {
    _id: createdUser._id.toString(),
    email: createdUser.email,
    role: createdUser.role,
    name: createdUser.name,
  };

  const token = signToken(payload, 4 * 3600);

  return sendResponse(res, 201, "User created successfully", {
    token,
    user: payload,
  });
};


export const verify = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, valid: true });
}