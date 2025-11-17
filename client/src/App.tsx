import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import NotFound from "@/pages/not-found";

//todo: remove mock functionality - this will be replaced with real user data from authentication
const mockUser = {
  name: "Faith Jr. Negapatan",
  role: "hr_admin" as const,
  company: "3SI PTE. LTD.",
  notificationCount: 5,
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
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
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar userRole={mockUser.role} />
              <div className="flex flex-col flex-1 overflow-hidden">
                <AppHeader
                  userName={mockUser.name}
                  userRole={mockUser.role}
                  companyName={mockUser.company}
                  notificationCount={mockUser.notificationCount}
                />
                <div className="flex items-center gap-2 px-4 py-2 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </div>
                <main className="flex-1 overflow-auto">
                  <div className="container mx-auto p-6 max-w-7xl">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
