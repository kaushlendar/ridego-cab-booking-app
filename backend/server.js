const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
require("dotenv").config();
const crypto = require("crypto");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const pool = require("./db");

const app = express();

const PORT = process.env.PORT || 5000;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RideGo Backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "RideGo API is healthy",
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Database connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database test error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// =========================
// USER SIGNUP API
// =========================

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!["customer", "driver"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Check existing user
    const existingUser = await pool.query(
      "SELECT id FROM public.users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Save user
    const result = await pool.query(
      `INSERT INTO public.users
       (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, role`,
      [
        String(name).trim(),
        normalizedEmail,
        phone || null,
        passwordHash,
        role,
      ]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user,
    });

  } catch (error) {
    console.error("Signup error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Signup failed",
    });
  }
});

// =========================
// USER LOGIN API
// =========================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Find user
    const result = await pool.query(
      `SELECT id, name, email, phone, password_hash, role
       FROM public.users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Never send password hash to frontend
    delete user.password_hash;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});
// GET LOGGED-IN DRIVER
app.get(
  "/api/drivers/me",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           d.id AS driver_id,
           d.user_id,
           d.public_user_id,
           d.license_number,
           d.license_expiry,
           d.vehicle_type,
           d.vehicle_number,
           d.rating,
           d.is_online,
           d.status
         FROM public.drivers d
         WHERE d.public_user_id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Driver profile not found. Please complete driver registration.",
        });
      }

      return res.json({
        success: true,
        driver: result.rows[0],
      });
    } catch (error) {
      console.error("Get logged-in driver error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch driver profile",
      });
    }
  }
);

// =========================
// GET DRIVER PROFILE
// =========================

app.get(
  "/api/drivers/:id/profile",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Verify that this driver belongs to the logged-in user
      console.log("Logged-in user ID:", req.user.id);
    console.log("Requested driver ID:", req.params.id);

      const ownershipResult = await pool.query(
        `SELECT id
         FROM public.drivers
         WHERE id = $1
           AND public_user_id = $2`,
        [id, req.user.id]
      );

      if (ownershipResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own driver profile",
        });
      }

      // Fetch driver profile
      const result = await pool.query(
        `SELECT
   d.id AS driver_id,
   d.user_id,
   d.public_user_id,
   d.license_number,
d.license_expiry,
d.vehicle_type,
d.vehicle_number,
d.rating,
d.is_online,
   COALESCE(u.name, p.full_name) AS full_name,
   COALESCE(u.phone, p.phone) AS phone,
   COALESCE(u.email, p.email) AS email,
   u.role
 FROM public.drivers d
 LEFT JOIN public.profiles p
   ON d.user_id = p.id
 LEFT JOIN public.users u
   ON d.public_user_id = u.id
 WHERE d.id = $1
       AND d.public_user_id = $2`,
  [id, req.user.id]
);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      return res.json({
        success: true,
        driver: result.rows[0],
        profile: result.rows[0],
      });
    } catch (error) {
      console.error("Get driver profile error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch driver profile",
      });
    }
  }
);


// =========================
// UPDATE DRIVER PROFILE
// =========================

app.put(
  "/api/drivers/:id/profile",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } = req.params;

      const {
        fullName,
        phone,
        email,
        licenseNumber,
        vehicleType,
        vehicleNumber,
      } = req.body;

// Validate required fields
if (
  !fullName?.trim() ||
  !email?.trim() ||
  !vehicleType?.trim()
) {
  return res.status(400).json({
    success: false,
    message: "Please enter your name, email, and vehicle type.",
  });
}

      await client.query("BEGIN");

      // Verify that this driver belongs to the logged-in user
      const driverResult = await client.query(
        `SELECT id, public_user_id
         FROM public.drivers
         WHERE id = $1
           AND public_user_id = $2
         FOR UPDATE`,
        [id, req.user.id]
      );

      if (driverResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(403).json({
          success: false,
          message: "You can only update your own driver profile",
        });
      }

      const driver = driverResult.rows[0];

      // Update personal information in public.users
      const userResult = await client.query(
        `UPDATE public.users
         SET name = $1,
             phone = $2,
             email = $3
         WHERE id = $4
         RETURNING id, name, phone, email, role`,
        [
          fullName.trim(),
          phone.trim(),
          email.trim().toLowerCase(),
          driver.public_user_id,
        ]
      );

      if (userResult.rows.length === 0) {
        throw new Error("Driver user account not found");
      }

      // Update driving licence and vehicle details
      const updatedDriver = await client.query(
        `UPDATE public.drivers
         SET license_number = $1,
             vehicle_type = $2,
             vehicle_number = $3
         WHERE id = $4
           AND public_user_id = $5
         RETURNING id, license_number, vehicle_type,
                   vehicle_number, license_expiry,
                   status, rating, total_rides, is_online`,
        [
          licenseNumber.trim(),
          vehicleType.trim(),
          vehicleNumber.trim(),
          id,
          req.user.id,
        ]
      );

      if (updatedDriver.rows.length === 0) {
        throw new Error("Driver profile update failed");
      }

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Driver profile updated successfully",
        profile: {
          full_name: userResult.rows[0].name,
          phone: userResult.rows[0].phone,
          email: userResult.rows[0].email,
          role: userResult.rows[0].role,
        },
        driver: updatedDriver.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});

      console.error("Update driver profile error:", error.message);

      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "This email or licence number is already registered",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update driver profile",
      });
    } finally {
      client.release();
    }
  }
);

// GET DRIVER AVAILABILITY
app.get(
  "/api/drivers/:id/availability",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
  try {
   const { id } = req.params;

const ownershipResult = await pool.query(
  `SELECT id
   FROM public.drivers
   WHERE id = $1
     AND public_user_id = $2`,
  [id, req.user.id]
);

if (ownershipResult.rows.length === 0) {
  return res.status(403).json({
    success: false,
    message: "You can only view your own availability",
  });
}

const result = await pool.query(
  `SELECT id, is_online
   FROM drivers
   WHERE id = $1`,
  [id]
);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.json({
      success: true,
      driver: result.rows[0],
    });
  } catch (error) {
    console.error("Get driver availability error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch driver availability",
    });
  }
});

// DRIVER ONLINE / OFFLINE API
app.patch(
  "/api/drivers/:id/availability",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
  try {
    const { id } = req.params;
    // Verify that the logged-in driver owns this profile
const ownershipResult = await pool.query(
  `SELECT id
   FROM public.drivers
   WHERE id = $1
     AND public_user_id = $2`,
  [id, req.user.id]
);

if (ownershipResult.rows.length === 0) {
  return res.status(403).json({
    success: false,
    message: "You can only change your own availability",
  });
}
    const { is_online } = req.body;

    if (typeof is_online !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "is_online must be true or false",
      });
    }

    const result = await pool.query(
  `UPDATE public.drivers
   SET is_online = $1
   WHERE id = $2
     AND public_user_id = $3
   RETURNING id, is_online`,
  [is_online, id, req.user.id]
);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Driver not found",
      });
    }

    res.json({
      success: true,
      message: is_online ? "Driver is now online" : "Driver is now offline",
      driver: result.rows[0],
    });
  } catch (error) {
    console.error("Driver availability error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update driver availability",
    });
  }
});

// =========================
// GET PENDING RIDES
// =========================
app.get(
  "/api/rides/pending",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
    try {
      // Verify that the logged-in user has a driver profile
                 const driverResult = await pool.query(
  `SELECT id, is_online, status
   FROM public.drivers
   WHERE public_user_id = $1`,
  [req.user.id]
);

// Step 1: Driver exists?
if (driverResult.rows.length === 0) {
  return res.status(404).json({
    success: false,
    message: "Driver profile not found",
  });
}

// Step 2: Driver approved?
const driver = driverResult.rows[0];

if (driver.status !== "approved") {
  return res.status(403).json({
    success: false,
    message: "Your driver account is pending approval",
  });
}

// Step 3: Driver online?
if (!driver.is_online) {
  return res.json({
    success: true,
    rides: [],
    message: "Go online to receive ride requests",
  });
}
      const result = await pool.query(
        `SELECT *
         FROM public.rides
         WHERE status = 'requested'
           AND driver_id IS NULL
         ORDER BY created_at DESC`
      );

      return res.json({
        success: true,
        rides: result.rows,
      });
    } catch (error) {
      console.error("Pending rides error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch pending rides",
      });
    }
  }
);

// =========================
// ACCEPT RIDE
// =========================
app.patch(
  "/api/rides/:id/accept",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find the logged-in driver's actual ID
     const driverResult = await pool.query(
  `SELECT id, is_online, status
   FROM public.drivers
   WHERE public_user_id = $1`,
  [req.user.id]
);
      if (driverResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const driver = driverResult.rows[0];
      if (driver.status !== "approved") {
  return res.status(403).json({
    success: false,
    message: "Your driver account must be approved before accepting rides",
  });
}

      if (!driver.is_online) {
        return res.status(403).json({
          success: false,
          message: "Please go online before accepting a ride",
        });
      }

      // Only one driver can accept a requested ride
      const result = await pool.query(
        `UPDATE public.rides
         SET status = 'accepted',
             driver_id = $2,
             updated_at = NOW()
         WHERE id = $1
           AND status = 'requested'
           AND driver_id IS NULL
         RETURNING *`,
        [id, driver.id]
      );

      if (result.rows.length === 0) {
        return res.status(409).json({
          success: false,
          message: "Ride is unavailable or has already been accepted",
        });
      }

      return res.json({
        success: true,
        message: "Ride accepted successfully",
        ride: result.rows[0],
      });
    } catch (error) {
      console.error("Accept ride error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to accept ride",
      });
    }
  }
);

// =========================
// GET DRIVER DASHBOARD STATS
// =========================
app.get(
  "/api/rides/driver/:driverId",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
    try {
      const driverResult = await pool.query(
        `SELECT id
         FROM public.drivers
         WHERE public_user_id = $1`,
        [req.user.id]
      );

      if (driverResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const driverId = driverResult.rows[0].id;

      const statsResult = await pool.query(
        `SELECT
           COUNT(*)::int AS total_rides,
           COUNT(*) FILTER (
             WHERE status = 'completed'
           )::int AS completed_rides_count,
           COALESCE(
             SUM(
               CASE
                 WHEN status = 'completed'
                 THEN estimated_fare
                 ELSE 0
               END
             ),
             0
           ) AS total_earnings
         FROM public.rides
         WHERE driver_id = $1`,
        [driverId]
      );

      const ridesResult = await pool.query(
        `SELECT *
         FROM public.rides
         WHERE driver_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [driverId]
      );

      return res.json({
        success: true,
        stats: {
          totalRides: statsResult.rows[0].total_rides,
          completedRidesCount:
            statsResult.rows[0].completed_rides_count,
          totalEarnings: Number(
            statsResult.rows[0].total_earnings
          ),
        },
        rides: ridesResult.rows,
      });
    } catch (error) {
      console.error(
        "Driver dashboard stats error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Failed to fetch driver dashboard statistics",
      });
    }
  }
);


