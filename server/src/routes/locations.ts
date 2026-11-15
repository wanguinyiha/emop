import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { pool } from "../db";

export const locationsRouter = Router();

// Public list: join up to counties so each row carries the full place name.
locationsRouter.get(
  "/neighbourhoods",
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT n.id, n.name, t.name AS town, c.name AS county
         FROM neighbourhoods n
         JOIN towns t ON t.id = n.town_id
         JOIN counties c ON c.id = t.county_id
         ORDER BY c.name, t.name, n.name`
      );
      res.json(result.rows);
    } catch (error) {
      next(error);
    }
  }
);
