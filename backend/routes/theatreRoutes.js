const express = require("express");

const router = express.Router();

const {
    getAllTheatres, getTheatreById, createTheatre, updateTheatre, deleteTheatre
} = require("../controllers/theatreController.js");

//THEATRES
router.get("/theatres", getAllTheatres);
router.get("/theatres/:id", getTheatreById);
router.post("/theatres/create", createTheatre);
router.put("/theatres/update/:id", updateTheatre);
router.delete("/theatres/delete/:id", deleteTheatre);

module.exports = router;