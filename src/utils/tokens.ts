import jwt from "jsonwebtoken"
import { SECRET_KEY } from "../config/env.ts"
import type {TokenPayload} from "../types/payload.d.ts";


export const create_token = (payload:TokenPayload) =>{
  if(!payload) return;

  if (!SECRET_KEY) {
    console.error("JWT SECRET_KEY is not defined in environment variables");
    return undefined;
  }

  return jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
}


export const verify_token = (token:string)=> {
try {
    if (!SECRET_KEY) throw new Error("SECRET_KEY missing");
    
    const payload = jwt.verify(token, SECRET_KEY);
    return payload as TokenPayload;
  } catch (error) {

    console.error("JWT Verification failed:", error);
    return null;
  }
}



