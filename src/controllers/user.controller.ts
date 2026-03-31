import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../models/users.model.ts";
import { sendResponse } from "../utils/sendResponse.ts";

export const createUser = async (req: Request, res: Response) => {
  const { name, email, age, password, role } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return sendResponse(res, 409, "Email already exists", null);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    name,
    email,
    age,
    password,
    role,
  });

  return sendResponse(res, 201, "User created successfully", newUser);
};

export const getUsers = async (req: Request, res: Response) => {
  const {
    name,
    email,
    minAge,
    maxAge,
    role,
    sortBy = "age",
    order = "asc",
    page = "1",
    limit = "10",
  } = req.query;

  const filter: any = {};

  if (name) filter.name = { $regex: name as string, $options: "i" };
  if (email) filter.email = { $regex: email as string, $options: "i" };
  if (role) filter.role = role;

  if (minAge || maxAge) {
    filter.age = {};
    if (minAge) filter.age.$gte = parseInt(minAge as string);
    if (maxAge) filter.age.$lte = parseInt(maxAge as string);
  }

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const skip = (pageNum - 1) * limitNum;

  const users = await User.find(filter)
    .select("-password")
    .sort({ [sortBy as string]: order === "desc" ? -1 : 1 })
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(filter);

  return sendResponse(res, 200, "Users fetched", {
    total,
    page: pageNum,
    limit: limitNum,
    users,
  });
};

export const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id).select("-password");

  if (!user) {
    return sendResponse(res, 404, "User not found", null);
  }

  return sendResponse(res, 200, "User fetched", user);
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedUser = await User.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    select: "-password",
  });

  if (!updatedUser) {
    return sendResponse(res, 404, "User not found", null);
  }

  return sendResponse(res, 200, "User updated successfully", updatedUser);
};

export const updateUsersDynamic = async (req: Request, res: Response) => {
  const { filter, update } = req.body;

  if (!filter || !update) {
    return sendResponse(res, 400, "Filter and update are required", null);
  }

  const result = await User.updateMany(filter, update);

  return sendResponse(res, 200, "Users updated successfully", {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedUser = await User.findByIdAndDelete(id).select("-password");

  if (!deletedUser) {
    return sendResponse(res, 404, "User not found", null);
  }

  return sendResponse(res, 200, "User deleted successfully", deletedUser);
};

export const deleteUsersDynamic = async (req: Request, res: Response) => {
  const { filter } = req.body;

  if (!filter) {
    return sendResponse(res, 400, "Filter is required", null);
  }

  const result = await User.deleteMany(filter);

  return sendResponse(res, 200, "Users deleted successfully", {
    deletedCount: result.deletedCount,
  });
};

export const getUserStats = async (_req: Request, res: Response) => {
  const result = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        maxAge: { $max: "$age" },
        minAge: { $min: "$age" },
        avgAge: { $avg: "$age" },
        sumAge: { $sum: "$age" },
      },
    },
  ]);

  return sendResponse(res, 200, "User statistics fetched", result[0] || {});
};