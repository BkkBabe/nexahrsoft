import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, ArrowLeft, Plus, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";
import type { User, LeaveBalance, LeaveApplication } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function AdminLeavePage() {
  const { toast } = useToast();
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [reviewComments, setReviewComments] = useState("");

  // Fetch all approved users
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch all leave balances
  const { data: balancesData, isLoading: balancesLoading } = useQuery<{ balances: LeaveBalance[] }>({
    queryKey: ['/api/admin/leave/balances'],
  });

  // Fetch all leave applications
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery<{ applications: LeaveApplication[] }>({
    queryKey: ['/api/admin/leave/applications'],
  });

  const users = usersData?.users?.filter(u => u.isApproved && !u.role?.includes('admin')) || [];
  const balances = balancesData?.balances || [];
  const applications = applicationsData?.applications || [];

  const setBalanceMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/leave/balances", {
        userId: selectedUserId,
        leaveType,
        totalDays: parseFloat(totalDays),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave balance updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave/balances'] });
      setBalanceDialogOpen(false);
      setSelectedUserId("");
      setLeaveType("");
      setTotalDays("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update leave balance",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ applicationId, status }: { applicationId: string; status: "approved" | "rejected" }) => {
      return apiRequest("PATCH", `/api/admin/leave/applications/${applicationId}`, {
        status,
        reviewComments: reviewComments || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave application reviewed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave/applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave/balances'] });
      setReviewDialogOpen(false);
      setSelectedApplication(null);
      setReviewComments("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to review leave application",
        variant: "destructive",
      });
    },
  });

  const handleSetBalance = () => {
    if (!selectedUserId || !leaveType || !totalDays) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    setBalanceMutation.mutate();
  };

  const handleReviewApplication = (status: "approved" | "rejected") => {
    if (!selectedApplication) return;
    reviewMutation.mutate({ applicationId: selectedApplication.id, status });
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || user?.username || "Unknown User";
  };

  // Group balances by user
  const balancesByUser = balances.reduce((acc, balance) => {
    if (!acc[balance.userId]) {
      acc[balance.userId] = [];
    }
    acc[balance.userId].push(balance);
    return acc;
  }, {} as Record<string, LeaveBalance[]>);

  const pendingApplications = applications.filter(app => app.status === "pending");
  const reviewedApplications = applications.filter(app => app.status !== "pending");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-admin-leave-title">
            Leave Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage employee leave balances and review applications
          </p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" data-testid="button-back-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="balances" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="balances" data-testid="tab-balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="applications" data-testid="tab-applications">
            Applications
            {pendingApplications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balances" className="space-y-6">
          {/* Set Leave Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Set Leave Balance
              </CardTitle>
              <CardDescription>Configure leave entitlements for employees</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-set-leave-balance">
                    <Plus className="mr-2 h-4 w-4" />
                    Set Leave Balance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Employee Leave Balance</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-select">Employee</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger id="user-select" data-testid="select-user">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.username} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="leave-type">Leave Type</Label>
                      <Input
                        id="leave-type"
                        placeholder="e.g., Annual Leave, Sick Leave"
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        data-testid="input-leave-type"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="total-days">Total Days</Label>
                      <Input
                        id="total-days"
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="14"
                        value={totalDays}
                        onChange={(e) => setTotalDays(e.target.value)}
                        data-testid="input-total-days"
                      />
                    </div>

                    <Button
                      onClick={handleSetBalance}
                      disabled={setBalanceMutation.isPending}
                      data-testid="button-submit-balance"
                      className="w-full"
                    >
                      {setBalanceMutation.isPending ? "Setting..." : "Set Balance"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* Leave Balances List */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Leave Balances</CardTitle>
              <CardDescription>Current leave entitlements for all employees</CardDescription>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : Object.keys(balancesByUser).length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No leave balances configured yet
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(balancesByUser).map(([userId, userBalances]) => (
                    <div key={userId} className="space-y-3">
                      <h3 className="font-medium" data-testid={`text-user-${userId}`}>
                        {getUserName(userId)}
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {userBalances.map((balance) => (
                          <Card key={balance.id} data-testid={`card-balance-${balance.id}`}>
                            <CardContent className="pt-6">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{balance.leaveType}</span>
                                  <Badge variant="outline">
                                    {balance.totalDays - balance.usedDays} / {balance.totalDays} days
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Used: {balance.usedDays} days
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          {/* Pending Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>Review and approve/reject leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : pendingApplications.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No pending applications
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingApplications.map((app) => (
                    <Card key={app.id} data-testid={`card-application-${app.id}`}>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium">{getUserName(app.userId)}</h3>
                                <Badge>{app.leaveType}</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Dates</p>
                                  <p className="font-medium">
                                    {new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Duration</p>
                                  <p className="font-medium">{app.totalDays} {app.totalDays === 1 ? "day" : "days"}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-sm">Reason</p>
                                <p className="text-sm">{app.reason}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(app);
                                setReviewDialogOpen(true);
                              }}
                              data-testid={`button-review-${app.id}`}
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviewed Applications */}
          <Card>
            <CardHeader>
              <CardTitle>Reviewed Applications</CardTitle>
              <CardDescription>Previously reviewed leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              {reviewedApplications.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No reviewed applications yet
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewedApplications.map((app) => (
                    <Card key={app.id} data-testid={`card-reviewed-${app.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{getUserName(app.userId)}</span>
                              <Badge variant="outline">{app.leaveType}</Badge>
                              <Badge variant={app.status === "approved" ? "default" : "destructive"}>
                                {app.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(app.startDate).toLocaleDateString()} - {new Date(app.endDate).toLocaleDateString()} • {app.totalDays} days
                            </p>
                            {app.reviewComments && (
                              <p className="text-sm text-muted-foreground">Comment: {app.reviewComments}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Leave Application</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">{getUserName(selectedApplication.userId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leave Type</p>
                  <p className="font-medium">{selectedApplication.leaveType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {new Date(selectedApplication.startDate).toLocaleDateString()} - {new Date(selectedApplication.endDate).toLocaleDateString()} ({selectedApplication.totalDays} days)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="text-sm">{selectedApplication.reason}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-comments">Comments (Optional)</Label>
                <Textarea
                  id="review-comments"
                  placeholder="Add review comments..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  data-testid="textarea-review-comments"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleReviewApplication("approved")}
                  disabled={reviewMutation.isPending}
                  data-testid="button-approve-application"
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReviewApplication("rejected")}
                  disabled={reviewMutation.isPending}
                  data-testid="button-reject-application"
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
