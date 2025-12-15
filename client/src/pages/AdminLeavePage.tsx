import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, ArrowLeft, Plus, CheckCircle, XCircle, Upload, BarChart3, PieChart as PieChartIcon, Download, Users, TrendingUp, FileText } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

interface LeaveHistoryRecord {
  employeeCode: string;
  employeeName: string;
  leaveType: string;
  leaveDate: string;
  dayOfWeek?: string;
  remarks?: string;
  daysOrHours: string;
  mlClaimAmount?: number;
  year: number;
}

interface AnalyticsData {
  year: number;
  stats: { leaveType: string; totalDays: number; count: number }[];
  uniqueEmployees: number;
  totalRecords: number;
  monthlyData: Record<string, Record<string, number>>;
  employeeUtilization: Record<string, { name: string; total: number; byType: Record<string, number> }>;
}

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

export default function AdminLeavePage() {
  const { toast } = useToast();
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  
  // Analytics state
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());
  const [parsedRecords, setParsedRecords] = useState<LeaveHistoryRecord[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/leave/analytics', analyticsYear],
  });

  // Import leave history mutation
  const importMutation = useMutation({
    mutationFn: async (records: LeaveHistoryRecord[]) => {
      return apiRequest("POST", "/api/admin/leave/history/import", {
        records,
        replaceExisting: false,
      });
    },
    onSuccess: (data: { imported: number }) => {
      toast({
        title: "Success",
        description: `Successfully imported ${data.imported} leave records`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/leave/analytics', analyticsYear] });
      setParsedRecords([]);
      setCsvFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error: Error) => {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import leave records",
        variant: "destructive",
      });
    },
  });

  // CSV Parser for specific format
  const parseCSV = (text: string): LeaveHistoryRecord[] => {
    const records: LeaveHistoryRecord[] = [];
    const lines = text.split('\n');
    
    let currentEmployeeCode = "";
    let currentEmployeeName = "";
    let currentLeaveType = "";
    let recordYear = new Date().getFullYear();
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Parse employee header: "Emp Code: 07001   Employee: NAME   Leave Calculation Date: 01-10-2024"
      if (trimmedLine.includes("Emp Code:") && trimmedLine.includes("Employee:")) {
        const empCodeMatch = trimmedLine.match(/Emp Code:\s*(\d+)/);
        const empNameMatch = trimmedLine.match(/Employee:\s*([A-Z\s@]+?)(?:\s{2,}|Leave)/);
        const dateMatch = trimmedLine.match(/Leave Calculation Date:\s*(\d{2})-(\d{2})-(\d{4})/);
        
        if (empCodeMatch) currentEmployeeCode = empCodeMatch[1];
        if (empNameMatch) currentEmployeeName = empNameMatch[1].trim();
        if (dateMatch) recordYear = parseInt(dateMatch[3]);
        continue;
      }
      
      // Parse leave type header: "Leave Type:   AL - ANNUAL LEAVE"
      if (trimmedLine.startsWith("Leave Type:")) {
        const typeMatch = trimmedLine.match(/Leave Type:\s*([A-Z]+)\s*-/);
        if (typeMatch) currentLeaveType = typeMatch[1];
        continue;
      }
      
      // Skip headers and summary lines
      if (trimmedLine.startsWith("Row#") || trimmedLine.startsWith("Total:") || 
          trimmedLine.includes("ML Claims") || trimmedLine.includes("Total Leave:")) {
        continue;
      }
      
      // Parse leave entry line: "1   15-01-2024   Mon      1.00 day" or with remarks
      const entryMatch = trimmedLine.match(/^\d+\s+(\d{2})-(\d{2})-(\d{4})\s+([A-Za-z]+)\s*(.*?)\s*([\d.]+\s*(?:day|days|hours?))/i);
      if (entryMatch && currentEmployeeCode && currentLeaveType) {
        const [, day, month, year, dayOfWeek, remarks, daysOrHours] = entryMatch;
        const leaveDate = `${year}-${month}-${day}`;
        
        records.push({
          employeeCode: currentEmployeeCode,
          employeeName: currentEmployeeName,
          leaveType: currentLeaveType,
          leaveDate,
          dayOfWeek,
          remarks: remarks?.trim() || undefined,
          daysOrHours: daysOrHours.trim(),
          year: parseInt(year),
        });
      }
    }
    
    return records;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const records = parseCSV(text);
      setParsedRecords(records);
      
      if (records.length === 0) {
        toast({
          title: "No Records Found",
          description: "Could not parse any leave records from the file. Please check the format.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "File Parsed",
          description: `Found ${records.length} leave records ready to import`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsedRecords.length === 0) return;
    importMutation.mutate(parsedRecords);
  };

  // Prepare chart data
  const pieChartData = analyticsData?.stats?.map(s => ({
    name: s.leaveType,
    value: s.totalDays,
    count: s.count,
  })) || [];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const barChartData = monthNames.map((month, idx) => {
    const monthKey = `${analyticsYear}-${String(idx + 1).padStart(2, '0')}`;
    const monthData = analyticsData?.monthlyData?.[monthKey] || {};
    return {
      month,
      ...monthData,
      total: Object.values(monthData).reduce((sum: number, val) => sum + (val as number), 0),
    };
  });

  const employeeUtilizationList = Object.entries(analyticsData?.employeeUtilization || {})
    .map(([code, data]) => ({ code, ...data }))
    .sort((a, b) => b.total - a.total);

  const totalDaysTaken = analyticsData?.stats?.reduce((sum, s) => sum + s.totalDays, 0) || 0;

  // Export CSV function
  const exportToCSV = () => {
    if (!analyticsData || employeeUtilizationList.length === 0) return;
    
    const leaveTypes = [...new Set(analyticsData.stats.map(s => s.leaveType))];
    const headers = ['Employee Code', 'Employee Name', ...leaveTypes, 'Total Days'];
    
    const rows = employeeUtilizationList.map(emp => [
      emp.code,
      emp.name,
      ...leaveTypes.map(lt => emp.byType[lt]?.toString() || '0'),
      emp.total.toString(),
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-analytics-${analyticsYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balances" data-testid="tab-balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="applications" data-testid="tab-applications">
            Applications
            {pendingApplications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
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

        <TabsContent value="analytics" className="space-y-6">
          {/* Year Selector and Import Section */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
            <div className="space-y-2">
              <Label htmlFor="analytics-year">Select Year</Label>
              <Select 
                value={analyticsYear.toString()} 
                onValueChange={(val) => setAnalyticsYear(parseInt(val))}
              >
                <SelectTrigger className="w-[180px]" data-testid="select-analytics-year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {[2020, 2021, 2022, 2023, 2024, 2025].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 items-end">
              <Button 
                variant="outline" 
                onClick={exportToCSV}
                disabled={!analyticsData || employeeUtilizationList.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* CSV Import Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Leave History
              </CardTitle>
              <CardDescription>
                Upload a CSV file with leave records to populate the analytics dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      ref={fileInputRef}
                      id="csv-file"
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      data-testid="input-csv-file"
                    />
                    {csvFileName && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {csvFileName} - {parsedRecords.length} records parsed
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleImport}
                    disabled={parsedRecords.length === 0 || importMutation.isPending}
                    data-testid="button-import-csv"
                  >
                    {importMutation.isPending ? "Importing..." : "Import Records"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          {analyticsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <Card data-testid="card-stat-records">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                      <p className="text-2xl font-bold">{analyticsData?.totalRecords || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-stat-employees">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unique Employees</p>
                      <p className="text-2xl font-bold">{analyticsData?.uniqueEmployees || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-stat-days">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Days Taken</p>
                      <p className="text-2xl font-bold">{totalDaysTaken.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts Section */}
          {!analyticsLoading && analyticsData && analyticsData.totalRecords > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Pie Chart - Leave Type Distribution */}
              <Card data-testid="card-chart-pie">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Leave Type Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => [`${value} days`, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart - Monthly Trend */}
              <Card data-testid="card-chart-bar">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Leave Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" fill="#8884d8" name="Total Days" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Utilization Table */}
          {!analyticsLoading && employeeUtilizationList.length > 0 && (
            <Card data-testid="card-employee-utilization">
              <CardHeader>
                <CardTitle>Employee Leave Utilization</CardTitle>
                <CardDescription>Leave days taken by each employee in {analyticsYear}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Employee Code</th>
                        <th className="text-left py-3 px-2 font-medium">Name</th>
                        <th className="text-right py-3 px-2 font-medium">Total Days</th>
                        <th className="text-left py-3 px-2 font-medium">Breakdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeUtilizationList.slice(0, 20).map((emp, idx) => (
                        <tr key={emp.code} className="border-b" data-testid={`row-employee-${idx}`}>
                          <td className="py-3 px-2 font-mono">{emp.code}</td>
                          <td className="py-3 px-2">{emp.name}</td>
                          <td className="py-3 px-2 text-right font-medium">{emp.total.toFixed(1)}</td>
                          <td className="py-3 px-2">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(emp.byType).map(([type, days]) => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {type}: {days}
                                </Badge>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {employeeUtilizationList.length > 20 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Showing top 20 of {employeeUtilizationList.length} employees
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!analyticsLoading && (!analyticsData || analyticsData.totalRecords === 0) && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No Leave Data for {analyticsYear}</p>
                  <p className="text-sm">Import a CSV file with leave records to view analytics</p>
                </div>
              </CardContent>
            </Card>
          )}
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
