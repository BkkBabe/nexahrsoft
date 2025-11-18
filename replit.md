# NexaHR HRMS Platform

## Overview

NexaHR is a cloud-native, all-in-one Human Resource Management System (HRMS) designed for enterprise use. The platform provides comprehensive HR functionality including time & attendance tracking, leave management, claims processing, payroll, and employee self-service capabilities. The MVP focuses on core HR functions with mobile attendance tracking, web-based administration, and role-based access control.

The application follows a Material Design-inspired enterprise dashboard approach, prioritizing data clarity, efficient workflows, and professional aesthetics suitable for business users across HR administrators, line managers, and employees.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 18, 2025 - Attendance Management System
- **Mobile Dashboard Layout**:
  - Updated dashboard grid to 3 columns (grid-cols-3) for mobile-optimized 2 rows x 3 columns layout on iPhone 13
  - MenuCard component responsive design with smaller padding (p-3 vs p-6) and icons (w-10 h-10 vs w-16 h-16) on mobile
  - Menu items: Attendance, Leave, Claims, Payslip, Income Tax, Rewards
- **Database Schema - Attendance**:
  - Created attendanceRecords table with id, userId (foreign key), date, clockInTime, clockOutTime, createdAt
  - Added attendanceBufferMinutes field to companySettings table (default: 15 minutes)
  - Proper insert/select schemas with Zod validation
- **Storage Layer - Attendance CRUD**:
  - clockIn(): Creates attendance record for current day
  - clockOut(): Updates existing record with clock out time
  - getTodayAttendance(): Fetches current day's attendance for user
  - getAttendanceRecordsByUserAndDateRange(): Retrieves records with date range filtering
  - getAllAttendanceRecordsByDateRange(): Admin function to fetch all users' attendance
  - updateAttendanceBufferMinutes(): Updates company buffer setting
- **API Endpoints - User Attendance**:
  - POST /api/attendance/clock-in - Clock in with buffer validation
  - POST /api/attendance/clock-out - Clock out with automatic hours calculation
  - GET /api/attendance/today - Get today's attendance record
  - GET /api/attendance/records?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - Fetch attendance history
- **API Endpoints - Admin**:
  - GET /api/admin/attendance/records?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD - View all users' attendance
  - PUT /api/admin/attendance/buffer - Update attendance buffer minutes
- **User Attendance Page (/attendance)**:
  - Clock in/out buttons with real-time status tracking
  - Today's attendance display with clock in/out times
  - Hours calculation rounded to nearest 0.5 hour
  - Daily/weekly/monthly attendance history with period filters
  - Responsive table with date, clock in/out times, and total hours
- **Admin Settings Page - Buffer Configuration**:
  - Attendance buffer minutes setting with validation
  - Form with save functionality and success/error toasts
  - Loading states during updates
- **Admin Attendance Reports Page (/admin/attendance)**:
  - Overview card with total users, records, active users, and selected period
  - Daily/weekly/monthly tabs for period filtering
  - User attendance details with expandable records
  - Total hours per user calculated to 0.5 hour precision
  - Individual day breakdowns with date, clock in/out times, hours worked
- **Hours Calculation**:
  - Consistent calculation function across all components
  - Formula: (clockOutTime - clockInTime) in hours
  - Rounding: Math.round(hours * 2) / 2 for nearest 0.5 hour
  - Displayed as X.X hrs format (e.g., 8.5 hrs, 7.0 hrs)
- **Routing**:
  - Added /admin/attendance route with AdminProtected wrapper
  - Proper integration in App.tsx routing structure
- **Bug Fixes**:
  - Fixed query parameter serialization in queryClient.ts to properly handle parameterized query keys
  - Updated query invalidations to use exact: false for matching parameterized queries
  - Resolved issue where weekly/monthly attendance records weren't displaying after clock in/out

