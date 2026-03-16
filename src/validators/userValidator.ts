import type { Request, Response, NextFunction } from "express";
import Joi from "joi";

const idSchema = Joi.string().length(24).hex().required();

export const createUserValidator = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).required().messages({
      "string.empty": "name is required",
      "string.min": "name must be at least 3 characters",
      "string.max": "name must be at most 50 characters",
    }),
    email: Joi.string().email({ tlds: { allow: false } }).required().messages({
      "string.empty": "Email is required",
      "string.email": "Email must be valid",
    }),
    age: Joi.number().integer().min(18).max(120).required().messages({
      "number.base": "Age must be a number",
      "number.min": "Age must be at least 18",
      "number.max": "Age must be at most 120",
    }),
    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
    }),
    role: Joi.string().valid("admin", "user").optional(),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(", ") });
  }
  next();
};

export const updateUserValidator = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(50).optional(),
    email: Joi.string().email({ tlds: { allow: false } }).optional(),
    age: Joi.number().integer().min(18).max(120).optional(),
    password: Joi.string().min(8).optional(),
    role: Joi.string().valid("admin", "user").optional(),
  }).min(1);

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(", ") });
  }
  next();
};

export const bulkUserFilterUpdateValidator = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    filter: Joi.object().required().messages({ "any.required": "Filter is required" }),
    update: Joi.object().required().messages({ "any.required": "Update object is required" }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(", ") });
  }
  next();
};

export const bulkUserDeleteValidator = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    filter: Joi.object().required().messages({ "any.required": "Filter is required" }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join(", ") });
  }
  next();
};

export const validateUserIdParam = (req: Request, res: Response, next: NextFunction) => {
  const { error } = idSchema.validate(req.params.id);
  if (error) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  next();
};
