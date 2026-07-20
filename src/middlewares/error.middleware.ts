import type { Request, Response } from "express";

interface CustomError extends Error {
  statusCode?: number;
}

const errorMiddleware = (
  err: CustomError,
  req: Request,
  res: Response,
) => {
  const statusCode = err.statusCode || 500;

  console.error("ERROR:", err);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};

export default errorMiddleware;