### November 17, 2025 - Logo/Favicon Upload & Database Migration
- **Company Branding System**:
  - Admin settings page (/admin/settings) for uploading company logo and favicon
  - Replit Object Storage integration (Google Cloud Storage backend) for public asset storage
  - Presigned URL workflow for direct-to-storage uploads with client-side validation
  - File validation: max 5MB for logos, 1MB for favicons; image types only
  - Logo displays across app: login page, header, sidebar, dynamic favicon updates
- **Database Migration**:
  - **Switched from MemStorage to PostgreSQL (PgStorage)** for persistent data storage
  - company_settings table: stores companyName, logoUrl, faviconUrl
  - All user data and settings now persist across server restarts
  - Default settings automatically created on first access
- **Security Hardening**:
  - Admin-only API endpoints with req.session.isAdmin verification
  - Non-admin users receive 403 Forbidden for upload/update operations
  - AdminProtected component prevents client-side access to admin routes
  - Verified via end-to-end security testing

### November 17, 2025 - Authentication & Deployment Fixes
- **Schema Updates**: Added username, passwordHash, and mobileNumber fields to users table
- **Registration System**: 
  - Comprehensive registration form with Full Name, Username, Email, Mobile Number, Password, Confirm Password
  - Password validation (minimum 8 characters) and matching confirmation
  - Bcrypt password hashing (10 rounds) for secure storage
  - Zod schema validation for all input fields
- **Login System**:
  - Login accepts either username or email as identifier
  - Password verification using bcrypt.compare()
  - Returns 401 for invalid credentials, 403 for unapproved accounts
  - **Fixed**: Login redirect now uses window.location.href to avoid race conditions
- **Security Implementation**:
  - Fixed critical vulnerability: Sessions only created for approved users
  - Unapproved users cannot access protected routes
  - Registration does not create session for pending accounts
  - Login checks approval status BEFORE creating session
  - **Fixed**: Secure cookies now properly enabled for published apps (REPLIT_DEPLOYMENT check)
- **Session Management**:
  - Cookie configuration: `sameSite: 'lax'`, `httpOnly: true`, `secure: true` in production
  - Logout properly invalidates session cache before redirecting
  - Session cookies work correctly in published deployments
- **Default User Seeding**: nexauser/nexa123! (pre-approved) automatically created on server startup
- **Storage Layer**: Added getUserByUsername() and getUserByEmailOrUsername() methods

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and API caching

**UI Component System:**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- CSS variables-based theming system supporting light/dark modes
- Responsive design with mobile-first approach (breakpoints: mobile, md: tablet, lg: desktop)

**State Management:**
- Session-based authentication state managed via API queries
- React Query for async server state
- React Context for theme preferences (ThemeProvider)
- Local component state for UI interactions

**Design System:**
- Typography: Inter/Roboto font stack with systematic size hierarchy
- Spacing: Tailwind primitives (2, 4, 6, 8, 12, 16 units)
- Grid system: 12-column layout with 4-column sidebar, 8-column main content
- Custom color system with HSL-based palette supporting semantic tokens

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- Session-based authentication using express-session
- RESTful API design pattern
- Middleware stack for request logging, JSON parsing, and session management

**Authentication & Authorization:**
- Dual authentication system:
  - Admin login: Hardcoded credentials (nexaadmin/nexa123!) for administrative access
  - User authentication: Username/email + password with bcrypt hashing (10 rounds)
- Session-based state management with secure HTTP-only cookies
- Role-based access control (admin vs. user roles)
- **Security Model**: Sessions only created for approved users
  - New registrations: No session until admin approval
  - Login attempts: Approval check before session creation (returns 403 for unapproved)
  - Prevents unapproved users from accessing protected routes
- User approval workflow where new registrations require admin confirmation
- Default test user: nexauser/nexa123! (pre-approved, seeded on startup)

**Data Layer:**
- Drizzle ORM for type-safe database queries
- Schema-first approach with Zod validation
- PostgreSQL-backed storage (PgStorage) for persistent data across restarts
- Neon serverless PostgreSQL database with connection pooling

