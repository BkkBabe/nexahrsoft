import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function PendingApprovalPage() {
  const [, setLocation] = useLocation();

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

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center" data-testid="text-page-title">
            Approval Pending
          </CardTitle>
          <CardDescription className="text-center">
            Your account is waiting for admin approval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Thank you for registering! Your account has been created successfully and is currently under review.
            </p>
            <p className="text-sm text-muted-foreground">
              You will be able to access the system once an administrator approves your account.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRefresh}
              data-testid="button-refresh"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Status
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => logoutMutation.mutate()}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need help? Contact your HR administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
