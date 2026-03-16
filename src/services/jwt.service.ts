import jwt from "jsonwebtoken";
import { SECRET_KEY } from "../config/env.ts";

export const signToken = (payload: object, expiresInSeconds = 3600) => {
  const options: jwt.SignOptions = { expiresIn: expiresInSeconds };
  return jwt.sign(payload as string | object | Buffer, SECRET_KEY as jwt.Secret, options);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET_KEY as jwt.Secret);
};
