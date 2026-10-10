
import express from "express";
import {
  requireAuth,
  requireAdmin
} from "../middleware/authMiddleware.js";

import {
  getDashboardStats
} from "../controllers/adminController.js";

const router = express.Router();

// All routes below require an authenticated admin
router.use(requireAuth, requireAdmin);

// Admin dashboard
router.get("/dashboard", getDashboardStats);

export default router;
