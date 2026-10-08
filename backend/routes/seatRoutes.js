const express = require("express");

const router = express.Router();

const {
    getSeatsByScreen, createSeatForScreen, updateSeat, deleteSeat
} = require("../controllers/seatController.js");

// GET ALL SEATS FOR A SCREEN
router.get("/screens/:screenId/seats", getSeatsByScreen);

// CREATE SEAT FOR A SCREEN
router.post("/screens/:screenId/seats/create", createSeatForScreen);

// UPDATE SEAT
router.put("/seats/update/:id", updateSeat);

// DELETE SEAT
router.delete("/seats/delete/:id", deleteSeat);

module.exports = router;