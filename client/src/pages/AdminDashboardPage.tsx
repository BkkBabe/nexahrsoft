import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LogOut, Users, Calendar, FileText, DollarSign, Receipt, Settings, BarChart3, Mail } from "lucide-react";
import { useLocation } from "wouter";
import { MenuCard } from "@/components/MenuCard";

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      setLocation("/admin/login");
    },
  });

  const menuItems = [
    {
      title: "All Attendance",
      icon: Users,
      href: "/admin/attendance",
      iconColor: "bg-blue-500/10",
    },
    {
      title: "All Leave",
      icon: Calendar,
      href: "/admin/leave",
      iconColor: "bg-green-500/10",
    },
    {
      title: "All Claims",
      icon: Receipt,
      href: "/admin/claims",
      iconColor: "bg-purple-500/10",
    },
    {
      title: "Payroll Reports",
      icon: DollarSign,
      href: "/admin/payroll/reports",
      iconColor: "bg-emerald-500/10",
    },
    {
      title: "All Income Tax",
      icon: FileText,
      href: "/admin/income-tax",
      iconColor: "bg-orange-500/10",
    },
    {
      title: "Reports",
      icon: BarChart3,
      href: "/admin/reports",
      iconColor: "bg-indigo-500/10",
    },
    {
      title: "Send Emails",
      icon: Mail,
      href: "/admin/emails",
      iconColor: "bg-cyan-500/10",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/admin/settings",
      iconColor: "bg-gray-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
              Admin Dashboard
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage HR operations and system settings
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            data-testid="button-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-6">
          {menuItems.map((item) => (
            <MenuCard
              key={item.title}
              title={item.title}
              icon={item.icon}
              iconColor={item.iconColor}
              onClick={() => setLocation(item.href)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
