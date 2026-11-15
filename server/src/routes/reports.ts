import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

// Guess: reports within this window belong to the same outage; tune later.
const GROUPING_WINDOW_HOURS = 12;

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

// Only these columns ever leave the server; password/user data is never selected.
const INCIDENT_COLUMNS =
  "id, neighbourhood_id, cause_id, cause_confirmed, is_planned, status, " +
  "started_at, estimated_restoration_at, restored_at, is_simulated, created_at";

const REPORT_COLUMNS =
  "id, incident_id, neighbourhood_id, started_at, description, " +
  "neighbours_affected, created_at";

type IncidentRow = {
  id: number;
  neighbourhood_id: number;
  cause_id: number;
  cause_confirmed: boolean;
  is_planned: boolean;
  status: string;
  started_at: Date;
  estimated_restoration_at: Date | null;
  restored_at: Date | null;
  is_simulated: boolean;
  created_at: Date;
};

type ReportRow = {
  id: number;
  incident_id: number | null;
  neighbourhood_id: number;
  started_at: Date;
  description: string | null;
  neighbours_affected: boolean | null;
  created_at: Date;
};

const reportsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many attempts, try again later" });
  },
});

// strictObject: user_id/incident_id or any unknown field is rejected with 400.
const createReportSchema = z.strictObject({
  started_at: z.iso.datetime({ offset: true }),
  description: z.string().max(1000).optional(),
  neighbours_affected: z.boolean().optional(),
  neighbourhood_id: z.number().int().positive().optional(),
});

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request";
}

async function createReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: firstIssueMessage(parsed.error) });
      return;
    }
    const data = parsed.data;

    const startedAt = new Date(data.started_at);
    const now = Date.now();
    if (startedAt.getTime() > now + FUTURE_TOLERANCE_MS) {
      res.status(400).json({ error: "started_at is too far in the future" });
      return;
    }
    if (startedAt.getTime() < now - MAX_AGE_MS) {
      res.status(400).json({ error: "started_at is older than 48 hours" });
      return;
    }

    // Default to the caller's own neighbourhood; validate anything client-supplied.
    let neighbourhoodId: number;
    if (data.neighbourhood_id !== undefined) {
      neighbourhoodId = data.neighbourhood_id;
      const exists = await pool.query(
        "SELECT 1 FROM neighbourhoods WHERE id = $1",
        [neighbourhoodId]
      );
      if (exists.rows.length === 0) {
        res.status(400).json({ error: "Unknown neighbourhood" });
        return;
      }
    } else {
      const own = req.user?.neighbourhood_id;
      if (own === undefined || own === null) {
        res.status(400).json({ error: "Unknown neighbourhood" });
        return;
      }
      neighbourhoodId = own;
    }

    const user = req.user;
    if (!user) {
      // requireAuth already guards this; kept for the type and as a safety net.
      res.status(401).json({ error: "Not logged in" });
      return;
    }

    // One client for the whole grouping sequence: the advisory lock lives on
    // this connection, so pool.query (which may grab another) must not be used.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      try {
        // Serializes grouping per neighbourhood; auto-released at COMMIT/ROLLBACK.
        await client.query("SELECT pg_advisory_xact_lock(1, $1)", [
          neighbourhoodId,
        ]);

        const existing = await client.query<IncidentRow>(
          `SELECT ${INCIDENT_COLUMNS} FROM outage_incidents
           WHERE neighbourhood_id = $1
             AND status <> 'restored'
             AND is_planned = FALSE
             AND is_simulated = FALSE
             AND started_at >= NOW() - make_interval(hours => $2)
           ORDER BY started_at DESC, id DESC
           LIMIT 1`,
          [neighbourhoodId, GROUPING_WINDOW_HOURS]
        );

        let incident: IncidentRow;
        let grouped: boolean;

        const candidate = existing.rows[0];
        if (candidate) {
          incident = candidate;
          grouped = true;

          const duplicate = await client.query(
            "SELECT 1 FROM outage_reports WHERE user_id = $1 AND incident_id = $2",
            [user.id, incident.id]
          );
          if (duplicate.rows.length > 0) {
            await client.query("ROLLBACK");
            res.status(409).json({
              error: "You already reported this outage",
              incident_id: incident.id,
            });
            return;
          }
        } else {
          grouped = false;
          const causeResult = await client.query<{ id: number }>(
            "SELECT id FROM causes WHERE name = $1",
            ["Unknown"]
          );
          const causeId = causeResult.rows[0]?.id;
          if (causeId === undefined) {
            // Migration 003 always inserts it; missing means a broken database.
            throw new Error("Cause 'Unknown' is missing from the causes table");
          }
          const created = await client.query<IncidentRow>(
            `INSERT INTO outage_incidents
               (neighbourhood_id, cause_id, cause_confirmed, is_planned,
                status, started_at, is_simulated)
             VALUES ($1, $2, FALSE, FALSE, 'reported', $3, FALSE)
             RETURNING ${INCIDENT_COLUMNS}`,
            [neighbourhoodId, causeId, startedAt]
          );
          const row = created.rows[0];
          if (!row) {
            throw new Error("Incident insert returned no row");
          }
          incident = row;
        }

        const reportResult = await client.query<ReportRow>(
          `INSERT INTO outage_reports
             (user_id, incident_id, neighbourhood_id, started_at,
              description, neighbours_affected)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING ${REPORT_COLUMNS}`,
          [
            user.id,
            incident.id,
            neighbourhoodId,
            startedAt,
            data.description ?? null,
            data.neighbours_affected ?? null,
          ]
        );
        const report = reportResult.rows[0];
        if (!report) {
          throw new Error("Report insert returned no row");
        }

        await client.query("COMMIT");
        res.status(201).json({ report, incident, grouped });
      } catch (error) {
        // Swallow rollback failures so the original error still reaches the handler.
        await client.query("ROLLBACK").catch(() => undefined);
        next(error);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

async function listMine(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not logged in" });
      return;
    }
    const result = await pool.query<ReportRow>(
      `SELECT ${REPORT_COLUMNS} FROM outage_reports
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`,
      [user.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export const reportsRouter = Router();
reportsRouter.post("/", reportsLimiter, requireAuth, createReport);
reportsRouter.get("/mine", requireAuth, listMine);
