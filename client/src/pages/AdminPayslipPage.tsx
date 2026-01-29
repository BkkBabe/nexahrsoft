import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DollarSign, ArrowLeft, Calculator, CheckCircle, FileSpreadsheet, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import type { User, PayslipRecord } from "@shared/schema";
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
import { Separator } from "@/components/ui/separator";

export default function AdminPayslipPage() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [hourlyWage, setHourlyWage] = useState("");
  const [calculatedData, setCalculatedData] = useState<{
    totalHours: number;
    recordCount: number;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all approved users
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch all payslips
  const { data: payslipsData, isLoading: payslipsLoading } = useQuery<{ payslips: PayslipRecord[] }>({
    queryKey: ['/api/admin/payslips'],
  });

  const users = usersData?.users?.filter(u => u.isApproved && !u.role?.includes('admin')) || [];
  const payslips = payslipsData?.payslips || [];

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/payslips/calculate?userId=${selectedUserId}&startDate=${periodStart}&endDate=${periodEnd}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to calculate hours");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setCalculatedData(data);
      toast({
        title: "Hours Calculated",
        description: `Total hours: ${data.totalHours.toFixed(1)} from ${data.recordCount} records`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const hourlyWageCents = Math.round(parseFloat(hourlyWage) * 100);
      return apiRequest("POST", "/api/admin/payslips", {
        userId: selectedUserId,
        periodStart,
        periodEnd,
        hourlyWage: hourlyWageCents,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payslip generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payslips'] });
      setDialogOpen(false);
      setSelectedUserId("");
      setPeriodStart("");
      setPeriodEnd("");
      setHourlyWage("");
      setCalculatedData(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate payslip",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (payslipId: string) => {
      return apiRequest("PATCH", `/api/admin/payslips/${payslipId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payslip approved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payslips'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve payslip",
        variant: "destructive",
      });
    },
  });

  const handleCalculate = () => {
    if (!selectedUserId || !periodStart || !periodEnd) {
      toast({
        title: "Error",
        description: "Please select user and date range",
        variant: "destructive",
      });
      return;
    }
    calculateMutation.mutate();
  };

  const handleGenerate = () => {
    if (!calculatedData || !hourlyWage) {
      toast({
        title: "Error",
        description: "Please calculate hours and set hourly wage",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || user?.username || "Unknown User";
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-admin-payslip-title">
            Payslip Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and manage employee payslips based on attendance
          </p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" data-testid="button-back-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Generate Payslip Dialog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Generate New Payslip
          </CardTitle>
          <CardDescription>Calculate hours and create payslips for employees</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-payslip">
                <DollarSign className="mr-2 h-4 w-4" />
                Generate Payslip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate Employee Payslip</DialogTitle>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period-start">Period Start</Label>
                    <Input
                      id="period-start"
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      data-testid="input-period-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period-end">Period End</Label>
                    <Input
                      id="period-end"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      data-testid="input-period-end"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleCalculate}
                  disabled={calculateMutation.isPending || !selectedUserId || !periodStart || !periodEnd}
                  data-testid="button-calculate-hours"
                  variant="outline"
                  className="w-full"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {calculateMutation.isPending ? "Calculating..." : "Calculate Hours"}
                </Button>

                {calculatedData && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Hours Worked</span>
                          <span className="font-mono font-medium" data-testid="text-calculated-hours">
                            {calculatedData.totalHours.toFixed(1)} hours
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Attendance Records</span>
                          <span className="font-mono font-medium" data-testid="text-record-count">
                            {calculatedData.recordCount} records
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="hourly-wage">Hourly Wage ($)</Label>
                  <Input
                    id="hourly-wage"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="15.00"
                    value={hourlyWage}
                    onChange={(e) => setHourlyWage(e.target.value)}
                    data-testid="input-hourly-wage"
                  />
                </div>

                {calculatedData && hourlyWage && (
                  <Card className="bg-primary/10">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Estimated Total Pay</span>
                        <span className="text-2xl font-bold font-mono" data-testid="text-estimated-pay">
                          ${(calculatedData.totalHours * parseFloat(hourlyWage)).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !calculatedData || !hourlyWage}
                  data-testid="button-submit-payslip"
                  className="w-full"
                >
                  {generateMutation.isPending ? "Generating..." : "Generate Payslip"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>All Payslips</CardTitle>
              <CardDescription>View and approve generated payslips</CardDescription>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/payroll/import">
                <Button variant="outline" size="sm" data-testid="button-import-payroll">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import Payroll
                </Button>
              </Link>
              <Link href="/admin/payroll/reports">
                <Button variant="outline" size="sm" data-testid="button-payroll-reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Payroll Reports
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payslipsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : payslips.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No payslips generated yet
            </div>
          ) : (
            <div className="space-y-4">
              {payslips.map((payslip) => {
                const actualHours = payslip.totalHours / 2;
                const hourlyWageDollars = payslip.hourlyWage / 100;
                const totalPayDollars = payslip.totalPay / 100;

                return (
                  <Card key={payslip.id} data-testid={`card-payslip-${payslip.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium" data-testid={`text-employee-${payslip.id}`}>
                              {getUserName(payslip.userId)}
                            </h3>
                            <Badge variant={payslip.status === "approved" ? "default" : "secondary"}>
                              {payslip.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Period</p>
                              <p className="font-medium">
                                {new Date(payslip.periodStart).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(payslip.periodEnd).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Hours</p>
                              <p className="font-mono font-medium">{actualHours.toFixed(1)} hours</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Hourly Wage</p>
                              <p className="font-mono font-medium">${hourlyWageDollars.toFixed(2)}/hr</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Pay</p>
                              <p className="font-mono font-medium text-lg">${totalPayDollars.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        {payslip.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(payslip.id)}
                            disabled={approveMutation.isPending}
                            data-testid={`button-approve-${payslip.id}`}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
