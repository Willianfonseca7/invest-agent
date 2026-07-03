import { Router } from "express";
import { getOperationsSnapshot } from "../services/operations-data";

export const operationsRouter = Router();

operationsRouter.get("/operations", async (_req, res) => {
  try {
    const snapshot = await getOperationsSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao obter snapshot operacional"
    });
  }
});
