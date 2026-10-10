
import express from "express";
import {
  getShows,
  getShowById,
  createShow,
  updateShow,
  deleteShow,
} from "../controllers/showController.js";

import {
  requireAuth,
  requireAdmin
} from "../middleware/authMiddleware.js";

const router = express.Router();


 // GET ALL SHOWS — public
router.get("/", getShows);

// GET SHOW BY ID — public
router.get("/:id", getShowById);

// CREATE SHOW — admin only
router.post(
  "/",
  requireAuth,
  requireAdmin,
  createShow
);

// UPDATE SHOW — admin only
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  updateShow
);

// DELETE SHOW — admin only
router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  deleteShow
);

export default router;
