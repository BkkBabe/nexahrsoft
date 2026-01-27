import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FaviconUpdater } from "@/components/FaviconUpdater";
import { InactivityWrapper } from "@/components/InactivityWrapper";
import Dashboard from "@/pages/Dashboard";
import AttendancePage from "@/pages/AttendancePage";
import LeavePage from "@/pages/LeavePage";
import ClaimsPage from "@/pages/ClaimsPage";
import PayslipPage from "@/pages/PayslipPage";
import IncomeTaxPage from "@/pages/IncomeTaxPage";
import RewardsPage from "@/pages/RewardsPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import HRAdminPage from "@/pages/HRAdminPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import AdminAttendancePage from "@/pages/AdminAttendancePage";
import AdminPayslipPage from "@/pages/AdminPayslipPage";
import AdminLeavePage from "@/pages/AdminLeavePage";
import AdminToolsPage from "@/pages/AdminToolsPage";
import AdminEmailsPage from "@/pages/AdminEmailsPage";
import AdminPayrollImportPage from "@/pages/AdminPayrollImportPage";
import AdminPayrollReportsPage from "@/pages/AdminPayrollReportsPage";
import AdminPayrollLoansPage from "@/pages/AdminPayrollLoansPage";
import AdminPayrollGeneratePage from "@/pages/AdminPayrollGeneratePage";
import AdminPayrollAdjustmentsPage from "@/pages/AdminPayrollAdjustmentsPage";
import AdminEmployeePayrollPage from "@/pages/AdminEmployeePayrollPage";
import AdminEmployeeDataPage from "@/pages/AdminEmployeeDataPage";
import EmployeePayrollPage from "@/pages/EmployeePayrollPage";
import AdminHistoricalPayrollImportPage from "@/pages/AdminHistoricalPayrollImportPage";
import AdminClaimsPage from "@/pages/AdminClaimsPage";
import UserLoginPage from "@/pages/UserLoginPage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import type { CompanySettings } from "@shared/schema";

interface SessionData {
  authenticated: boolean;
  isAdmin?: boolean;
  isViewOnlyAdmin?: boolean;
  isMasterAdmin?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    isApproved?: boolean;
    mustChangePassword?: boolean;
  };
}

