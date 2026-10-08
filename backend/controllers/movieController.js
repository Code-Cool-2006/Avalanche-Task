const {pool} = require("../config/db");

// GET ALL MOVIES
const getAllMovies = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM movies ORDER BY release_date DESC"
        );

        return res.json(result.rows);
    } catch (error) {
        console.error("Error fetching movies:", error.message);

        return res.status(500).json({
            message: "Failed to fetch movies"
        });
    }
};

//GET MOVIE BY ID
const getMovieById = async(req, res)=>{
    try{
        const {id} = req.params;

        const result = await pool.query(
            "SELECT * FROM movies WHERE id = $1", 
            [id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({message: "Movie not found"});
        }

        return res.json(result.rows[0]);
    }catch(error){

        console.error("Error fetching movie by ID:", error.message);

        return res.status(500).json( {message: "Failed to fetch movie by ID"});
    }
}

//ADD NEW MOVIE
const createMovie = async (req, res) => {
    try{

        const {title, description, release_date, genre, language, duration_min, rating, poster_url, trailer_url} = req.body;

        if(!title){
            return res.status(400).json({
            message: "Movie title is required"})
        }

        const result = await pool.query(
            `INSERT INTO movies
            (title, description, genre, language, duration_min, rating, poster_url, trailer_url, release_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                title,
                description,
                genre,
                language,
                duration_min,
                rating,
                poster_url,
                trailer_url,
                release_date
            ]
        );


        return res.status(201).json(result.rows[0]);

    }catch(error){
        console.error("Error Creating Movie:", error.message);

        return res.status(500).json( {message: "Failed to create movie"});
    }
}


//UPDATE MOVIE
const updateMovie = async (req, res) => {
    try{

        const { id } = req.params;

        const { title, description, release_date, genre, language, duration_min, rating, poster_url, trailer_url } = req.body;

        const result = await pool.query(
            `UPDATE movies
            SET title = $1, description = $2, release_date = $3, genre = $4, language = $5, duration_min = $6, rating = $7, poster_url = $8, trailer_url = $9
            WHERE id = $10
            RETURNING *`,
            [
                title,
                description,
                release_date,
                genre,
                language,
                duration_min,
                rating,
                poster_url,
                trailer_url,
                id
            ]
        );


        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        return res.json(result.rows[0]);

    }catch(error){
        console.error("Error Updating Movie:", error.message);

        return res.status(500).json( {message: "Failed to update movie"});
    }
}


//DELETE MOVIE
const deleteMovie = async (req, res) => {
    try{
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM movies WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
        }

        return res.json({ message: "Movie deleted successfully", movie: result.rows[0] });

    }catch(error){
        console.error("Error Deleting Movie:", error.message);

        return res.status(500).json( {message: "Failed to delete movie"});
    }
}

module.exports = {
    getAllMovies,
    getMovieById,
    createMovie,
    updateMovie,
    deleteMovie
};