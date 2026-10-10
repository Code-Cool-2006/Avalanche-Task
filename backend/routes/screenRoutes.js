import express from "express";
import {
  getAllScreens,
  getScreenById,
  createScreen,
  updateScreen,
  deleteScreen,
} from "../controllers/screenController.js";

import {
  requireAuth,
  requireAdmin
} from "../middleware/authMiddleware.js";

const router = express.Router();


 // GET ALL SCREENS — public
router.get("/", getAllScreens);

// GET SCREEN BY ID — public
router.get("/:id", getScreenById);

// CREATE SCREEN — admin only
router.post(
  "/create",
  requireAuth,
  requireAdmin,
  createScreen
);

// UPDATE SCREEN — admin only
router.put(
  "/update/:id",
  requireAuth,
  requireAdmin,
  updateScreen
);

// DELETE SCREEN — admin only
router.delete(
  "/screens/delete/:id",
  requireAuth,
  requireAdmin,
  deleteScreen
);


export default router;