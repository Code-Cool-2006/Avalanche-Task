const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log("Neon PostgreSQL connected successfully");
        client.release();
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
};

module.exports = { pool, connectDB };