**API Structure:**
- `/api/admin/*` - Admin authentication and user management endpoints
- `/api/auth/*` - User authentication and session management
- RESTful conventions with proper HTTP status codes
- Request validation using Zod schemas

### Database Schema

**Users Table:**
- Primary entity for all system users (admin, managers, employees)
- Fields:
  - id (varchar, UUID via gen_random_uuid())
  - email (text, unique, required)
  - username (text, unique, nullable) - For password-based login
  - name (text, required) - Full name
  - password_hash (text, nullable) - Bcrypt hashed password (10 rounds)
  - mobile_number (text, nullable) - User's mobile phone
  - auth_id (text, unique, nullable) - For OAuth integration (Replit Auth)
  - role (text, default: 'user') - Role-based access control
  - is_approved (boolean, default: false) - Admin approval flag
  - created_at (timestamp, default: now())
- Support for both password-based and OAuth authentication
- Approval-based access control: new registrations default to unapproved state

**Company Settings Table:**
- Stores company branding and configuration
- Fields:
  - id (varchar, UUID via gen_random_uuid())
  - company_name (text, nullable) - Organization name
  - logo_url (text, nullable) - Public URL to company logo in object storage
  - favicon_url (text, nullable) - Public URL to favicon in object storage
  - updated_at (timestamp, default: now())
- Singleton pattern: only one settings record exists
- Default settings created automatically on first access

**Current State:**
- Two-table schema: users and company_settings
- All data persists in PostgreSQL database
- Extensible design anticipating additional tables for:
  - Attendance records
  - Leave requests
  - Claims submissions
  - Payroll data
  - Employee profiles and organizational structure

### Key Architectural Patterns

**Separation of Concerns:**
- `client/` - Frontend React application
- `server/` - Backend Express API
- `shared/` - Shared TypeScript types and schemas (Drizzle schema, validation)
- Clear boundary between client and server with typed API contracts

**Type Safety:**
- End-to-end TypeScript with strict mode enabled
- Shared schema definitions between frontend and backend
- Zod schemas for runtime validation
- Drizzle ORM for type-safe database operations

**Development Workflow:**
- Hot module replacement (HMR) via Vite in development
- Separate build processes for client (Vite) and server (esbuild)
- Path aliases for clean imports (@/, @shared/, @assets/)

**Security Considerations:**
- HTTP-only session cookies
- CSRF protection readiness (session configuration)
- Environment-based configuration (production vs. development)
- Secure cookie settings in production mode

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless** - PostgreSQL serverless client for Neon database
- **drizzle-orm** & **drizzle-kit** - Type-safe ORM and migration tooling
- **express** & **express-session** - Server framework and session management
- **connect-pg-simple** - PostgreSQL session store for express-session
- **ws** - WebSocket support for Neon serverless connections

### Frontend UI Libraries
- **@radix-ui/react-*** - Comprehensive suite of accessible, unstyled UI primitives (accordion, dialog, dropdown, popover, toast, etc.)
- **@tanstack/react-query** - Async state management and data fetching
- **wouter** - Lightweight routing library
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** & **clsx** - Dynamic class name utilities
- **lucide-react** - Icon library
- **date-fns** - Date manipulation utilities

### Development Tools
- **Vite** - Build tool and development server with React plugin
- **TypeScript** - Type system and compiler
- **@replit/vite-plugin-*** - Replit-specific development tooling (error overlay, cartographer, dev banner)

### Form & Validation
- **react-hook-form** - Form state management
- **@hookform/resolvers** - Validation resolver for react-hook-form
- **zod** - Schema validation library
- **drizzle-zod** - Zod schema generation from Drizzle schemas

### Planned Integrations
- Replit Auth (OAuth authentication) - Infrastructure present via authId field
- Accounting system integration - Mentioned in project requirements for Phase 2
- Geolocation services - For mobile attendance tracking with location verification
- Photo capture APIs - For attendance verification

### Database
- **PostgreSQL** (via Neon) - Primary database with serverless architecture
- Connection pooling via @neondatabase/serverless Pool
- Migration support through Drizzle Kit