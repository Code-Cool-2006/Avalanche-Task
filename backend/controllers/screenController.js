const { pool } = require("../config/db");

// GET ALL SCREENS
const getAllScreens = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM screens ORDER BY id"
        );

        return res.json(result.rows);

    } catch (error) {
        console.error("Error fetching screens:", error.message);

        return res.status(500).json({
            message: "Failed to fetch screens"
        });
    }
};


//GET SCREEN BY ID
const getScreenById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "SELECT * FROM screens WHERE id = $1",
            [id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: "Screen not found"
            });
        }

        return res.json(result.rows[0]);
        
    }catch (error) {
        console.error("Error fetching screen by ID:", error.message);

        return res.status(500).json({
            message: "Failed to fetch screen by ID"
        });
    }
}

//CREATE SCREEN
const createScreen = async (req, res) => {

    try {

        const { name, theatre_id } = req.body;

        if(!name || !theatre_id) {
            return res.status(400).json({
                message: "Name and Theatre ID are required"
            });
        }

        const result = await pool.query(
            "INSERT INTO screens (name, theatre_id) VALUES ($1, $2) RETURNING *",
            [name, theatre_id]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error creating screen:", error.message);

        return res.status(500).json({
            message: "Failed to create screen"
        });
    }
}

//UPDATE SCREEN

const updateScreen = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, theatre_id } = req.body;

        if (!name || !theatre_id) {
            return res.status(400).json({
                message: "Name and Theatre ID are required"
            });
        }
        
        const result = await pool.query(
            "UPDATE screens SET name = $1, theatre_id = $2 WHERE id = $3 RETURNING *",
            [name, theatre_id, id]
        );

        return res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating screen:", error.message);

        return res.status(500).json({
            message: "Failed to update screen"
        });
    }
}


// DELETE SCREEN

const deleteScreen = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM screens WHERE id = $1 RETURNING *",
            [id]
        );
        if(result.rows.length === 0) {
            return res.status(404).json({
                message: "Screen not found"
            });
        }

        return res.json({
            message: "Screen deleted successfully"
        }); 


    }catch (error) {
        console.error("Error deleting screen:", error.message);

        return res.status(500).json({
            message: "Failed to delete screen"
        });
    }
}


module.exports = {
    getAllScreens,
    getScreenById,
    createScreen,
    updateScreen,
    deleteScreen
};