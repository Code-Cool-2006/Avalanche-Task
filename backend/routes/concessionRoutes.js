import express from "express";
import { getAllConcessions } from "../controllers/concessionController.js";

const router = express.Router();

// GET /api/concessions (concessions menu catalog)
router.get("/concessions", getAllConcessions);

export default router;
