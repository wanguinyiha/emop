import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";

// Refuse to start without a signing secret; a weak/absent secret would let anyone forge tokens.
const envSecret = process.env.JWT_SECRET;
if (!envSecret) {
  throw new Error("JWT_SECRET is missing. Check your .env file.");
}
const JWT_SECRET: string = envSecret;

export const AUTH_COOKIE = "emop_token";
const TOKEN_TTL = "1d";
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Verification must also fetch the user, so deleted accounts lose access on the next request.
export const USER_COLUMNS =
  "id, first_name, last_name, email, phone, role, neighbourhood_id";

export interface AuthUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  neighbourhood_id: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Fixed hash of a throwaway password: login verifies against it when the email
// is unknown so response time does not reveal account existence.
export const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$Pc9zatsmzGHrhxreDMpOUA$cwK3ZHEkM0DP370miI/DtoN23eQUVZUX4fMi1MONyKQ";

function signToken(userId: number): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function cookieFlags() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function setAuthCookie(res: Response, userId: number): void {
  res.cookie(AUTH_COOKIE, signToken(userId), {
    ...cookieFlags(),
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

// Same flags as setAuthCookie but no maxAge, otherwise the browser keeps the cookie.
export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieFlags());
}

function notLoggedIn(res: Response): void {
  res.status(401).json({ error: "Not logged in" });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // cookie-parser types index cookies as any; narrow before use.
    const cookieValue: unknown = req.cookies?.[AUTH_COOKIE];
    if (typeof cookieValue !== "string") {
      notLoggedIn(res);
      return;
    }

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(cookieValue, JWT_SECRET);
    } catch {
      notLoggedIn(res);
      return;
    }
    if (typeof payload === "object" && typeof payload.id === "number") {
      const result = await pool.query(
        `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
        [payload.id]
      );
      const user = result.rows[0] as AuthUser | undefined;
      if (user) {
        req.user = user;
        next();
        return;
      }
    }
    notLoggedIn(res);
  } catch (error) {
    next(error);
  }
}