// =========================
// GET RIDE STATUS
// =========================

app.get("/api/rides/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        rides.*,
        drivers.license_number,
        drivers.status AS driver_status,
        drivers.rating AS driver_rating,
        profiles.full_name AS driver_name,
        profiles.phone AS driver_phone
      FROM rides
      LEFT JOIN drivers
        ON rides.driver_id = drivers.id
      LEFT JOIN profiles
        ON drivers.user_id = profiles.id
      WHERE rides.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    res.json({
      success: true,
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Get ride status error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch ride status",
      error: error.message,
    });
  }
});



 // =========================
// DECLINE RIDE (Driver)
// =========================

app.patch("/api/rides/:id/decline", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE rides
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'requested'
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or already processed",
      });
    }

    return res.json({
      success: true,
      message: "Ride declined successfully",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Decline ride error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to decline ride",
      error: error.message,
    });
  }
});


// =========================
// CANCEL RIDE (Customer)
// =========================

app.patch("/api/rides/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE rides
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE id = $1
        AND status IN ('requested', 'accepted')
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Ride not found or cannot be cancelled",
      });
    }

    return res.json({
      success: true,
      message: "Ride cancelled successfully",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel ride error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel ride",
      error: error.message,
    });
  }
});

// =========================
// BOOK RIDE
// =========================

