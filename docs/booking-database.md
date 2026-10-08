# Cinema & Movie Booking Database Architecture

This document defines the complete PostgreSQL relational database schema for the CineShow movie booking platform.

---

## 1. Existing Tables Discovered & Preserved

Prior to this phase, the database contained initial models for authentication, movie listings, theatres, screens, and physical seats:

| Table | Purpose | Primary Key | Key Columns / Constraints |
| :--- | :--- | :--- | :--- |
| `users` | User accounts, credentials, and roles | `id` (SERIAL) | `email` (UNIQUE), `password_hash`, `verified`, `fails`, `locked_until` |
| `otps` | 6-digit email OTPs for registration & password reset | `(email, purpose)` | `hash` (HMAC-SHA256), `expires`, `tries`, `sent` |
| `sessions` | Refresh tokens with rotation and device revocation | `id` (SERIAL) | `user_id` (FK), `token_hash` (UNIQUE), `expires`, `revoked` |
| `audit` | Security audit trail for login/auth events | - | `ts`, `event`, `email`, `ip`, `detail` |
| `movies` | Film catalog, metadata, trailers, and ratings | `id` (SERIAL) | `title`, `genre`, `language`, `duration_min`, `rating`, `poster_url` |
| `theatres` | Physical cinema complexes and locations | `id` (SERIAL) | `name`, `city`, `address` |
| `screens` | Auditoriums belonging to theatres | `id` (SERIAL) | `theatre_id` (FK `theatres.id`), `name`, `UNIQUE(id, theatre_id)` |
| `seats` | Physical seat positions per screen | `id` (SERIAL) | `screen_id` (FK `screens.id`), `row_label`, `seat_number`, `tier`, `UNIQUE(screen_id, row_label, seat_number)` |

---

## 2. Relational Tables Schema

### 2.1 `screens`
Auditoriums belonging to theatres. Enforces composite uniqueness so child shows cannot cross-reference mismatched theatres.
```sql
CREATE TABLE screens (
  id SERIAL PRIMARY KEY,
  theatre_id INTEGER NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  UNIQUE (id, theatre_id)
);
```

### 2.2 `shows`
Represents scheduled movie screenings in a specific auditorium. Enforces that `screen_id` physically belongs to `theatre_id`.
```sql
CREATE TABLE shows (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  theatre_id INTEGER NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
  screen_id INTEGER NOT NULL,
  FOREIGN KEY (screen_id, theatre_id) REFERENCES screens(id, theatre_id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  language VARCHAR(50) DEFAULT 'English',
  format VARCHAR(50) DEFAULT '2D',
  price_regular NUMERIC(10, 2) NOT NULL DEFAULT 180.00,
  price_premium NUMERIC(10, 2) NOT NULL DEFAULT 260.00,
  price_recliner NUMERIC(10, 2) NOT NULL DEFAULT 420.00,
  status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 `show_seats`
The seat availability engine mapping physical seats to showtimes.
```sql
CREATE TABLE show_seats (
  id SERIAL PRIMARY KEY,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'LOCKED', 'BOOKED')),
  locked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (show_id, seat_id)
);
```

### 2.4 `bookings`
Order header capturing the customer, show, pricing totals, and lifecycle status.
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  booking_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  food_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  convenience_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.5 `booking_seats`
Historical snapshot table recording the exact seat label, tier, and unit price paid at the time of purchase.
```sql
CREATE TABLE booking_seats (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  unit_price NUMERIC(10, 2) NOT NULL,
  row_label VARCHAR(5) NOT NULL,
  seat_number INTEGER NOT NULL,
  tier VARCHAR(20) NOT NULL,
  UNIQUE (booking_id, seat_id)
);
```

### 2.6 `food_items` & `booking_food`
Concessions menu catalog and line items purchased in a booking.
```sql
CREATE TABLE food_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Popcorn', 'Combos', 'Beverages', 'Snacks', 'Hot Food', 'Desserts')),
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_food (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  food_item_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.7 `payments` & `tickets`
Payment audit records and digital QR ticket passes.
```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  provider VARCHAR(50) NOT NULL DEFAULT 'UPI',
  provider_payment_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  ticket_number VARCHAR(60) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'USED', 'CANCELLED', 'EXPIRED')),
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Concurrency, Atomicity & Seat Reservation Flow

### Essential Distinction:
* **`UNIQUE(show_id, seat_id)`**: Guarantees structural uniqueness at the schema level so a seat cannot be mapped more than once to a show.
* **`SELECT ... FOR UPDATE` inside an atomic transaction**: Eliminates race conditions when two or more users attempt to lock or book the same seat simultaneously.

### 7-Step Transactional Reservation Lifecycle:
1. **`BEGIN`**: Start atomic PostgreSQL transaction (`pool.connect()`).
2. **Row Lock with `FOR UPDATE`**:
   ```sql
   SELECT id, seat_id, status, locked_by, locked_until 
   FROM show_seats 
   WHERE show_id = $1 AND seat_id = ANY($2::int[]) 
   FOR UPDATE;
   ```
3. **Availability & Expiry Check**:
   - Reject if any requested seat is `status = 'BOOKED'`.
   - Reject if any seat is `status = 'LOCKED'` by another user AND `locked_until > NOW()`.
   - Treat seats with `locked_until <= NOW()` as expired (available to claim).
4. **Lock Acquisition**:
   Update eligible rows to `status = 'LOCKED'`, `locked_by = authenticated_user_id`, `locked_until = NOW() + INTERVAL '5 minutes'`.
5. **Create/Update Pending Booking Header**:
   Insert record into `bookings` with `status = 'PENDING'`.
6. **Populate Historical `booking_seats`**:
   Insert snapshot unit prices and tier records into `booking_seats`.
7. **`COMMIT`**: Commit transaction. If any validation fails, issue `ROLLBACK`.
