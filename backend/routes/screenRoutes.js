import express from "express";
import {
  getAllScreens,
  getScreenById,
  createScreen,
  updateScreen,
  deleteScreen,
} from "../controllers/screenController.js";

const router = express.Router();

// GET ALL SCREENS
router.get("/screens", getAllScreens);

// GET SCREEN BY ID
router.get("/screens/:id", getScreenById);

// CREATE SCREEN
router.post("/screens/create", createScreen);

// UPDATE SCREEN
router.put("/screens/update/:id", updateScreen);

// DELETE SCREEN
router.delete("/screens/delete/:id", deleteScreen);

export default router;