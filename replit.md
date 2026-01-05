# NexaHR HRMS Platform

## Overview

NexaHR is a cloud-native, all-in-one Human Resource Management System (HRMS) designed for enterprise use. It provides comprehensive HR functionality including time & attendance tracking, leave management, claims processing, payroll, and employee self-service. The MVP focuses on core HR functions with mobile attendance tracking, web-based administration, and role-based access control. The platform aims for an enterprise dashboard approach with Material Design inspiration, prioritizing data clarity, efficient workflows, and professional aesthetics for HR administrators, managers, and employees.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework & Tooling**: React 18+ with TypeScript, Vite, Wouter for routing, TanStack Query for server state.
- **UI Component System**: shadcn/ui built on Radix UI, Tailwind CSS for styling, CSS variables for theming, responsive design with a mobile-first approach.
- **State Management**: Session-based authentication, React Query for async server state, React Context for theme.
- **Design System**: Inter/Roboto typography, Tailwind spacing, 12-column grid, custom HSL-based color system.

### Backend Architecture

- **Server Framework**: Express.js with TypeScript, express-session for session management, RESTful API design.
- **Authentication & Authorization**: Dual admin system (master admin hardcoded + database users with role='admin' or role='viewonly_admin'), user bcrypt-hashed passwords, session-based with secure HTTP-only cookies, role-based access control (admin/viewonly_admin vs. user), security model ensures sessions only for approved users, user approval workflow for new registrations, forced password change on first login via mustChangePassword flag. Admin users have exclusive admin-only access (cannot log in via employee login), and regular users cannot log in via admin login. View-only admins can view all data but cannot edit, delete, or send emails (enforced by requireWriteAccess middleware and UI disabling).
- **Data Layer**: Drizzle ORM for type-safe queries, Zod validation, PostgreSQL-backed storage (PgStorage) via Neon serverless database.
- **API Structure**: `/api/admin/*`, `/api/auth/*` following RESTful conventions with Zod schema validation.

### Database Schema

- **Users Table**: Stores all user information (id, email, username, name, password_hash, mobile_number, auth_id, role, is_approved, created_at, employeeCode, department, designation, section, joinDate, supervisorId, isOnProbation, hasEmailSent, mustChangePassword). Supports both password-based and OAuth, with approval-based access control, forced password change on first login, and full HR metadata.
- **Company Settings Table**: Stores company branding, email settings, and timezone configuration (company_name, company_address, company_uen, logo_url, favicon_url, senderEmail, senderName, appUrl, defaultTimezone, updated_at). Singleton pattern ensures one record.
- **Payroll Loan Accounts Table**: Stores employee loans with fields: userId, loanType, description, principalAmount, outstandingBalance, monthlyRepayment, startDate, endDate, status. Supports COMPANY_LOAN, STUDY_LOAN, HOUSING_LOAN types.
- **Payroll Loan Repayments Table**: Tracks individual repayments with payrollPeriod, amount, notes, and recordedBy references.
- **Attendance Records Table**: Stores clock-in/out times, user ID, date, calculated hours, location data, and photo metadata.
- **Daily Attendance Summary Table**: Pre-calculated daily attendance summaries for improved heatmap performance with fields: date, userId, employeeCode, employeeName, department, totalClockIns, totalHoursWorked, firstClockIn, lastClockOut, status (present/absent/partial). Uses unique constraint on (user_id, date) with atomic upserts to prevent duplicates.
- **Extensibility**: Designed to easily accommodate future tables for leave, claims, payroll, etc.

### Admin Features (MVP)

- **Admin Attendance Page**: Comprehensive attendance tracking with:
  - Clock-ins view with date picker for viewing any date (not just today)
  - Clock-in/out location display with Google Maps links in tooltips
  - **Orphaned Sessions view**: Identifies clock-ins older than 24 hours without clock-out, with individual and bulk close functionality to allow affected employees to clock in again
  - Heatmap view with week/month toggle (default: week view)
    - **Week view**: Uses raw attendance records for reliable, real-time data
      - Supports custom date range selection (1-7 days) via date pickers
      - Navigation arrows move by the selected range length
    - **Month view**: Uses pre-calculated summaries only (prevents query timeouts on large datasets)
    - **Refresh Data button**: Regenerates summaries from raw records for the current month (visible in month view only)
  - Attendance details view with audit logging
  - Department and employee filtering
  - **Strict attendance cycle enforcement**: Employees must clock out before clocking in again (prevents duplicate sessions)
  
