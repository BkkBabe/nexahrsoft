import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";

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
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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
          <Avatar className="h-10 w-10" data-testid="avatar-user">
            <AvatarFallback className="bg-primary-foreground text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
