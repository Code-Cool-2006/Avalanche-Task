const express = require("express");

const router = express.Router();

const {
    getAllScreens, getScreenById, createScreen, updateScreen, deleteScreen
} = require("../controllers/screenController.js");

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

module.exports = router;