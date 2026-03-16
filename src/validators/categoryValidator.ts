import type { Request, Response, NextFunction } from "express";
import Joi from "joi";

const idSchema = Joi.string().length(24).hex().required();

export const createCategoryValidator = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.empty": "Category name is required",
      "string.min": "Category name must be at least 2 characters",
      "string.max": "Category name must be at most 100 characters",
    }),
    description: Joi.string().max(500).allow("", null).optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(", ") });
  }
  next();
};

export const updateCategoryValidator = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).allow("", null).optional(),
  }).min(1);

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(", ") });
  }
  next();
};

export const validateCategoryIdParam = (req: Request, res: Response, next: NextFunction) => {
  const { error } = idSchema.validate(req.params.id);
  if (error) {
    return res.status(400).json({ message: "Invalid category id" });
  }
  next();
};
