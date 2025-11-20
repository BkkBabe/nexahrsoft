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
- **Authentication & Authorization**: Dual system (admin hardcoded, user bcrypt-hashed password), session-based with secure HTTP-only cookies, role-based access control (admin vs. user), security model ensures sessions only for approved users, user approval workflow for new registrations.
- **Data Layer**: Drizzle ORM for type-safe queries, Zod validation, PostgreSQL-backed storage (PgStorage) via Neon serverless database.
- **API Structure**: `/api/admin/*`, `/api/auth/*` following RESTful conventions with Zod schema validation.

### Database Schema

- **Users Table**: Stores all user information (id, email, username, name, password_hash, mobile_number, auth_id, role, is_approved, created_at). Supports both password-based and OAuth, with approval-based access control.
- **Company Settings Table**: Stores company branding (company_name, logo_url, favicon_url, updated_at). Singleton pattern ensures one record.
- **Attendance Records Table**: Stores clock-in/out times, user ID, date, and calculated hours.
- **Extensibility**: Designed to easily accommodate future tables for leave, claims, payroll, etc.

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