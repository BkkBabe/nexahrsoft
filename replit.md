# NexaHR HRMS Platform

## Overview

NexaHR is a cloud-native, all-in-one Human Resource Management System (HRMS) for enterprises. It provides core HR functionalities like time & attendance, leave management, claims processing, payroll, and employee self-service. The platform prioritizes data clarity, efficient workflows, and a professional aesthetic, drawing inspiration from Material Design for its enterprise dashboard approach. The MVP focuses on mobile attendance tracking, web-based administration, and robust role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18+ with TypeScript, Vite, Wouter for routing, and TanStack Query for server state.
- **UI/UX**: shadcn/ui built on Radix UI, Tailwind CSS for styling, CSS variables for theming, responsive design with a mobile-first approach. Uses Inter/Roboto typography, Tailwind spacing, and a 12-column grid with a custom HSL-based color system.
- **State Management**: Session-based authentication, React Query for asynchronous server state, and React Context for theme management.

### Backend Architecture

- **Server**: Express.js with TypeScript, using `express-session` for session management and a RESTful API design.
- **Authentication & Authorization**: Dual admin system (master admin + database users with 'admin'/'viewonly_admin' roles). Session-based authentication with secure HTTP-only cookies, bcrypt-hashed passwords, and role-based access control. Features include user approval workflow, forced password change on first login, and distinct login paths for admins and employees. Super admin roles have specific privileges (e.g., archiving employees).
- **Data Layer**: Drizzle ORM for type-safe queries and Zod for validation, backed by PostgreSQL (Neon serverless database). Monetary fields are stored as `numeric(12,2)` and processed with helper functions for precision.
- **API Structure**: RESTful conventions with Zod schema validation for `/api/admin/*` and `/api/auth/*` endpoints.

### Database Schema

- **Core Tables**: `Users` (employee info, auth, HR metadata), `Company Settings` (singleton for branding, email, timezone), `Payroll Loan Accounts`, `Payroll Loan Repayments`, `Attendance Records`, `Daily Attendance Summary` (pre-calculated for performance), `Attendance Adjustments` (for overrides).
- **Extensibility**: Designed to easily accommodate future HR modules.

### Key Features

- **Admin Attendance**: Comprehensive view of clock-ins/outs, location data, orphaned session management, heatmap view (week/month with export/print), department/employee filtering, and strict clock-in/out cycle enforcement. Supports archiving/unarchiving employees (super admin only). **Attendance Adjustments**: Admin can add leave types (AL, MC, ML, CL, OIL) or hours overrides to any date via heatmap cell tooltip. Leave counts as 9 regular hours for payroll; explicit OT hours are added to calculated OT. Adjustments supersede actual clock-in data for payroll calculations.
- **Admin Reports**: Generation and export of attendance and employee reports with date filtering and summary statistics.
- **Admin Email Onboarding**: Batch and individual welcome email sending with password generation and QR codes for app access.
- **Admin Settings**: Configuration for company branding, email sender, timezone, orphaned session toggle, and admin user management (including master admin password changes).
- **Admin Payroll Management**:
    - **Employee Payroll Settings**: Configuration of individual employee profiles including residency status, DOB, salary, and recurring salary adjustments with full CRUD and audit trails.
    - **Payroll Generation**: Automatic payroll generation from attendance records, supporting CPF calculations (Singapore-specific), overtime, and various pay types. Features idempotency checks and handles special cases for CPF.
    - **Payroll Import**: CSV-based payroll data import with field mapping.
    - **Payroll Reports**: Viewing and exporting payroll records by period, with search functionality.
    - **Editable Payslips**: Admins can edit any payslip component with full audit logging.
    - **Loan Management**: Creation and tracking of employee loans and repayments.
    - **Payroll Adjustments**: Admin-controlled adjustments for various payroll components (OT, leave, deductions, bonuses) with workflow and audit logging.
    - **Running Payroll Summary**: Real-time earnings calculation integrating attendance data with manual adjustments.
    - **Payslip View**: Structured 10-section payslip displaying employee earnings, deductions, and contributions compliant with Singapore CPF regulations, with employee/employer view toggle.
    - **Payroll Audit Logs**: Detailed logs for all payslip edits.

### Architectural Patterns

- **Separation of Concerns**: Clear `client/`, `server/`, `shared/` directories.
- **Type Safety**: End-to-end TypeScript, shared schemas, Zod for runtime validation, Drizzle for DB operations.
- **Security**: HTTP-only session cookies, environment-based configuration, and secure cookie settings.

## External Dependencies

- **Database**: PostgreSQL (via Neon)
- **ORM**: Drizzle ORM, Drizzle-kit
- **Server Framework**: Express.js, express-session, connect-pg-simple
- **Real-time Communication**: ws
- **Frontend UI**: @radix-ui/react-*, shadcn/ui, Tailwind CSS, class-variance-authority, clsx, lucide-react
- **Data Fetching**: @tanstack/react-query
- **Routing**: wouter
- **Date Utilities**: date-fns
- **Form Management**: react-hook-form, @hookform/resolvers
- **Validation**: zod, drizzle-zod
- **Build Tool**: Vite
- **Mapping/Geocoding**: OpenStreetMap Nominatim API