import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Mail, Send, RefreshCw, Search, Users, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import type { User } from "@shared/schema";

export default function AdminEmailsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersData, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users"],
  });

  const users = usersData?.users || [];

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.employeeCode && user.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.department && user.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sendEmailMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      return await apiRequest("POST", "/api/admin/users/send-welcome-email", { userIds });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Emails Sent",
        description: data.message || `Successfully sent welcome emails to ${data.sent || 0} users.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedUsers(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send emails",
        variant: "destructive",
      });
    },
  });

  const resendEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", "/api/admin/users/resend-welcome-email", { userId });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Email Resent",
        description: data.message || "Welcome email has been resent with a new password.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resend email",
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBatchSend = () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to send emails.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate(Array.from(selectedUsers));
  };

  const handleResend = (userId: string) => {
    resendEmailMutation.mutate(userId);
  };

  const usersWithEmail = users.filter(u => !u.welcomeEmailSentAt).length;
  const usersWithEmailSent = users.filter(u => u.welcomeEmailSentAt).length;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
              Send Welcome Emails
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Send initialization emails to employees with login credentials and QR code
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold" data-testid="text-total-users">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Mail className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Emails</p>
                  <p className="text-2xl font-bold" data-testid="text-pending-emails">{usersWithEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Emails Sent</p>
                  <p className="text-2xl font-bold" data-testid="text-emails-sent">{usersWithEmailSent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Welcome Email Preview
            </CardTitle>
            <CardDescription>
              This is the message that will be sent to employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-4 text-sm">
              <p className="font-semibold">Welcome to our NexaHRMS!</p>
              <p>
                We're excited to provide you with a seamless, efficient, and user-friendly 
                experience for managing all your HR needs. From attendance and leave management 
                to performance, payroll, and beyond—everything you need is right here at your fingertips.
              </p>
              <p className="font-semibold">Let's get started!</p>
              <div className="border-t pt-4 space-y-2">
                <p><strong>App Link:</strong> https://app.nexahrms.com/</p>
                <p><strong>Username:</strong> [Employee Code]</p>
                <p><strong>Password:</strong> [Generated Password]</p>
                <p className="text-muted-foreground text-xs">A QR code linking to the app will also be included.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Employee List</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
                <Button
                  onClick={handleBatchSend}
                  disabled={selectedUsers.size === 0 || sendEmailMutation.isPending}
                  data-testid="button-batch-send"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendEmailMutation.isPending ? "Sending..." : `Send to ${selectedUsers.size} Selected`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-employees">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left">
                        <Checkbox
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={handleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </th>
                      <th className="p-3 text-left font-medium">Employee Code</th>
                      <th className="p-3 text-left font-medium">Name</th>
                      <th className="p-3 text-left font-medium">Email</th>
                      <th className="p-3 text-left font-medium">Department</th>
                      <th className="p-3 text-center font-medium">Email Status</th>
                      <th className="p-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b hover:bg-muted/50" data-testid={`row-user-${user.id}`}>
                        <td className="p-3">
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => handleSelectUser(user.id)}
                            data-testid={`checkbox-user-${user.id}`}
                          />
                        </td>
                        <td className="p-3">{user.employeeCode || "-"}</td>
                        <td className="p-3">{user.name}</td>
                        <td className="p-3 text-sm">{user.email}</td>
                        <td className="p-3">{user.department || "-"}</td>
                        <td className="p-3 text-center">
                          {user.welcomeEmailSentAt ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Sent {format(new Date(user.welcomeEmailSentAt), "dd/MM/yy")}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Sent</Badge>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(user.id)}
                            disabled={resendEmailMutation.isPending}
                            data-testid={`button-resend-${user.id}`}
                          >
                            <RefreshCw className={`mr-1 h-4 w-4 ${resendEmailMutation.isPending ? 'animate-spin' : ''}`} />
                            {user.welcomeEmailSentAt ? 'Resend' : 'Send'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No employees found matching your search.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
