import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const MAX_INCIDENTS = 100;

type IncidentListRow = {
  id: number;
  status: string;
  is_planned: boolean;
  is_simulated: boolean;
  cause_confirmed: boolean;
  started_at: Date;
  estimated_restoration_at: Date | null;
  restored_at: Date | null;
  n_id: number;
  n_name: string;
  town: string;
  county: string;
  cause: string;
  report_count: string;
};

// Query strings: coerce neighbourhood_id, whitelist status so no user input
// can ever reach the SQL text (filters below are fixed fragments).
const listQuerySchema = z.object({
  neighbourhood_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["open", "restored", "all"]).optional(),
});

async function listIncidents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid query";
      res.status(400).json({ error: message });
      return;
    }
    const { neighbourhood_id: neighbourhoodId } = parsed.data;
    const status = parsed.data.status ?? "open";

    const clauses: string[] = [];
    const params: number[] = [];
    if (neighbourhoodId !== undefined) {
      params.push(neighbourhoodId);
      clauses.push(`i.neighbourhood_id = $${params.length}`);
    }
    if (status === "open") {
      // "open" means anything not yet restored, per spec.
      clauses.push("i.status <> 'restored'");
    } else if (status === "restored") {
      clauses.push("i.status = 'restored'");
    }
    const where =
      clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await pool.query<IncidentListRow>(
      `SELECT i.id, i.status, i.is_planned, i.is_simulated, i.cause_confirmed,
              i.started_at, i.estimated_restoration_at, i.restored_at,
              n.id AS n_id, n.name AS n_name, t.name AS town, c.name AS county,
              causes.name AS cause,
              (SELECT count(*) FROM outage_reports r
                WHERE r.incident_id = i.id) AS report_count
       FROM outage_incidents i
       JOIN neighbourhoods n ON n.id = i.neighbourhood_id
       JOIN towns t ON t.id = n.town_id
       JOIN counties c ON c.id = t.county_id
       JOIN causes ON causes.id = i.cause_id
       ${where}
       ORDER BY i.started_at DESC, i.id DESC
       LIMIT ${MAX_INCIDENTS}`,
      params
    );

    // Shape matches the spec exactly; user data never exists in this query.
    const incidents = result.rows.map((row) => ({
      id: row.id,
      neighbourhood: {
        id: row.n_id,
        name: row.n_name,
        town: row.town,
        county: row.county,
      },
      status: row.status,
      is_planned: row.is_planned,
      is_simulated: row.is_simulated,
      cause: row.cause,
      cause_confirmed: row.cause_confirmed,
      started_at: row.started_at,
      estimated_restoration_at: row.estimated_restoration_at,
      restored_at: row.restored_at,
      report_count: Number(row.report_count),
    }));
    res.json(incidents);
  } catch (error) {
    next(error);
  }
}

export const incidentsRouter = Router();
incidentsRouter.get("/", requireAuth, listIncidents);
