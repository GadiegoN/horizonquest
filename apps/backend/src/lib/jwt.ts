import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { environment } from "./environment";

const SECRET = environment.jwtSecret;

const baseSignOptions: SignOptions = {
  expiresIn: environment.jwtExpiresIn as SignOptions["expiresIn"],
};

export type HorizonJwtPayload = JwtPayload & {
  userId: string;
  profileId?: string;
  role: string;
};

export function generateToken(payload: HorizonJwtPayload) {
  return jwt.sign(payload, SECRET, baseSignOptions);
}

export function verifyToken(token: string): HorizonJwtPayload {
  return jwt.verify(token, SECRET) as HorizonJwtPayload;
}
