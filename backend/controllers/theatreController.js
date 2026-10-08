const { pool } = require("../config/db");

// GET ALL THEATRES
const getAllTheatres = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM theatres ORDER BY id"
        );

        return res.json(result.rows);

    } catch (error) {
        console.error("Error fetching theatres:", error.message);

        return res.status(500).json({
            message: "Failed to fetch theatres"
        });
    }
};


// GET ALL THEATRES BY ID
const getTheatreById = async (req, res) => {
    try {

        const { id} = req.params;

        const result = await pool.query(
            "SELECT * FROM theatres WHERE id = $1",
            [id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({message: "Theatre not found"});
        }


        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Error fetching theatre:", error.message);
        return res.status(500).json({
            message: "Failed to fetch theatre"
        });
    }
}


// CREATE THEATRE
const createTheatre = async (req, res) => {
    try {
        const { name, city, address } = req.body;

        if (!name || !city || !address) {
            return res.status(400).json({
                message: "Name, city and address are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO theatres (name, city, address)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, city, address]
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("Error creating theatre:", error.message);

        return res.status(500).json({
            message: "Failed to create theatre"
        });
    }
};

//UPDATE THEATRE
const updateTheatre = async (req, res) => {
    try{
        const {id} = req.params;

        const { name, city, address } = req.body;

        if(!name || !city || !address){
            return res.status(400).json({
                message: "Name, city and address are required"
            });
        }

        const result = await pool.query(
            `UPDATE theatres
             SET name = $1, city = $2, address = $3
             WHERE id = $4
             RETURNING *`,
            [name, city, address, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Theatre not found" });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating theatre:", error.message);
        return res.status(500).json({
            message: "Failed to update theatre"
        });
    }
}


//DELETE THEATRE
const deleteTheatre = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM theatres WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Theatre not found" });
        }

        return res.json({ message: "Theatre deleted successfully" });


    } catch (error) {
        console.error("Error deleting theatre:", error.message);


        return res.status(500).json({
            message: "Failed to delete theatre"
        });
    }
}

module.exports = {
    getAllTheatres,
    getTheatreById,
    createTheatre,
    updateTheatre, 
    deleteTheatre
};