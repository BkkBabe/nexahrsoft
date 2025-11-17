import { Bell, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface AppHeaderProps {
  userName: string;
  userRole: string;
  companyName: string;
  companyLogo?: string;
  notificationCount?: number;
}

export function AppHeader({
  userName,
  userRole,
  companyName,
  companyLogo,
  notificationCount = 0,
}: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: async () => {
      // Clear session cache
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      // Redirect to login page
      setLocation("/");
    },
  });

  return (
    <div className="bg-primary text-primary-foreground px-4 py-6 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {companyLogo && (
            <div className="bg-white rounded-md p-2 w-20 h-20 flex items-center justify-center">
              <img
                src={companyLogo}
                alt={companyName}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-greeting">
              HELLO, {userName.toUpperCase()}!
            </h1>
            <p className="text-sm md:text-base opacity-90" data-testid="text-company">
              {companyName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:text-primary-foreground"
            data-testid="button-settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:text-primary-foreground"
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                data-testid="badge-notification-count"
              >
                {notificationCount}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary-foreground text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userRole}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                className="cursor-pointer"
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
