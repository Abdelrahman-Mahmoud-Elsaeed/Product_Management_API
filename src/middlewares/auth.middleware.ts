import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "../services/jwt.service.ts";

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: string;
    name: string;
  };
}

export const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or malformed token" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token) as AuthRequest["user"];
    req.user = payload;
    next();
  } catch (error) {
    console.error("JWT Error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};