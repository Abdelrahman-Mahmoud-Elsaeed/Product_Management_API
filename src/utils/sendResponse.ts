import type  { Response } from "express";

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}
export function sendResponse<T>(
  res: Response,
  status: number,
  message: string,
  data: T
) {
  const response: ApiResponse<T> = {
    status,
    message,
    data,
  };

  return res.status(status).json(response);
}