- **Admin Reports Page**: Generate and export attendance and employee reports with:
  - Date range filtering for attendance data
  - Print functionality for physical records
  - CSV export for spreadsheet analysis
  - Summary statistics (total employees, attendance records, hours worked)
  
- **Admin Email Onboarding System**: Send welcome emails to employees with:
  - Batch email sending to multiple selected employees
  - Individual resend capability with password regeneration
  - QR code linking to app URL (https://app.nexahrms.com/)
  - Username and initial password distribution
  - Email settings configuration (sender email, sender name, app URL)
  
- **Admin Settings**: Configure system-wide settings including:
  - Company branding (logo, favicon, name, address, UEN)
  - Email sender configuration for welcome messages
  - Timezone settings for attendance calculations (default: Asia/Singapore)
  - QR code preview for verification
  - Admin Users Management: Promote employees to admin role, view/remove admin users
  - Admin users can log in via Admin Login page using their username/password
  - **Master Admin Password Management**: The master admin (nexaadmin) can change passwords for other admin users. Changed users will be required to update their password on next login.

- **Admin Payroll Management**: Comprehensive payroll functionality including:
  - **Payroll Import**: Import payroll data from CSV files with comprehensive field mapping
  - **Payroll Reports**: View and export payroll records by year/month with search by employee name/code
  - **Editable Payslips**: Admin can edit any payslip component with full audit trail (field changes tracked with old/new values and reasons)
  - **Loan Management**: Create and manage employee loans (Company, Study, Housing types) with repayment tracking
  - **Payslip View**: Structured 10-section payslip display (A-J) following Singapore CPF regulations with:
    - Company logo and branding from settings
    - Zero-value fields automatically hidden for cleaner display
    - Employee/Employer view toggle: Employee view hides employer contributions; Employer view shows full cost to company
    - Section A: Employee Information
    - Section B: Basic Earnings (Basic Salary, Monthly Variables)
    - Section C: Overtime & Shift Allowances
    - Section D: Allowances with CPF (Mobile, Transport, Leave Encashment, Service Call)
    - Section E: Allowances without CPF (Other, House Rental)
    - Section F: Bonus & Additional Payments
    - Section G: Employee CPF Contribution
    - Section H: Deductions (Loans, No Pay Day, Community Contributions - CDAC, MBMF, SINDA, ECF, CC)
    - Section I: Employer Contributions (Employer CPF, SDF, FWL) - visible only in Employer view
    - Section J: Payment Summary with Net Pay and Total Cost to Company
  - **Payroll Audit Logs Table**: Tracks all payslip edits (recordId, fieldName, oldValue, newValue, changedBy, reason, timestamp)

### Key Architectural Patterns

- **Separation of Concerns**: `client/`, `server/`, `shared/` directories with clear boundaries and typed API contracts.
- **Type Safety**: End-to-end TypeScript, shared schema definitions, Zod for runtime validation, Drizzle for type-safe DB operations.
- **Development Workflow**: Vite for HMR, separate build processes, path aliases.
- **Security Considerations**: HTTP-only session cookies, CSRF protection readiness, environment-based configuration, secure cookie settings in production.

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL client for Neon.
- **drizzle-orm** & **drizzle-kit**: ORM and migration tooling.
- **express** & **express-session**: Server framework and session management.
- **connect-pg-simple**: PostgreSQL session store.
- **ws**: WebSocket support for Neon.

### Frontend UI Libraries
- **@radix-ui/react-***: Accessible UI primitives.
- **@tanstack/react-query**: Async state management.
- **wouter**: Lightweight routing.
- **tailwindcss**: Utility-first CSS.
- **class-variance-authority** & **clsx**: Class name utilities.
- **lucide-react**: Icon library.
- **date-fns**: Date manipulation.

### Development Tools
- **Vite**: Build tool.
- **TypeScript**: Type system.
- **@replit/vite-plugin-***: Replit-specific tooling.

### Form & Validation
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Validation resolver.
- **zod**: Schema validation.
- **drizzle-zod**: Zod schema generation from Drizzle.

### Database
- **PostgreSQL** (via Neon): Primary serverless database with connection pooling.
- **OpenStreetMap Nominatim API**: Used for reverse geocoding in attendance features.