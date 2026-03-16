import type { Request, Response } from "express";
import Category from "../models/categories.model.ts";
import { sendResponse } from "../utils/sendResponse.ts";

export const createCategory = async (req: Request, res: Response) => {
  const { name, description , icon } = req.body;

  const existing = await Category.findOne({ name: name.trim() });

  if (existing) {
    return sendResponse(res, 409, "Category already exists", null);
  }

  const category = await Category.create({
    name: name.trim(),
    description,
    icon
  });

  return sendResponse(res, 201, "Category created", category);
};

export const getCategories = async (_req: Request, res: Response) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  return sendResponse(res, 200, "Categories fetched", categories);
};

export const getCategoryById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await Category.findById(id);

  if (!category) {
    return sendResponse(res, 404, "Category not found", null);
  }

  return sendResponse(res, 200, "Category fetched", category);
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description , icon } = req.body;

  const category = await Category.findByIdAndUpdate(
    id,
    { name, description , icon },
    { new: true, runValidators: true }
  );

  if (!category) {
    return sendResponse(res, 404, "Category not found", null);
  }

  return sendResponse(res, 200, "Category updated", category);
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    return sendResponse(res, 404, "Category not found", null);
  }

  return sendResponse(res, 200, "Category deleted", category);
};