import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes database schema and indexes idempotently
 */
export async function initializeDatabase(pool) {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  await pool.query(sql);

  // Safe idempotent migration for composite UNIQUE constraint on existing screens table if needed
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'screens_id_theatre_id_key' OR conname = 'screens_id_theatre_id_unique'
        ) THEN
          ALTER TABLE screens ADD CONSTRAINT screens_id_theatre_id_key UNIQUE (id, theatre_id);
        END IF;
      EXCEPTION
        WHEN duplicate_table OR duplicate_object THEN
          NULL;
      END $$;
    `);
  } catch {
    // If constraint already exists or table unpopulated, continue safely
  }

  // Check if initial demonstration data is required
  await seedInitialDataIfEmpty(pool);
}

/**
 * Seeds minimal demonstration records if database tables are currently empty
 */
async function seedInitialDataIfEmpty(pool) {
  try {
    const movieCountRes = await pool.query("SELECT COUNT(*) FROM movies");
    const movieCount = parseInt(movieCountRes.rows[0].count, 10);

    if (movieCount === 0) {
      console.log("[db-init] Seeding initial cinema demonstration data...");

      // 1. Seed Movies
      const mRes = await pool.query(`
        INSERT INTO movies (title, description, genre, language, duration_min, rating, poster_url, trailer_url, release_date)
        VALUES 
          ('Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.', 'Sci-Fi, Adventure, Action', 'English', 166, 8.8, 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80', 'https://www.youtube.com/watch?v=Way9Dexny3w', '2024-03-01'),
          ('Oppenheimer', 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.', 'Biography, Drama, History', 'English', 180, 8.9, 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80', 'https://www.youtube.com/watch?v=uYPbbksJxIg', '2023-07-21'),
          ('Interstellar', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity survival.', 'Sci-Fi, Drama, Adventure', 'English', 169, 8.7, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', 'https://www.youtube.com/watch?v=zSWdZVtXT7E', '2014-11-07')
        RETURNING id;
      `);
      const movie1Id = mRes.rows[0].id;

      // 2. Seed Theatres
      const tRes = await pool.query(`
        INSERT INTO theatres (name, city, address)
        VALUES 
          ('PVR INOX: Palladium IMAX', 'Mumbai', 'High Street Phoenix, Senapati Bapat Marg, Lower Parel'),
          ('Cinepolis: Forum Shantiniketan', 'Bengaluru', 'Whitefield Main Road, Hoodi'),
          ('PVR: Director''s Cut', 'Delhi-NCR', 'Ambience Mall, Vasant Kunj')
        RETURNING id;
      `);
      const theatre1Id = tRes.rows[0].id;

      // 3. Seed Screens
      const sRes = await pool.query(`
        INSERT INTO screens (theatre_id, name)
        VALUES 
          ($1, 'IMAX Laser Auditorium 1'),
          ($1, '4DX Screen 2')
        RETURNING id;
      `, [theatre1Id]);
      const screen1Id = sRes.rows[0].id;

      // 4. Seed Physical Seats for Screen 1 (Row A to C)
      const seatRows = [
        { label: "A", count: 10, tier: "recliner" },
        { label: "B", count: 10, tier: "premium" },
        { label: "C", count: 10, tier: "regular" },
      ];

      const insertedSeats = [];
      for (const r of seatRows) {
        for (let num = 1; num <= r.count; num++) {
          const seatRes = await pool.query(
            "INSERT INTO seats (screen_id, row_label, seat_number, tier) VALUES ($1, $2, $3, $4) RETURNING id",
            [screen1Id, r.label, num, r.tier]
          );
          insertedSeats.push(seatRes.rows[0].id);
        }
      }

      // 5. Seed Show for Movie 1 on Screen 1
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);

      const showRes = await pool.query(`
        INSERT INTO shows (movie_id, theatre_id, screen_id, start_time, language, format, price_regular, price_premium, price_recliner, status)
        VALUES ($1, $2, $3, $4, 'English', 'IMAX 3D', 220.00, 320.00, 550.00, 'SCHEDULED')
        RETURNING id;
      `, [movie1Id, theatre1Id, screen1Id, tomorrow.toISOString()]);
      const show1Id = showRes.rows[0].id;

      // 6. Seed Show Seats mapping for Show 1
      for (const sId of insertedSeats) {
        await pool.query(
          "INSERT INTO show_seats (show_id, seat_id, status) VALUES ($1, $2, 'AVAILABLE')",
          [show1Id, sId]
        );
      }

      // 7. Seed Food & Concessions Menu Items
      await pool.query(`
        INSERT INTO food_items (name, description, category, price, available)
        VALUES
          ('Caramel & Salted Popcorn XL Combo', 'Extra large tub with 2 bottomless cold beverages', 'Combos', 420.00, true),
          ('Classic Salted Gourmet Butter Popcorn', 'Freshly popped warm golden corn in butter seasoning', 'Popcorn', 260.00, true),
          ('Loaded Cheese & Jalapeño Nachos', 'Crispy Mexican tortilla chips with warm cheese sauce and jalapeños', 'Snacks', 240.00, true),
          ('Chilled Pepsi Fountain Cup (650ml)', 'Ice-cold carbonated refreshing beverage', 'Beverages', 180.00, true),
          ('Artisanal Belgian Dark Truffle Brownie', 'Warm gooey molten chocolate brownie with chocolate drizzle', 'Desserts', 190.00, true);
      `);

      console.log("[db-init] Demonstration data seeded successfully.");
    }
  } catch (err) {
    console.warn("[db-init] Seed step skipped or table already populated:", err.message);
  }
}

// Standalone CLI execution support (`npm run db:init`)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL environment variable is required to run db:init.");
    process.exit(1);
  }

  const cliPool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  try {
    console.log("[db-init] Running database schema initialization...");
    await initializeDatabase(cliPool);
    console.log("[db-init] Schema initialized successfully.");
  } catch (err) {
    console.error("[db-init] Initialization error:", err);
    process.exit(1);
  } finally {
    await cliPool.end();
  }
}
