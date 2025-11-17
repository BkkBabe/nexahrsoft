# NexaHR HRMS - Design Guidelines

## Design Approach

**Selected System**: Material Design-inspired enterprise dashboard with emphasis on data clarity and efficient workflows.

**Rationale**: HRMS platforms are utility-focused, information-dense applications where efficiency and learnability are paramount. The design prioritizes functional excellence, clear data presentation, and streamlined task completion over visual experimentation.

**Key Principles**:
- Information hierarchy over decoration
- Consistent, predictable patterns for faster user adoption
- Data density without clutter
- Professional, trustworthy aesthetic for enterprise users

---

## Typography

**Font Stack**: 
- Primary: Inter or Roboto via Google Fonts CDN
- Monospace: Roboto Mono for data/numbers (attendance times, payroll figures)

**Hierarchy**:
- Page Titles: text-3xl font-semibold (32px)
- Section Headers: text-xl font-semibold (20px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base (16px)
- Labels/Metadata: text-sm font-medium (14px)
- Helper Text: text-xs (12px)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, gap-6, mb-8, py-12)

**Grid Structure**:
- Dashboard: 12-column grid with 4-column sidebar (lg:col-span-3), 8-column main (lg:col-span-9)
- Card Layouts: gap-6 for standard spacing, gap-4 for tight groupings
- Container: max-w-7xl mx-auto for main content areas
- Form Layouts: max-w-2xl for focused input experiences

**Responsive Breakpoints**:
- Mobile: Single column, collapsible sidebar
- Tablet (md:): 2-column layouts for data cards
- Desktop (lg:): Full multi-column dashboard with persistent sidebar

---

## Component Library

### Navigation & Shell

**Top Navigation Bar**:
- Fixed header with logo (left), breadcrumbs (center), user profile + notifications (right)
- Height: h-16, shadow-sm for subtle elevation
- Search bar integrated for larger screens

**Sidebar Navigation**:
- Persistent on desktop, collapsible drawer on mobile
- Icon + label format using Heroicons
- Grouped sections: Dashboard, Attendance, Leave, Claims, Payroll, Employee Data, Reports
- Active state: Subtle left border indicator + slight background treatment

### Dashboard Components

**Stat Cards** (4-column grid on desktop):
- Icon (Heroicons outline) in corner
- Large number (text-3xl font-bold)
- Label (text-sm)
- Trend indicator where applicable
- Padding: p-6, rounded-lg, shadow-sm

**Data Tables**:
- Sticky header row with sortable columns
- Row hover states for interactivity
- Pagination footer (10/25/50 items per page)
- Action buttons (icon-only) in rightmost column
- Alternating row subtle background for readability
- Mobile: Card-based view with key fields only

**Activity Timeline**:
- Vertical timeline with icons
- Timestamp (text-xs) + event description
- Used for attendance history, approval workflows

### Forms & Inputs

**Form Fields**:
- Label above input (text-sm font-medium mb-2)
- Input height: h-10 for text inputs, h-12 for select dropdowns
- Border-radius: rounded-md
- Focus states: Ring treatment (ring-2)
- Error states: Red border + error message below (text-sm)
- Helper text: text-xs below field

**Buttons**:
- Primary CTA: px-6 py-2.5 rounded-md font-medium
- Secondary: Outline variant
- Icon buttons: Square (w-10 h-10) for actions
- Disabled state: opacity-50 cursor-not-allowed

**File Upload** (for claims receipts, profile photos):
- Drag-and-drop zone with dashed border
- Preview thumbnail for uploaded images
- File size/type constraints shown

### Mobile Attendance Components

**Clock-In/Out Interface**:
- Large centered action button (w-32 h-32, rounded-full)
- Photo capture with circular preview frame
- Location display with map icon
- Timestamp shown prominently (text-2xl font-bold)
- Status badge (Clocked In/Out)

**Camera Integration**:
- Full-screen overlay for photo capture
- Capture button bottom-center
- Retake/Confirm options after capture

### Data Visualization

**Leave Balance Display**:
- Horizontal bar charts showing used/remaining days
- Leave type cards in grid (Annual, Sick, etc.)
- Percentage indicator

**Payroll Summary**:
- Breakdown table: Earnings (green accent) vs Deductions (red accent)
- Net pay highlighted prominently (text-2xl font-bold)
- Download payslip button (PDF icon)

### Manager Approval Dashboard

**Approval Queue Cards**:
- Employee photo thumbnail (left)
- Request details (center): Type, dates, reason
- Quick actions (right): Approve/Reject buttons
- Badge for request type (Leave/Claim)
- Timestamp for submission

---

## Animations

**Minimal Animation Strategy**:
- Sidebar transitions: Smooth slide-in/out (300ms)
- Modal overlays: Fade + scale entrance
- Button states: Subtle hover lift (translate-y-0.5)
- Data loading: Skeleton screens instead of spinners
- No scroll-triggered animations
- Page transitions: Simple fade between routes

---

## Accessibility

**Consistent Implementation**:
- All form inputs have associated labels (for + id)
- Button text or aria-label on icon-only buttons
- Focus indicators visible (ring treatment)
- Table headers with scope attributes
- ARIA landmarks for main regions (navigation, main, complementary)
- Color contrast minimum 4.5:1 for body text
- Touch targets minimum 44x44px on mobile

---

## Images

**Profile Photos**:
- Circular avatars throughout (w-8 h-8 for small, w-12 h-12 for cards, w-24 h-24 for profiles)
- Placeholder: Initials on solid background for missing photos

**Attendance Check-In Photos**:
- Circular frame during capture
- Square thumbnail in history (w-16 h-16, rounded-md)

**Empty States**:
- Illustrations for empty data tables, no pending approvals
- Centered with helpful text + primary action button

**Icons**: Heroicons (outline for navigation, solid for status indicators)

**No Hero Images**: This is a dashboard application - focus on data presentation rather than marketing imagery.