app.post("/api/rides", authenticateToken, async (req, res) => {
  try {
    // Step 1: Logged-in user ko database se find karein
    const userResult = await pool.query(
      `SELECT id, email, role
       FROM public.users
       WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account not found. Please login again."
      });
    }

    const user = userResult.rows[0];

    // Step 2: Sirf customer ride book kar sakta hai
    if (user.role !== "customer" || req.user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customer accounts can book rides. Please login as Customer."
      });
    }

    // Step 3: Customer ki actual profile ID find karein
    const profileResult = await pool.query(
      `SELECT id
       FROM public.profiles
       WHERE LOWER(email) = LOWER($1)
         AND role = 'customer'
       LIMIT 1`,
      [user.email]
    );

    if (profileResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Customer profile not found. Please check public.profiles in Supabase."
      });
    }

    const customerId = profileResult.rows[0].id;

    // Step 4: Ride details
    const {
      pickupLocation,
      dropLocation,
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      estimatedFare
    } = req.body;

    if (
      !pickupLocation ||
      !dropLocation ||
      estimatedFare == null ||
      !Number.isFinite(Number(estimatedFare)) ||
      Number(estimatedFare) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid pickup, destination and fare are required."
      });
    }

    // Step 5: Ride save karein
    const result = await pool.query(
      `INSERT INTO public.rides (
        customer_id,
        pickup_location,
        drop_location,
        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng,
        ride_date,
        status,
        estimated_fare,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        NOW(), 'requested', $8, NOW(), NOW()
      )
      RETURNING *`,
      [
        customerId,
        pickupLocation,
        dropLocation,
        pickupLat ?? null,
        pickupLng ?? null,
        dropLat ?? null,
        dropLng ?? null,
        Number(estimatedFare)
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Ride booked successfully",
      ride: result.rows[0]
    });

  } catch (error) {
    console.error("Ride booking error:", error.message);
    console.error("PostgreSQL error code:", error.code);
    console.error("PostgreSQL error detail:", error.detail);

    return res.status(500).json({
      success: false,
      message: "Failed to book ride",
      error: error.message
    });
  }
});


// =========================
// DRIVER ARRIVING
// =========================

app.patch("/api/rides/:id/arriving", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE public.rides
      SET
        status = 'driver_arriving',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'accepted'
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not accepted yet",
      });
    }

    return res.json({
      success: true,
      message: "Driver is arriving",
      ride: result.rows[0],
    });

  } catch (error) {
    console.error("Driver arriving error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update ride status",
      error: error.message,
    });
  }
});

// START RIDE
app.patch("/api/rides/:id/start", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE rides
      SET
        status = 'started',
        updated_at = NOW()
      WHERE id = $1
        AND status = 'driver_arriving'
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or driver is not arriving",
      });
    }

    res.json({
      success: true,
      message: "Ride started successfully",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Start ride error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to start ride",
      error: error.message,
    });
  }
});

// COMPLETE RIDE
app.patch("/api/rides/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE rides
      SET
        status = 'completed',
        final_fare = estimated_fare,
        updated_at = NOW()
      WHERE id = $1
        AND status = 'started'
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or ride has not started",
      });
    }

    res.json({
      success: true,
      message: "Ride completed successfully",
      ride: result.rows[0],
    });
  } catch (error) {
    console.error("Complete ride error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to complete ride",
      error: error.message,
    });
  }
});

// =========================
// GET DRIVER RIDE HISTORY
// =========================
app.get(
  "/api/rides/history",
  authenticateToken,
  authorizeRole("driver"),
  async (req, res) => {
    try {
      const driverResult = await pool.query(
        `SELECT id
         FROM public.drivers
         WHERE public_user_id = $1`,
        [req.user.id]
      );

      if (driverResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Driver profile not found",
        });
      }

      const driverId = driverResult.rows[0].id;

      const result = await pool.query(
        `SELECT
           r.*,
           u.name AS driver_name,
           u.phone AS driver_phone,
           d.license_number,
           d.rating AS driver_rating
         FROM public.rides r
         LEFT JOIN public.drivers d
           ON r.driver_id = d.id
         LEFT JOIN public.users u
           ON d.public_user_id = u.id
         WHERE r.driver_id = $1
           AND r.status IN ('completed', 'cancelled')
         ORDER BY r.updated_at DESC`,
        [driverId]
      );

      return res.json({
        success: true,
        rides: result.rows,
      });
    } catch (error) {
      console.error("Ride history error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch ride history",
      });
    }
  }
);
/* =========================
   PAYMENT API
========================= */

// Create or initialize a payment for a completed ride
app.post("/api/payments", async (req, res) => {
  try {
    const { ride_id, payment_method } = req.body;

    if (!ride_id || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "ride_id and payment_method are required",
      });
    }

    const allowedMethods = ["cash", "online"];

    if (!allowedMethods.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be cash or online",
      });
    }

    // Confirm ride exists and is completed
    const rideResult = await pool.query(
      `SELECT id, status, estimated_fare, final_fare
       FROM rides
       WHERE id = $1`,
      [ride_id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideResult.rows[0];

    if (ride.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment is available only after ride completion",
      });
    }

    const amount = Number(ride.final_fare ?? ride.estimated_fare);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid ride fare",
      });
    }

    // Reuse an existing payment instead of creating duplicates
    const existing = await pool.query(
      `SELECT *
       FROM payments
       WHERE ride_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [ride_id]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: "Payment record already exists",
        payment: existing.rows[0],
      });
    }

    const result = await pool.query(
      `INSERT INTO payments
         (ride_id, amount, payment_method, payment_status, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [ride_id, amount, payment_method, "pending"]
    );

    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      payment: result.rows[0],
    });
  } catch (error) {
  console.error("Create payment error:", error);

  return res.status(500).json({
    success: false,
    message: "Unable to create payment",
    error: error.message,
  });
}
});


// Get payment details for a ride
app.get("/api/payments/:rideId", async (req, res) => {
  try {
    const { rideId } = req.params;

    const result = await pool.query(
      `SELECT *
       FROM payments
       WHERE ride_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [rideId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No payment found for this ride",
      });
    }

    return res.json({
      success: true,
      payment: result.rows[0],
    });
  } catch (error) {
    console.error("Get payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch payment",
    });
  }
});


