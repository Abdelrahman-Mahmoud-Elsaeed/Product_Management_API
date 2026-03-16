import type { Response, Request } from "express";
import Product from "../models/products.model.ts";
import Category from "../models/categories.model.ts";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import type { AuthRequest } from "../middlewares/auth.middleware.ts";
import { sendResponse } from "../utils/sendResponse.ts";

export const createProduct = async (req: AuthRequest, res: Response) => {
  const { name, description, price, categoryId } = req.body;
  const creatorId = req.user?._id;

  const category = await Category.findById(categoryId);

  if (!category) {
    return sendResponse(res, 404, "Category not found", null);
  }

  const product = await Product.create({
    name,
    description,
    price,
    categoryId,
    createdBy: creatorId,
  });

  return sendResponse(res, 201, "Product created", product);
};

export const getProducts = async (req: Request, res: Response) => {
  const {
    page = "1",
    limit = "10",
    categoryId,
    minPrice,
    maxPrice,
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const filter: any = {};

  if (categoryId) filter.categoryId = categoryId;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);

  const products = await Product.find(filter)
    .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .populate("categoryId", "name description")
    .populate("createdBy", "name email role");

  const total = await Product.countDocuments(filter);

  return sendResponse(res, 200, "Products fetched", {
    total,
    page: pageNum,
    limit: limitNum,
    products,
  });
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await Product.findById(id)
    .populate("categoryId", "name description")
    .populate("createdBy", "name email role");

  if (!product) {
    return sendResponse(res, 404, "Product not found", null);
  }

  return sendResponse(res, 200, "Product fetched", product);
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    return sendResponse(res, 404, "Product not found", null);
  }

  return sendResponse(res, 200, "Product updated", product);
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await Product.findByIdAndDelete(id);

  if (!product) {
    return sendResponse(res, 404, "Product not found", null);
  }

  return sendResponse(res, 200, "Product deleted", product);
};

export const uploadProductImage = async (
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response,
) => {
  if (!req.file) return sendResponse(res, 400, "No file uploaded", null);

  const productExists = await Product.exists({ _id: req.params.id });
  if (!productExists) {
    await fs.unlink(req.file.path).catch(() => {});
    return sendResponse(res, 404, "Product not found", null);
  }

  const uploadDir = path.join(__dirname, "..", "uploads");
  const filename = path.parse(req.file.filename).name;
  const originalPath = req.file.path;

  const folders = ["large", "low","placeholder", "small", "medium", "webp", "avif"];
  await Promise.all(
    folders.map((folder) =>
      fs.mkdir(path.join(uploadDir, folder), { recursive: true }),
    ),
  );

  const largePath = path.join(uploadDir, "large", `${filename}.jpg`);

  await sharp(originalPath)
    .flatten({ background: "#F4F4F6" })
    .jpeg({ quality: 80 })
    .toFile(largePath);


  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { image: { large: `/uploads/large/${filename}.jpg` } },
    { new: true },
  );

  sendResponse(res, 200, "Large image uploaded", product);

  setImmediate(async () => {
    try {
      await Promise.all([
        sharp(originalPath)
          .resize(1600)
          .webp({ quality: 80 })
          .toFile(path.join(uploadDir, "webp", `${filename}.webp`)),

        sharp(originalPath)
          .resize(96)
          .webp({ quality: 80 })
          .toFile(path.join(uploadDir, "placeholder", `${filename}.webp`)),

        sharp(originalPath)
          .resize(1600)
          .avif({ quality: 50 })
          .toFile(path.join(uploadDir, "avif", `${filename}.avif`)),

        sharp(originalPath)
          .resize(40)
          .flatten({ background: "#F4F4F6" })
          .jpeg({ quality: 15 })
          .blur(8)
          .toFile(path.join(uploadDir, "low", `${filename}.jpg`)),

        sharp(originalPath)
          .resize(400)
          .flatten({ background: "#F4F4F6" })
          .jpeg({ quality: 70 })
          .toFile(path.join(uploadDir, "small", `${filename}.jpg`)),

        sharp(originalPath)
          .resize(800)
          .flatten({ background: "#F4F4F6" })
          .jpeg({ quality: 75 })
          .toFile(path.join(uploadDir, "medium", `${filename}.jpg`)),
      ]);

      // Update the DB with the rest of the paths
      await Product.findByIdAndUpdate(req.params.id, {
        "image.low": `/uploads/low/${filename}.jpg`,
        "image.placeholder": `/uploads/placeholder/${filename}.webp`,
        "image.small": `/uploads/small/${filename}.jpg`,
        "image.medium": `/uploads/medium/${filename}.jpg`,
        "image.webp": `/uploads/webp/${filename}.webp`,
        "image.avif": `/uploads/avif/${filename}.avif`,
      });

      // 4. Finally safe to delete the source file
      await fs.unlink(originalPath).catch(() => {});
      
    } catch (err) {
      console.error("Background image generation error:", err);
      // Cleanup on error if necessary
      await fs.unlink(originalPath).catch(() => {});
    }
  });
};