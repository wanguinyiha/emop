import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import argon2 from "argon2";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { pool } from "../db";
import {
  DUMMY_HASH,
  USER_COLUMNS,
  clearAuthCookie,
  requireAuth,
  setAuthCookie,
  type AuthUser,
} from "../middleware/auth";

// strictObject rejects unknown fields, so clients cannot smuggle in role or other columns.
const registerSchema = z.strictObject({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  neighbourhood_id: z.number().int().positive(),
  phone: z
    .string()
    .regex(/^\+?\d+$/, "Invalid phone number")
    .refine((value) => value.length >= 9 && value.length <= 15, {
      message: "Invalid phone number",
    })
    .optional(),
  notify_sms: z.boolean().optional(),
  notify_email: z.boolean().optional(),
});

// Login keeps the same shape; email is lowercased to match how it was stored.
const loginSchema = z.strictObject({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

// Rate limits are per spec: login 10/15min, register 10/hour, both per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many attempts, try again later" });
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many attempts, try again later" });
  },
});

async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssueMessage(parsed.error) });
      return;
    }
    const data = parsed.data;

    // Checked explicitly so the client gets the spec'd message, not an FK error.
    const neighbourhood = await pool.query(
      "SELECT 1 FROM neighbourhoods WHERE id = $1",
      [data.neighbourhood_id]
    );
    if (neighbourhood.rows.length === 0) {
      res.status(400).json({ error: "Unknown neighbourhood" });
      return;
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
    });

    try {
      const result = await pool.query(
        `INSERT INTO users
           (first_name, last_name, email, phone, password_hash, role,
            neighbourhood_id, notify_sms, notify_email)
         VALUES ($1, $2, $3, $4, $5, 'customer', $6, $7, $8)
         RETURNING ${USER_COLUMNS}`,
        [
          data.first_name,
          data.last_name,
          data.email,
          data.phone ?? null,
          passwordHash,
          data.neighbourhood_id,
          data.notify_sms ?? false,
          data.notify_email ?? true,
        ]
      );
      const user = result.rows[0] as AuthUser | undefined;
      if (!user) {
        res.status(500).json({ error: "Something went wrong" });
        return;
      }
      setAuthCookie(res, user.id);
      res.status(201).json({ user });
    } catch (error) {
      // 23505 covers both the email index and the phone unique constraint.
      if (isUniqueViolation(error)) {
        res
          .status(409)
          .json({ error: "That email or phone is already registered" });
        return;
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
}

async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssueMessage(parsed.error) });
      return;
    }
    const { email, password } = parsed.data;

    const result = await pool.query(
      `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE LOWER(email) = $1`,
      [email]
    );
    const row = result.rows[0] as
      | (AuthUser & { password_hash: string })
      | undefined;

    if (!row) {
      // Burn the same argon2 work as a real check so timing reveals nothing.
      await argon2.verify(DUMMY_HASH, password);
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const passwordValid = await argon2.verify(row.password_hash, password);
    if (!passwordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { password_hash: _hash, ...user } = row;
    setAuthCookie(res, user.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

function logout(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.json({ ok: true });
}

function me(req: Request, res: Response): void {
  // requireAuth already sent 401 when the user is missing.
  if (!req.user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  res.json({ user: req.user });
}

export const authRouter = Router();
authRouter.post("/register", registerLimiter, register);
authRouter.post("/login", loginLimiter, login);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