function AuthenticatedApp({ session }: { session: SessionData }) {
  const [location, setLocation] = useLocation();

  // Fetch company settings
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
  });

  useEffect(() => {
    // Admin users should not access user dashboard - redirect to admin dashboard
    if (session.authenticated && session.isAdmin) {
      if (!location.startsWith("/admin")) {
        setLocation("/admin/dashboard");
      }
      return;
    }
    
    // Redirect users who must change password
    if (session.authenticated && !session.isAdmin && session.user?.mustChangePassword) {
      if (location !== "/change-password") {
        setLocation("/change-password");
      }
      return;
    }
    
    // Redirect unapproved users to pending approval page
    if (session.authenticated && !session.isAdmin && !session.user?.isApproved) {
      if (location !== "/pending-approval") {
        setLocation("/pending-approval");
      }
      return;
    }
    
    // Redirect authenticated users from root to dashboard
    if (session.authenticated && location === "/" && session.user?.isApproved) {
      setLocation("/dashboard");
    }
  }, [session, location, setLocation]);

  const user = session.user || { name: "User", email: "", id: "" };
  const userRole = session.isAdmin ? ("hr_admin" as const) : ("employee" as const);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          userRole={userRole}
          companyName={companySettings?.companyName || "NexaHR"}
          companyLogo={companySettings?.logoUrl || undefined}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader
            userName={user.name}
            userRole={userRole}
            companyName={companySettings?.companyName || "NexaHR"}
            companyLogo={companySettings?.logoUrl || undefined}
            notificationCount={0}
          />
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </div>
          <main className="flex-1 overflow-auto bg-muted/30">
            <div className="container mx-auto p-6 max-w-7xl">
              <Switch>
                <Route path="/pending-approval" component={PendingApprovalPage} />
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/attendance" component={AttendancePage} />
                <Route path="/leave" component={LeavePage} />
                <Route path="/claims" component={ClaimsPage} />
                <Route path="/payslip" component={PayslipPage} />
                <Route path="/my-payslips" component={EmployeePayrollPage} />
                <Route path="/income-tax" component={IncomeTaxPage} />
                <Route path="/rewards" component={RewardsPage} />
                <Route path="/approvals" component={ApprovalsPage} />
                <Route path="/admin/employees" component={HRAdminPage} />
                <Route path="/admin/payroll" component={HRAdminPage} />
                <Route path="/admin/reports" component={HRAdminPage} />
                <Route component={NotFound} />
              </Switch>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminProtected({ children }: { children: React.ReactNode }) {
  const { data: session, isLoading } = useQuery<SessionData>({
    queryKey: ["/api/auth/session"],
  });
  const [, setLocation] = useLocation();

  // Immediate redirect if not authorized - don't wait for useEffect
  if (!isLoading && (!session?.authenticated || !session?.isAdmin)) {
    setLocation("/admin/login");
    return null; // Don't render anything for unauthorized users
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Double-check authorization before rendering
  if (!session?.authenticated || !session?.isAdmin) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  const { data: session, isLoading } = useQuery<SessionData>({
    queryKey: ["/api/auth/session"],
  });
  
  // Hooks must be called before any conditional returns
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isLoading && !session?.authenticated && location !== "/" && location !== "/admin/login" && !location.startsWith("/admin")) {
      setLocation("/");
    }
  }, [session, location, setLocation, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/dashboard">
        {() => <AdminProtected><AdminDashboardPage /></AdminProtected>}
      </Route>
      <Route path="/admin/settings">
        {() => <AdminProtected><AdminSettingsPage /></AdminProtected>}
      </Route>
      <Route path="/admin/attendance">
        {() => <AdminProtected><AdminAttendancePage /></AdminProtected>}
      </Route>
      <Route path="/admin/payslip">
        {() => <AdminProtected><AdminPayslipPage /></AdminProtected>}
      </Route>
      <Route path="/admin/leave">
        {() => <AdminProtected><AdminLeavePage /></AdminProtected>}
      </Route>
      <Route path="/admin/claims">
        {() => <AdminProtected><AdminClaimsPage /></AdminProtected>}
      </Route>
      <Route path="/admin/reports">
        {() => <AdminProtected><AdminToolsPage /></AdminProtected>}
      </Route>
      <Route path="/admin/emails">
        {() => <AdminProtected><AdminEmailsPage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll/import">
        {() => <AdminProtected><AdminPayrollImportPage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll/reports">
        {() => <AdminProtected><AdminPayrollReportsPage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll/loans">
        {() => <AdminProtected><AdminPayrollLoansPage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll/generate">
        {() => <AdminProtected><AdminPayrollGeneratePage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll/adjustments">
        {() => <AdminProtected><AdminPayrollAdjustmentsPage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll/employees">
        {() => <AdminProtected><AdminEmployeePayrollPage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll">
        {() => <AdminProtected><AdminPayrollReportsPage /></AdminProtected>}
      </Route>
      <Route path="/admin/employee-data">
        {() => <AdminProtected><AdminEmployeeDataPage /></AdminProtected>}
      </Route>
      <Route path="/admin/payroll/historical-import">
        {() => <AdminProtected><AdminHistoricalPayrollImportPage /></AdminProtected>}
      </Route>
      <Route path="/admin/:rest*">
        {() => {
          window.location.href = "/admin/dashboard";
          return null;
        }}
      </Route>
      <Route path="/change-password">
        {() => session?.authenticated ? <ChangePasswordPage /> : <UserLoginPage />}
      </Route>
      {session?.authenticated ? (
        <Route>
          {() => <AuthenticatedApp session={session} />}
        </Route>
      ) : (
        <>
          <Route path="/" component={UserLoginPage} />
          <Route component={UserLoginPage} />
        </>
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <FaviconUpdater />
          <InactivityWrapper>
            <Router />
          </InactivityWrapper>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
