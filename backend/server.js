const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/db");

const movieRoutes = require("./routes/movieRoutes.js");
const theatreRoutes = require("./routes/theatreRoutes.js");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", movieRoutes);
app.use("/", theatreRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Movie Booking Backend is running!"
    });
});




const PORT = 5000;

connectDB();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});