import pg from "pg"; 
import dotenv from "dotenv"; 

dotenv.config(); const { Pool } = pg; 

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false, }, 
}); 

export const connectDB = async () => { 
  try { 
      await pool.query("SELECT 1"); 
      console.log("Neon PostgreSQL connected successfully"); 
    } catch (error) { 
        console.error("Database connection failed:", error.message); 
        throw error; 
      } 
    };