// Mark a cash payment as paid
app.patch("/api/payments/:rideId/cash-paid", async (req, res) => {
  const client = await pool.connect();

  try {
    const { rideId } = req.params;

    await client.query("BEGIN");

    // Update payments table
    const result = await client.query(
      `UPDATE payments
       SET payment_status = 'paid',
           paid_at = NOW()
       WHERE ride_id = $1
         AND payment_method = 'cash'
         AND payment_status = 'pending'
       RETURNING *`,
      [rideId]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "No pending cash payment found",
      });
    }

    // Update rides table
    const rideResult = await client.query(
      `UPDATE rides
       SET payment_status = 'paid',
           payment_method = 'cash',
           updated_at = NOW()
       WHERE id = $1
         AND status = 'completed'
       RETURNING id`,
      [rideId]
    );

    if (rideResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Ride not found or not completed",
      });
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Cash payment marked as paid",
      payment: result.rows[0],
    });

  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Cash payment update error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update cash payment",
    });

  } finally {
    client.release();
  }
});

// Create a Razorpay order for an online ride payment
app.post("/api/payments/razorpay/order", async (req, res) => {
  try {
    const { ride_id } = req.body;

    if (!ride_id) {
      return res.status(400).json({
        success: false,
        message: "ride_id is required",
      });
    }

    const rideResult = await pool.query(
      `SELECT id, status, estimated_fare, final_fare
       FROM rides
       WHERE id = $1`,
      [ride_id]
    );

    if (rideResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ride not found",
      });
    }

    const ride = rideResult.rows[0];

    if (ride.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Payment is available only after ride completion",
      });
    }

    const amount = Math.round(
      Number(ride.final_fare ?? ride.estimated_fare) * 100
    );

    if (!Number.isSafeInteger(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid ride fare",
      });
    }

    const paymentResult = await pool.query(
      `SELECT *
       FROM payments
       WHERE ride_id = $1
         AND payment_method = 'online'
         AND payment_status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [ride_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Create a pending online payment first",
      });
    }

    const payment = paymentResult.rows[0];

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `ride_${ride_id}`.slice(0, 40),
      notes: {
        ride_id: String(ride_id),
        payment_id: String(payment.id),
      },
    });

    return res.status(201).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create Razorpay order",
    });
  }
});

// Verify Razorpay Payment
app.post("/api/payments/razorpay/verify", async (req, res) => {
  try {
    const {
      ride_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !ride_id ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "All payment verification fields are required",
      });
    }

    // Verify the payment signature using the server-side secret
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Confirm the ride exists and is completed
    const rideResult = await pool.query(
      `SELECT id, status FROM rides WHERE id = $1`,
      [ride_id]
    );

    if (
      rideResult.rows.length === 0 ||
      rideResult.rows[0].status !== "completed"
    ) {
      return res.status(400).json({
        success: false,
        message: "Completed ride not found",
      });
    }

    // Confirm the pending online payment belongs to this ride
    const paymentResult = await pool.query(
      `SELECT *
       FROM payments
       WHERE ride_id = $1
         AND payment_method = 'online'
         AND payment_status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [ride_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Pending online payment not found",
      });
    }

    const payment = paymentResult.rows[0];

    // Verify the order ID and amount against Razorpay's server-side record
    const order = await razorpay.orders.fetch(razorpay_order_id);

    if (
      order.status !== "created" ||
      order.currency !== "INR" ||
      order.amount !==
        Math.round(Number(payment.amount) * 100) ||
      String(order.notes?.ride_id) !== String(ride_id) ||
      String(order.notes?.payment_id) !== String(payment.id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order does not match this payment",
      });
    }

    // Fetch the payment from Razorpay and confirm it was captured
    const razorpayPayment = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    if (
      razorpayPayment.order_id !== razorpay_order_id ||
      razorpayPayment.status !== "captured" ||
      razorpayPayment.currency !== "INR" ||
      razorpayPayment.amount !== order.amount
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment has not been captured or does not match",
      });
    }

    // Mark the payment as paid only after all checks pass
    const updateResult = await pool.query(
      `UPDATE payments
       SET payment_status = 'paid',
           transaction_id = $1,
           paid_at = NOW()
       WHERE id = $2
         AND ride_id = $3
         AND payment_method = 'online'
         AND payment_status = 'pending'
       RETURNING *`,
      [razorpay_payment_id, payment.id, ride_id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Payment was already processed or is no longer pending",
      });
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      payment: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Razorpay verification error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify Razorpay payment",
    });
  }
});

