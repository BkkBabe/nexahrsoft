import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, FileSpreadsheet, Users, DollarSign, Calendar, Trash2, Loader2, TrendingUp, AlertTriangle, FileText, Printer, X } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PayrollRecord } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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

const MONTH_NAMES: Record<number, string> = {
  1: "January", 2: "February", 3: "March", 4: "April",
  5: "May", 6: "June", 7: "July", 8: "August",
  9: "September", 10: "October", 11: "November", 12: "December"
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function AdminPayrollReportsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);

  const buildQueryUrl = () => {
    let url = `/api/admin/payroll/records?year=${selectedYear}`;
    if (selectedMonth && selectedMonth !== "") {
      url += `&month=${selectedMonth}`;
    }
    return url;
  };

  const queryUrl = buildQueryUrl();

  const { data, isLoading } = useQuery<{ records: PayrollRecord[] }>({
    queryKey: ['/api/admin/payroll/records', selectedYear, selectedMonth || null],
    queryFn: async () => {
      const res = await fetch(queryUrl, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch payroll records');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      return apiRequest("DELETE", `/api/admin/payroll/records/${year}/${month}`);
    },
    onSuccess: () => {
      toast({
        title: "Records Deleted",
        description: "Payroll records have been deleted successfully.",
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/payroll/records'],
        exact: false,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const records = data?.records || [];

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const totalNett = records.reduce((sum, r) => sum + r.nett, 0);
  const totalGross = records.reduce((sum, r) => sum + r.grossWages, 0);
  const totalCpf = records.reduce((sum, r) => sum + r.employerCpf + r.employeeCpf, 0);
  const totalLeaveEncashment = records.reduce((sum, r) => sum + r.annualLeaveEncashment, 0);
  const totalNoPayDeduction = records.reduce((sum, r) => sum + r.noPayDay, 0);

  const groupedByPeriod = records.reduce((acc, record) => {
    const key = `${record.payPeriodYear}-${record.payPeriodMonth}`;
    if (!acc[key]) {
      acc[key] = {
        year: record.payPeriodYear,
        month: record.payPeriodMonth,
        display: record.payPeriod,
        records: [],
        totalNett: 0,
        totalGross: 0,
      };
    }
    acc[key].records.push(record);
    acc[key].totalNett += record.nett;
    acc[key].totalGross += record.grossWages;
    return acc;
  }, {} as Record<string, { year: number; month: number; display: string; records: PayrollRecord[]; totalNett: number; totalGross: number }>);

  const periods = Object.values(groupedByPeriod).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  const exportToCsv = () => {
    if (records.length === 0) {
      toast({
        title: "No Data",
        description: "No payroll records to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Pay Period", "Employee Code", "Employee Name", "Department", "Section",
      "Basic Salary", "Total Salary", "OT 1.0x", "OT 1.5x", "OT 2.0x", "OT 3.0x",
      "Shift Allowance", "Mobile Allowance", "Transport Allowance",
      "Annual Leave Encashment", "Other Allowance", "Bonus",
      "Gross Wages", "CPF Wages", "Employer CPF", "Employee CPF",
      "No Pay Day Deduction", "Loan Repayment", "Nett Pay", "Pay Mode"
    ];

    const csvRows = [headers.join(",")];

    records.forEach(r => {
      const row = [
        escapeCsvField(r.payPeriod),
        escapeCsvField(r.employeeCode),
        escapeCsvField(r.employeeName),
        escapeCsvField(r.deptName || ""),
        escapeCsvField(r.secName || ""),
        (r.basicSalary / 100).toFixed(2),
        (r.totSalary / 100).toFixed(2),
        (r.ot10 / 100).toFixed(2),
        (r.ot15 / 100).toFixed(2),
        (r.ot20 / 100).toFixed(2),
        (r.ot30 / 100).toFixed(2),
        (r.shiftAllowance / 100).toFixed(2),
        (r.mobileAllowance / 100).toFixed(2),
        (r.transportAllowance / 100).toFixed(2),
        (r.annualLeaveEncashment / 100).toFixed(2),
        (r.otherAllowance / 100).toFixed(2),
        (r.bonus / 100).toFixed(2),
        (r.grossWages / 100).toFixed(2),
        (r.cpfWages / 100).toFixed(2),
        (r.employerCpf / 100).toFixed(2),
        (r.employeeCpf / 100).toFixed(2),
        (r.noPayDay / 100).toFixed(2),
        (r.loanRepaymentTotal / 100).toFixed(2),
        (r.nett / 100).toFixed(2),
        escapeCsvField(r.payMode || ""),
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = selectedMonth 
      ? `payroll_${selectedYear}_${selectedMonth}.csv`
      : `payroll_${selectedYear}.csv`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${records.length} records to ${filename}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/payslip")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Payroll Reports</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">Browse and export imported payroll data</p>
        </div>
        <Button onClick={() => setLocation("/admin/payroll/import")} data-testid="button-import-new">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import New Data
        </Button>
      </div>

      <Card data-testid="card-filter">
        <CardHeader>
          <CardTitle data-testid="text-filter-title">Filter Records</CardTitle>
          <CardDescription data-testid="text-filter-description">Select year and month to filter payroll records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-40">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => (
                    <SelectItem key={y.value} value={y.value} data-testid={`option-year-${y.value}`}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val === "all" ? "" : val)}>
                <SelectTrigger data-testid="select-month">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-month-all">All Months</SelectItem>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value} data-testid={`option-month-${m.value}`}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={exportToCsv}
              disabled={records.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card data-testid="card-loading">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-loading">Loading payroll records...</p>
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card data-testid="card-empty">
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2" data-testid="text-no-records">No Payroll Records Found</p>
            <p className="text-muted-foreground mb-4" data-testid="text-no-records-description">
              {selectedMonth 
                ? `No records for ${MONTH_NAMES[parseInt(selectedMonth)]} ${selectedYear}`
                : `No records for ${selectedYear}`
              }
            </p>
            <Button onClick={() => setLocation("/admin/payroll/import")} data-testid="button-import-from-empty">
              Import Payroll Data
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-stat-employees">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-total-employees">{records.length}</p>
                    <p className="text-muted-foreground text-sm" data-testid="text-label-employees">Employee Records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-nett">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-total-nett">{formatCurrency(totalNett)}</p>
                    <p className="text-muted-foreground text-sm" data-testid="text-label-nett">Total Nett Pay</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-gross">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-total-gross">{formatCurrency(totalGross)}</p>
                    <p className="text-muted-foreground text-sm" data-testid="text-label-gross">Total Gross Wages</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-cpf">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-total-cpf">{formatCurrency(totalCpf)}</p>
                    <p className="text-muted-foreground text-sm" data-testid="text-label-cpf">Total CPF</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {(totalLeaveEncashment > 0 || totalNoPayDeduction > 0) && (
            <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20" data-testid="card-leave-payroll">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2" data-testid="text-leave-title">
                  <Calendar className="h-5 w-5" />
                  Leave-Related Payroll Data
                </CardTitle>
                <CardDescription data-testid="text-leave-description">
                  Summary of annual leave encashment and no-pay day deductions from payroll
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border" data-testid="card-leave-encashment">
                    <div>
                      <p className="font-medium" data-testid="text-encashment-label">Annual Leave Encashment</p>
                      <p className="text-sm text-muted-foreground">Total paid out for unused leave</p>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-leave-encashment">
                      {formatCurrency(totalLeaveEncashment)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background rounded-lg border" data-testid="card-nopay-deduction">
                    <div>
                      <p className="font-medium" data-testid="text-nopay-label">No-Pay Day Deductions</p>
                      <p className="text-sm text-muted-foreground">Total deducted for unpaid leave</p>
                    </div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-nopay-deduction">
                      {formatCurrency(totalNoPayDeduction)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedMonth && periods.length > 1 && (
            <Card data-testid="card-monthly-summary">
              <CardHeader>
                <CardTitle data-testid="text-monthly-title">Monthly Summary</CardTitle>
                <CardDescription data-testid="text-monthly-description">Payroll totals by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {periods.map(period => (
                    <div 
                      key={`${period.year}-${period.month}`}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      data-testid={`row-period-${period.year}-${period.month}`}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium" data-testid={`text-period-${period.year}-${period.month}`}>{period.display}</p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-count-${period.year}-${period.month}`}>{period.records.length} employees</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Gross</p>
                          <p className="font-medium" data-testid={`text-gross-${period.year}-${period.month}`}>{formatCurrency(period.totalGross)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Nett</p>
                          <p className="font-bold" data-testid={`text-nett-${period.year}-${period.month}`}>{formatCurrency(period.totalNett)}</p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                              data-testid={`button-delete-${period.year}-${period.month}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                Delete Payroll Records
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete all {period.records.length} payroll records for {period.display}? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid={`button-cancel-delete-${period.year}-${period.month}`}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteMutation.mutate({ year: period.year, month: period.month })}
                                data-testid={`button-confirm-delete-${period.year}-${period.month}`}
                              >
                                {deleteMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Delete Records
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card data-testid="card-records-table">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle data-testid="text-records-title">Payroll Records</CardTitle>
                  <CardDescription data-testid="text-records-description">
                    {selectedMonth 
                      ? `${MONTH_NAMES[parseInt(selectedMonth)]} ${selectedYear} - ${records.length} records`
                      : `${selectedYear} - ${records.length} records`
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-payroll-records">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Period</th>
                      <th className="text-left p-2 font-medium">Emp Code</th>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">Department</th>
                      <th className="text-right p-2 font-medium">Basic</th>
                      <th className="text-right p-2 font-medium">Gross</th>
                      <th className="text-right p-2 font-medium">CPF (Emp)</th>
                      <th className="text-right p-2 font-medium">Leave Enc.</th>
                      <th className="text-right p-2 font-medium">No Pay</th>
                      <th className="text-right p-2 font-medium">Nett</th>
                      <th className="text-center p-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((row, idx) => (
                      <tr 
                        key={row.id} 
                        className="border-b hover:bg-muted/30"
                        data-testid={`row-payroll-${idx}`}
                      >
                        <td className="p-2 text-muted-foreground" data-testid={`cell-period-${idx}`}>{row.payPeriod}</td>
                        <td className="p-2 font-mono" data-testid={`cell-code-${idx}`}>{row.employeeCode}</td>
                        <td className="p-2" data-testid={`cell-name-${idx}`}>{row.employeeName}</td>
                        <td className="p-2" data-testid={`cell-dept-${idx}`}>{row.deptName || '-'}</td>
                        <td className="p-2 text-right font-mono" data-testid={`cell-basic-${idx}`}>{formatCurrency(row.basicSalary)}</td>
                        <td className="p-2 text-right font-mono" data-testid={`cell-gross-${idx}`}>{formatCurrency(row.grossWages)}</td>
                        <td className="p-2 text-right font-mono" data-testid={`cell-cpf-${idx}`}>{formatCurrency(row.employeeCpf)}</td>
                        <td className="p-2 text-right font-mono text-green-600 dark:text-green-400" data-testid={`cell-encash-${idx}`}>
                          {row.annualLeaveEncashment > 0 ? formatCurrency(row.annualLeaveEncashment) : '-'}
                        </td>
                        <td className="p-2 text-right font-mono text-red-600 dark:text-red-400" data-testid={`cell-nopay-${idx}`}>
                          {row.noPayDay > 0 ? formatCurrency(row.noPayDay) : '-'}
                        </td>
                        <td className="p-2 text-right font-mono font-medium" data-testid={`cell-nett-${idx}`}>{formatCurrency(row.nett)}</td>
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayslip(row);
                              setPayslipDialogOpen(true);
                            }}
                            data-testid={`button-view-payslip-${idx}`}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Payslip
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Individual Payslip Report Dialog */}
      <Dialog open={payslipDialogOpen} onOpenChange={setPayslipDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-payslip">
          {selectedPayslip && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <DialogTitle className="flex items-center gap-2" data-testid="text-payslip-title">
                    <FileText className="h-5 w-5 print:hidden" />
                    <span className="print:hidden">Payslip Report</span>
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <DialogClose asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="button-close-payslip-header"
                        autoFocus
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </DialogClose>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                      data-testid="button-print-payslip"
                      className="print:hidden"
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 print:p-8" id="payslip-content">
                {/* Header Section */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-xl font-bold" data-testid="text-payslip-company">NexaHR HRMS</h2>
                  <p className="text-lg font-semibold mt-2" data-testid="text-payslip-period">
                    Payslip for {selectedPayslip.payPeriod}
                  </p>
                </div>

                {/* Employee Information */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee Name</p>
                    <p className="font-medium" data-testid="text-payslip-name">{selectedPayslip.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employee Code</p>
                    <p className="font-mono font-medium" data-testid="text-payslip-code">{selectedPayslip.employeeCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium" data-testid="text-payslip-dept">{selectedPayslip.deptName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Section</p>
                    <p className="font-medium" data-testid="text-payslip-section">{selectedPayslip.secName || '-'}</p>
                  </div>
                </div>

                <Separator />

                {/* Earnings Section */}
                <div>
                  <h3 className="font-semibold mb-3 text-green-600 dark:text-green-400">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-mono" data-testid="text-payslip-basic">{formatCurrency(selectedPayslip.basicSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Salary</span>
                      <span className="font-mono" data-testid="text-payslip-totsal">{formatCurrency(selectedPayslip.totSalary)}</span>
                    </div>
                    {selectedPayslip.ot10 > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>OT 1.0x</span>
                        <span className="font-mono" data-testid="text-payslip-ot10">{formatCurrency(selectedPayslip.ot10)}</span>
                      </div>
                    )}
                    {selectedPayslip.ot15 > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>OT 1.5x</span>
                        <span className="font-mono" data-testid="text-payslip-ot15">{formatCurrency(selectedPayslip.ot15)}</span>
                      </div>
                    )}
                    {selectedPayslip.ot20 > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>OT 2.0x</span>
                        <span className="font-mono" data-testid="text-payslip-ot20">{formatCurrency(selectedPayslip.ot20)}</span>
                      </div>
                    )}
                    {selectedPayslip.ot30 > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>OT 3.0x</span>
                        <span className="font-mono" data-testid="text-payslip-ot30">{formatCurrency(selectedPayslip.ot30)}</span>
                      </div>
                    )}
                    {selectedPayslip.shiftAllowance > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shift Allowance</span>
                        <span className="font-mono" data-testid="text-payslip-shift">{formatCurrency(selectedPayslip.shiftAllowance)}</span>
                      </div>
                    )}
                    {selectedPayslip.mobileAllowance > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Mobile Allowance</span>
                        <span className="font-mono" data-testid="text-payslip-mobile">{formatCurrency(selectedPayslip.mobileAllowance)}</span>
                      </div>
                    )}
                    {selectedPayslip.transportAllowance > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Transport Allowance</span>
                        <span className="font-mono" data-testid="text-payslip-transport">{formatCurrency(selectedPayslip.transportAllowance)}</span>
                      </div>
                    )}
                    {selectedPayslip.annualLeaveEncashment > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Annual Leave Encashment</span>
                        <span className="font-mono" data-testid="text-payslip-leave-enc">{formatCurrency(selectedPayslip.annualLeaveEncashment)}</span>
                      </div>
                    )}
                    {selectedPayslip.otherAllowance > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Other Allowance</span>
                        <span className="font-mono" data-testid="text-payslip-other">{formatCurrency(selectedPayslip.otherAllowance)}</span>
                      </div>
                    )}
                    {selectedPayslip.bonus > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Bonus</span>
                        <span className="font-mono" data-testid="text-payslip-bonus">{formatCurrency(selectedPayslip.bonus)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Gross Wages</span>
                      <span className="font-mono text-green-600 dark:text-green-400" data-testid="text-payslip-gross">{formatCurrency(selectedPayslip.grossWages)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Deductions Section */}
                <div>
                  <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">Deductions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Employee CPF</span>
                      <span className="font-mono" data-testid="text-payslip-emp-cpf">{formatCurrency(selectedPayslip.employeeCpf)}</span>
                    </div>
                    {selectedPayslip.noPayDay > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>No Pay Day Deduction</span>
                        <span className="font-mono" data-testid="text-payslip-nopay">{formatCurrency(selectedPayslip.noPayDay)}</span>
                      </div>
                    )}
                    {selectedPayslip.loanRepaymentTotal > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Loan Repayment</span>
                        <span className="font-mono" data-testid="text-payslip-loan">{formatCurrency(selectedPayslip.loanRepaymentTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Total Deductions</span>
                      <span className="font-mono text-red-600 dark:text-red-400" data-testid="text-payslip-total-deductions">
                        {formatCurrency(selectedPayslip.employeeCpf + selectedPayslip.noPayDay + selectedPayslip.loanRepaymentTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* CPF Information */}
                <div>
                  <h3 className="font-semibold mb-3">CPF Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>CPF Wages</span>
                      <span className="font-mono" data-testid="text-payslip-cpf-wages">{formatCurrency(selectedPayslip.cpfWages)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Employer CPF Contribution</span>
                      <span className="font-mono" data-testid="text-payslip-employer-cpf">{formatCurrency(selectedPayslip.employerCpf)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Employee CPF Contribution</span>
                      <span className="font-mono" data-testid="text-payslip-employee-cpf">{formatCurrency(selectedPayslip.employeeCpf)}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Net Pay Section */}
                <div className="p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Pay</span>
                    <span className="text-2xl font-bold font-mono" data-testid="text-payslip-nett">{formatCurrency(selectedPayslip.nett)}</span>
                  </div>
                  {selectedPayslip.payMode && (
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                      <span>Payment Mode</span>
                      <span data-testid="text-payslip-paymode">{selectedPayslip.payMode}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 print:hidden">
                  <DialogClose asChild>
                    <Button variant="outline" data-testid="button-close-payslip">
                      <X className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                  </DialogClose>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
