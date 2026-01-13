import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calculator, Loader2, Users, DollarSign, Clock, AlertTriangle, CheckCircle2, Play } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

interface PreviewEmployee {
  employeeCode: string;
  employeeName: string;
  department: string;
  totalHoursWorked: number;
  regularHours: number;
  overtimeHours: number;
  daysWorked: number;
  payType: string;
  hourlyRate: number;
  basicPay: number;
  overtimePay: number;
  grossWages: number;
  employeeCPF: number;
  employerCPF: number;
  netPay: number;
  residencyStatus: string;
  cpfEligible: boolean;
}

interface SkippedEmployee {
  employeeCode: string;
  employeeName: string;
  reason: string;
}

interface PreviewResponse {
  success: boolean;
  period: string;
  periodStart: string;
  periodEnd: string;
  preview: PreviewEmployee[];
  skipped: SkippedEmployee[];
  totalEmployees: number;
  eligibleCount: number;
  skippedCount: number;
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatHours(hours: number): string {
  return hours.toFixed(2);
}

export default function AdminPayrollGeneratePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/payroll/generate/preview", {
        year: parseInt(selectedYear),
        month: parseInt(selectedMonth),
      });
      return response.json();
    },
    onSuccess: (data: PreviewResponse) => {
      setPreviewData(data);
      if (data.eligibleCount === 0) {
        toast({
          title: "No Eligible Employees",
          description: "No employees have attendance data or pay rates configured for this period.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/payroll/generate", {
        year: parseInt(selectedYear),
        month: parseInt(selectedMonth),
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payroll Generated",
        description: `Successfully generated payroll for ${data.generated} employees.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payroll/records"] });
      setPreviewData(null);
      setConfirmDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePreview = () => {
    setPreviewData(null);
    previewMutation.mutate();
  };

  const handleGenerate = () => {
    setConfirmDialogOpen(true);
  };

  const confirmGenerate = () => {
    generateMutation.mutate();
  };

  const totalGrossWages = previewData?.preview.reduce((sum, emp) => sum + emp.grossWages, 0) || 0;
  const totalEmployeeCPF = previewData?.preview.reduce((sum, emp) => sum + emp.employeeCPF, 0) || 0;
  const totalEmployerCPF = previewData?.preview.reduce((sum, emp) => sum + emp.employerCPF, 0) || 0;
  const totalNetPay = previewData?.preview.reduce((sum, emp) => sum + emp.netPay, 0) || 0;
  const totalHours = previewData?.preview.reduce((sum, emp) => sum + emp.totalHoursWorked, 0) || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Generate Payroll from Attendance</h1>
          <p className="text-muted-foreground">Calculate payroll based on clock-in/clock-out data with CPF contributions</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/admin/payroll")}
          data-testid="button-back-payroll"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payroll Management
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Select Pay Period
          </CardTitle>
          <CardDescription>
            Choose the month and year to generate payroll from attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32" data-testid="select-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40" data-testid="select-month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handlePreview} 
              disabled={previewMutation.isPending}
              data-testid="button-preview"
            >
              {previewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Preview Payroll
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Employees</p>
                    <p className="text-2xl font-bold" data-testid="text-employee-count">{previewData.eligibleCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold" data-testid="text-total-hours">{formatHours(totalHours)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Gross Wages</p>
                    <p className="text-2xl font-bold" data-testid="text-gross-wages">{formatCurrency(totalGrossWages)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total CPF</p>
                    <p className="text-lg font-bold text-blue-600" data-testid="text-total-cpf">
                      {formatCurrency(totalEmployeeCPF + totalEmployerCPF)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Emp: {formatCurrency(totalEmployeeCPF)} | Er: {formatCurrency(totalEmployerCPF)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Net Pay</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-net-pay">{formatCurrency(totalNetPay)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {previewData.skipped.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  Skipped Employees ({previewData.skipped.length})
                </CardTitle>
                <CardDescription className="text-yellow-600 dark:text-yellow-500">
                  These employees were skipped because they don't have pay rates configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {previewData.skipped.map((emp, idx) => (
                    <Badge key={idx} variant="outline" className="border-yellow-300">
                      {emp.employeeCode}: {emp.employeeName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payroll Preview - {previewData.period}</CardTitle>
                <CardDescription>
                  Period: {previewData.periodStart} to {previewData.periodEnd}
                </CardDescription>
              </div>
              {previewData.eligibleCount > 0 && (
                <Button 
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Generate Payroll
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {previewData.preview.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No employees with attendance data found for this period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Days</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Regular</TableHead>
                        <TableHead className="text-right">OT</TableHead>
                        <TableHead className="text-right">Rate/hr</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">CPF (Emp)</TableHead>
                        <TableHead className="text-right">CPF (Er)</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.preview.map((emp, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{emp.employeeName}</p>
                              <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                            </div>
                          </TableCell>
                          <TableCell>{emp.department || '-'}</TableCell>
                          <TableCell className="text-right">{emp.daysWorked}</TableCell>
                          <TableCell className="text-right">{formatHours(emp.totalHoursWorked)}</TableCell>
                          <TableCell className="text-right">{formatHours(emp.regularHours)}</TableCell>
                          <TableCell className="text-right">{formatHours(emp.overtimeHours)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(emp.hourlyRate)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(emp.grossWages)}</TableCell>
                          <TableCell className="text-right text-blue-600">{formatCurrency(emp.employeeCPF)}</TableCell>
                          <TableCell className="text-right text-blue-600">{formatCurrency(emp.employerCPF)}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{formatCurrency(emp.netPay)}</TableCell>
                          <TableCell>
                            <Badge variant={emp.cpfEligible ? "default" : "secondary"}>
                              {emp.residencyStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payroll Generation</AlertDialogTitle>
            <AlertDialogDescription>
              This will create payroll records for {previewData?.eligibleCount || 0} employees 
              for {previewData?.period}. Total net pay: {formatCurrency(totalNetPay)}.
              <br /><br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-generate">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate} data-testid="button-confirm-generate">
              Generate Payroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
