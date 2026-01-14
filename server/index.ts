import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Startup migration helper - ensures critical tables exist
async function ensureSchemaMigrations(pool: Pool) {
  console.log("Running schema migrations...");
  try {
    // Ensure pgcrypto extension is available for gen_random_uuid()
    console.log("Ensuring pgcrypto extension...");
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    console.log("pgcrypto extension ready");
    
    // Check if attendance_adjustments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance_adjustments'
      )
    `);
    
    const tableExists = tableCheck.rows[0]?.exists;
    console.log("attendance_adjustments table exists:", tableExists);
    
    if (!tableExists) {
      // Create attendance_adjustments table
      console.log("Creating attendance_adjustments table...");
      await pool.query(`
        CREATE TABLE attendance_adjustments (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id varchar NOT NULL REFERENCES users(id),
          date text NOT NULL,
          adjustment_type text NOT NULL,
          leave_type text,
          regular_hours real,
          ot_hours real,
          notes text,
          created_by varchar NOT NULL REFERENCES users(id),
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        )
      `);
      console.log("attendance_adjustments table created");
    }
    
    // Create unique index on user_id + date (IF NOT EXISTS handles idempotency)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS attendance_adjustments_user_date_unique
      ON attendance_adjustments (user_id, date)
    `);
    console.log("attendance_adjustments unique index ready");
    
    // Also ensure the daily_attendance_summary unique index exists
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS daily_attendance_summary_user_date_unique
      ON daily_attendance_summary (user_id, date)
    `);
    console.log("daily_attendance_summary unique index ready");
    
    log("Schema migrations verified successfully");
  } catch (error: any) {
    // Log detailed error for debugging - this is critical for production
    console.error("=== SCHEMA MIGRATION FAILED ===");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error detail:", error.detail);
    console.error("Full error:", error);
    // Rethrow to make the failure visible
    throw error;
  }
}

const app = express();

// Session configuration - dynamically set secure based on request
// Log environment for debugging
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
  hostname: process.env.REPL_SLUG,
});

// Create PostgreSQL session store for persistent sessions in production
const PgStore = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(
  session({
    store: new PgStore({
      pool: sessionPool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "nexa-hr-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust the X-Forwarded-Proto header from Replit's proxy
    cookie: {
      // secure: 'auto' will automatically use true for HTTPS and false for HTTP
      // This works correctly with Replit's reverse proxy
      secure: 'auto',
      httpOnly: true,
      // 'lax' allows cookies in first-party context (works in new tabs)
      // This is correct for apps accessed directly (not in iframes)
      sameSite: 'lax',
      // Session lasts 24 hours for better user experience
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    },
  })
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
    isViewOnlyAdmin?: boolean;
    isAttendanceViewAdmin?: boolean;
    codeVerifier?: string;
  }
}

// Body size limit for clock-in photos (compressed images are under 500KB typically)
app.use(express.json({
  limit: '5mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run schema migrations before starting the app
  await ensureSchemaMigrations(sessionPool);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
