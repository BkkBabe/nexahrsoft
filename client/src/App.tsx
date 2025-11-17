import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/AppHeader";
import { ThemeProvider } from "@/components/ThemeProvider";
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
import UserLoginPage from "@/pages/UserLoginPage";
import PendingApprovalPage from "@/pages/PendingApprovalPage";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

interface SessionData {
  authenticated: boolean;
  isAdmin?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    isApproved?: boolean;
  };
}

function AuthenticatedApp({ session }: { session: SessionData }) {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Redirect unapproved users to pending approval page
    if (session.authenticated && !session.isAdmin && !session.user?.isApproved) {
      if (location !== "/pending-approval") {
        setLocation("/pending-approval");
      }
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
        <AppSidebar userRole={userRole} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader
            userName={user.name}
            userRole={userRole}
            companyName="NexaHR"
            notificationCount={0}
          />
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </div>
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 max-w-7xl">
              <Switch>
                <Route path="/pending-approval" component={PendingApprovalPage} />
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/attendance" component={AttendancePage} />
                <Route path="/leave" component={LeavePage} />
                <Route path="/claims" component={ClaimsPage} />
                <Route path="/payslip" component={PayslipPage} />
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

function AdminDashboardProtected() {
  const { data: session, isLoading } = useQuery<SessionData>({
    queryKey: ["/api/auth/session"],
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!session?.authenticated || !session?.isAdmin)) {
      setLocation("/admin/login");
    }
  }, [session, isLoading, setLocation]);

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

  if (!session?.authenticated || !session?.isAdmin) {
    return null;
  }

  return <AdminDashboardPage />;
}

function Router() {
  const { data: session, isLoading } = useQuery<SessionData>({
    queryKey: ["/api/auth/session"],
  });

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
        {() => <AdminDashboardProtected />}
      </Route>
      {session?.authenticated ? (
        <Route>
          {() => <AuthenticatedApp session={session} />}
        </Route>
      ) : (
        <Route component={UserLoginPage} />
      )}
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Router />
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
