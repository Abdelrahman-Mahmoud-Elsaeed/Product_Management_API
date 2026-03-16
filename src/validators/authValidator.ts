import type { Request, Response, NextFunction } from "express";
import Joi from "joi";

export const loginValidator = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const schema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Email must be valid",
      }),
    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
    }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res
      .status(400)
      .json({ message: error.details.map((d) => d.message).join(", ") });
  }

  next();
};

export const registerValidator = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(30).required().trim().messages({
      "string.empty": "Name is required",
      "string.min": "Name must be at least 3 characters",
      "string.max": "Name must be at most 30 characters",
    }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .lowercase()
      .trim()
      .pattern(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)
      .messages({
        "string.empty": "Email is required",
        "string.email": "Email must be valid",
        "string.pattern.base": "Email format is invalid",
      }),

    password: Joi.string().min(8).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 8 characters",
    }),

    age: Joi.number().integer().min(18).max(100).optional(),

    role: Joi.string().valid("admin", "user").default("user").messages({
      "any.only": "Role must be either 'admin' or 'user'",
    }),
  });
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res
      .status(400)
      .json({ message: error.details.map((d) => d.message).join(", ") });
  }

  next();
};
