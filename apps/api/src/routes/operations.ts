import { Router } from "express";
import { getOperationsSnapshot } from "../services/operations-data";

export const operationsRouter = Router();

operationsRouter.get("/operations", async (_req, res) => {
  try {
    const snapshot = await getOperationsSnapshot();
    res.json(snapshot);
  } catch {
    res.status(503).json({ error: "Operational state unavailable" });
  }
});
