import {
  Home,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  Users,
  BarChart3,
  CheckSquare,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

interface AppSidebarProps {
  userRole: "employee" | "manager" | "hr_admin";
  companyName?: string;
  companyLogo?: string;
}

export function AppSidebar({ userRole, companyName = "NexaHR", companyLogo }: AppSidebarProps) {
  const [location] = useLocation();

  const employeeItems = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Attendance", url: "/attendance", icon: Clock },
    { title: "Leave", url: "/leave", icon: Calendar },
    { title: "Claims", url: "/claims", icon: FileText },
    { title: "My Payslips", url: "/my-payslips", icon: DollarSign },
  ];

  const managerItems = [
    { title: "Approvals", url: "/approvals", icon: CheckSquare },
  ];

  const hrAdminItems = [
    { title: "Employees", url: "/admin/employees", icon: Users },
    { title: "Payroll", url: "/admin/payroll", icon: DollarSign },
    { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-8 w-8 object-contain rounded-full"
              data-testid="img-sidebar-logo"
            />
          ) : (
            <Building2 className="h-6 w-6" />
          )}
          <h2 className="text-lg font-semibold">{companyName}</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {employeeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === "manager" || userRole === "hr_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Manager</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {userRole === "hr_admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hrAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase()}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