// =========================
// JWT AUTHENTICATION
// =========================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

// =========================
// CUSTOMER SUBMIT DRIVER RATING
// =========================

app.post(
  "/api/rides/:id/rating",
  authenticateToken,
  async (req, res) => {
    try {
      const rideId = req.params.id;
      const customerId = req.user.id;
      const { rating, comment } = req.body;

      // Validate rating
      const stars = Number(rating);

      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5 stars.",
        });
      }

      // Check completed ride and ownership
      const rideResult = await pool.query(
        `SELECT id, customer_id, driver_id, status
         FROM public.rides
         WHERE id = $1`,
        [rideId]
      );

      if (rideResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Ride not found.",
        });
      }

      const ride = rideResult.rows[0];

      if (ride.customer_id !== customerId) {
        return res.status(403).json({
          success: false,
          message: "You cannot rate another customer's ride.",
        });
      }

      if (ride.status !== "completed") {
        return res.status(400).json({
          success: false,
          message: "You can rate only completed rides.",
        });
      }

      if (!ride.driver_id) {
        return res.status(400).json({
          success: false,
          message: "No driver is assigned to this ride.",
        });
      }

      // Save rating in reviews table
      const reviewResult = await pool.query(
        `INSERT INTO public.reviews
          (id, ride_id, reviewer_id, driver_id, rating, comment, created_at)
         VALUES
          (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
         RETURNING id, ride_id, reviewer_id, driver_id, rating, comment, created_at`,
        [
          rideId,
          customerId,
          ride.driver_id,
          stars,
          typeof comment === "string" ? comment.trim().slice(0, 500) || null : null,
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Thank you! Your rating has been submitted.",
        review: reviewResult.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "You have already rated this ride.",
        });
      }

      console.error("Submit rating error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to submit rating.",
      });
    }
  }
);

// =========================
// ROLE AUTHORIZATION
// =========================

function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}




app.listen(PORT, () => {
  console.log(`RideGo Backend running on http://localhost:${PORT}`);
});