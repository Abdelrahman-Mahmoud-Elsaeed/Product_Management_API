import type { Request, Response, NextFunction } from "express";
import Joi from "joi";

const idSchema = Joi.string().length(24).hex().required();

const createSchema = Joi.object({
  name: Joi.string().min(2).max(150).required().messages({
    "string.empty": "Product name is required",
    "string.min": "Product name must be at least 2 characters",
    "string.max": "Product name must be at most 150 characters",
  }),

  description: Joi.string().max(1000).allow("", null).optional(),

  price: Joi.number().greater(0).required().messages({
    "number.base": "Price must be a number",
    "number.greater": "Price must be greater than 0",
    "any.required": "Price is required",
  }),

  categoryId: idSchema.messages({
    "string.length": "categoryId must be a valid MongoDB id",
    "string.hex": "categoryId must be a valid MongoDB id",
  }),
});

const updateSchema = Joi.object({
  name: Joi.string().min(2).max(150),
  description: Joi.string().max(1000).allow("", null),
  price: Joi.number().greater(0),
  categoryId: idSchema,
}).min(1);

export const createProductValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = createSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return next({
      statusCode: 400,
      message: error.details.map((d) => d.message).join(", "),
    });
  }

  next();
};

export const updateProductValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = updateSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return next({
      statusCode: 400,
      message: error.details.map((d) => d.message).join(", "),
    });
  }

  next();
};

export const validateProductIdParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { error } = idSchema.validate(req.params.id);

  if (error) {
    return next({
      statusCode: 400,
      message: "Invalid product id",
    });
  }

  next();
};