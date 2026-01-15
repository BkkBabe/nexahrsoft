import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, FileSpreadsheet, Users, DollarSign, Calendar, Trash2, Loader2, TrendingUp, AlertTriangle, FileText, X, Search, Pencil, UserPlus, CheckCircle2, Copy, Check, CreditCard, Calculator, ClipboardEdit, Settings, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PayrollRecord, CompanySettings } from "@shared/schema";
import PayslipView from "@/components/PayslipView";
import EditPayslipModal from "@/components/EditPayslipModal";
import PayrollAdjustmentsDialog from "@/components/PayrollAdjustmentsDialog";
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
const currentMonth = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

const generatePeriodOptions = () => {
  const options: { value: string; label: string; isYearOnly?: boolean }[] = [];
  
  for (let yearOffset = 0; yearOffset < 3; yearOffset++) {
    const year = currentYear - yearOffset;
    options.push({ value: `${year}-all`, label: `All ${year}`, isYearOnly: true });
    
    const startMonth = yearOffset === 0 ? currentMonth : 12;
    for (let month = startMonth; month >= 1; month--) {
      options.push({ 
        value: `${year}-${month}`, 
        label: `${MONTH_NAMES[month]} ${year}` 
      });
    }
  }
  
  return options;
};

const PERIOD_OPTIONS = generatePeriodOptions();

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface NewUserForm {
  employeeCode: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  section: string;
  mobileNumber: string;
  gender: string;
  joinDate: string;
  role: "user" | "admin";
}

const initialFormState: NewUserForm = {
  employeeCode: "",
  name: "",
  email: "",
  department: "",
  designation: "",
  section: "",
  mobileNumber: "",
  gender: "",
  joinDate: "",
  role: "user",
};

export default function AdminPayrollReportsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(`${currentYear}-1`);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);
  
  const parsePeriod = (period: string) => {
    const [year, monthOrAll] = period.split('-');
    return {
      year,
      month: monthOrAll === 'all' ? '' : monthOrAll
    };
  };
  
  const { year: selectedYear, month: selectedMonth } = parsePeriod(selectedPeriod);
  const [payslipDialogOpen, setPayslipDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(initialFormState);
  const [createdUserInfo, setCreatedUserInfo] = useState<{ username: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Adjustments dialog state
  const [adjustmentsDialogOpen, setAdjustmentsDialogOpen] = useState(false);
  const [adjustmentsRecord, setAdjustmentsRecord] = useState<PayrollRecord | null>(null);

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

  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company/settings'],
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

  const createUserMutation = useMutation({
    mutationFn: async (data: NewUserForm) => {
      const response = await apiRequest("POST", "/api/admin/users/create", data);
      return await response.json();
    },
    onSuccess: (data: { success: boolean; user: { username?: string; employeeCode?: string }; initialPassword: string; message: string }) => {
      toast({
        title: "Employee Created",
        description: data.message,
      });
      setCreatedUserInfo({
        username: data.user.username || data.user.employeeCode || "",
        password: data.initialPassword,
      });
      setNewUserForm(initialFormState);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const handleFormChange = (field: keyof NewUserForm, value: string) => {
    setNewUserForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = () => {
    if (!newUserForm.employeeCode || !newUserForm.name || !newUserForm.email) {
      toast({
        title: "Missing Required Fields",
        description: "Employee code, name, and email are required.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUserForm);
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const allRecords = data?.records || [];
  
  const records = useMemo(() => {
    if (!searchQuery.trim()) return allRecords;
    const query = searchQuery.toLowerCase();
    return allRecords.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(query) ||
        r.employeeCode.toLowerCase().includes(query)
    );
  }, [allRecords, searchQuery]);

  // Helper to safely parse numeric values (API returns strings from PostgreSQL numeric type)
  const parseAmount = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Format currency from dollars (not cents anymore)
  const formatCurrency = (dollars: number | string | null | undefined) => {
    const amount = parseAmount(dollars);
    return `$${amount.toFixed(2)}`;
  };

  const totalNett = records.reduce((sum, r) => sum + parseAmount(r.nett), 0);
  const totalGross = records.reduce((sum, r) => sum + parseAmount(r.grossWages), 0);
  const totalCpf = records.reduce((sum, r) => sum + parseAmount(r.employerCpf) + Math.abs(parseAmount(r.employeeCpf)), 0);
  const totalLeaveEncashment = records.reduce((sum, r) => sum + parseAmount(r.annualLeaveEncashment), 0);
  const totalNoPayDeduction = records.reduce((sum, r) => sum + parseAmount(r.noPayDay), 0);

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
    acc[key].totalNett += parseAmount(record.nett);
    acc[key].totalGross += parseAmount(record.grossWages);
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
        parseAmount(r.basicSalary).toFixed(2),
        parseAmount(r.totSalary).toFixed(2),
        parseAmount(r.ot10).toFixed(2),
        parseAmount(r.ot15).toFixed(2),
        parseAmount(r.ot20).toFixed(2),
        parseAmount(r.ot30).toFixed(2),
        parseAmount(r.shiftAllowance).toFixed(2),
        parseAmount(r.mobileAllowance).toFixed(2),
        parseAmount(r.transportAllowance).toFixed(2),
        parseAmount(r.annualLeaveEncashment).toFixed(2),
        parseAmount(r.otherAllowance).toFixed(2),
        parseAmount(r.bonus).toFixed(2),
        parseAmount(r.grossWages).toFixed(2),
        parseAmount(r.cpfWages).toFixed(2),
        parseAmount(r.employerCpf).toFixed(2),
        parseAmount(r.employeeCpf).toFixed(2),
        parseAmount(r.noPayDay).toFixed(2),
        parseAmount(r.loanRepaymentTotal).toFixed(2),
        parseAmount(r.nett).toFixed(2),
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Payroll Management</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">Manage payroll, loans, adjustments, and employee settings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLocation("/admin/dashboard")} data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button onClick={() => setLocation("/admin/payroll/import")} data-testid="button-import-new">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import New Data
          </Button>
        </div>
      </div>

      {/* Quick Actions Navigation */}
      <Card data-testid="card-quick-actions">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg" data-testid="text-quick-actions-title">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Button 
              variant="outline" 
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => setLocation("/admin/payroll/loans")}
              data-testid="button-manage-loans"
            >
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">Manage Loans</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => setLocation("/admin/payroll/generate")}
              data-testid="button-generate-payroll"
            >
              <Calculator className="h-5 w-5" />
              <span className="text-xs">Generate from Attendance</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => setLocation("/admin/payroll/adjustments")}
              data-testid="button-payroll-adjustments"
            >
              <ClipboardEdit className="h-5 w-5" />
              <span className="text-xs">Payroll Adjustments</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => setLocation("/admin/payroll/employees")}
              data-testid="button-employee-payroll"
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs">Employee Payroll Settings</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => setLocation("/admin/attendance?tab=heatmap&from=payroll")}
              data-testid="button-heatmap"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">Attendance Heatmap</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => setLocation("/admin/payroll/import")}
              data-testid="button-import-payroll"
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-xs">Import Payroll</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-filter">
        <CardHeader>
          <CardTitle data-testid="text-filter-title">Filter Records</CardTitle>
          <CardDescription data-testid="text-filter-description">Select period to filter payroll records, or search by employee name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-48">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger data-testid="select-period">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(p => (
                    <SelectItem 
                      key={p.value} 
                      value={p.value} 
                      data-testid={`option-period-${p.value}`}
                      className={p.isYearOnly ? "font-semibold" : ""}
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px] max-w-sm relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
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

      {/* Add Employee Card */}
      <Card data-testid="card-add-employee">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Individual Employee
              </CardTitle>
              <CardDescription>
                Create a new employee account with login credentials
              </CardDescription>
            </div>
            <Button
              variant={showAddForm ? "outline" : "default"}
              onClick={() => {
                setShowAddForm(!showAddForm);
                setCreatedUserInfo(null);
              }}
              data-testid="button-toggle-add-form"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {showAddForm ? "Hide Form" : "Add Employee"}
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4">
            {createdUserInfo ? (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Employee Created Successfully!</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-background rounded-md p-3 border">
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-mono font-medium" data-testid="text-created-username">{createdUserInfo.username}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(createdUserInfo.username, "username")}
                      data-testid="button-copy-username"
                    >
                      {copiedField === "username" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white dark:bg-background rounded-md p-3 border">
                    <div>
                      <p className="text-xs text-muted-foreground">Initial Password</p>
                      <p className="font-mono font-medium" data-testid="text-created-password">{createdUserInfo.password}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(createdUserInfo.password, "password")}
                      data-testid="button-copy-password"
                    >
                      {copiedField === "password" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share these credentials with the employee. They will be required to change their password on first login.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setCreatedUserInfo(null)}
                  data-testid="button-add-another"
                >
                  Add Another Employee
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeCode">Employee Code *</Label>
                    <Input
                      id="employeeCode"
                      placeholder="e.g., EMP001"
                      value={newUserForm.employeeCode}
                      onChange={(e) => handleFormChange("employeeCode", e.target.value)}
                      data-testid="input-employee-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., John Smith"
                      value={newUserForm.name}
                      onChange={(e) => handleFormChange("name", e.target.value)}
                      data-testid="input-employee-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., john@company.com"
                      value={newUserForm.email}
                      onChange={(e) => handleFormChange("email", e.target.value)}
                      data-testid="input-employee-email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      placeholder="e.g., Engineering"
                      value={newUserForm.department}
                      onChange={(e) => handleFormChange("department", e.target.value)}
                      data-testid="input-employee-department"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      placeholder="e.g., Software Engineer"
                      value={newUserForm.designation}
                      onChange={(e) => handleFormChange("designation", e.target.value)}
                      data-testid="input-employee-designation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      placeholder="e.g., Backend Team"
                      value={newUserForm.section}
                      onChange={(e) => handleFormChange("section", e.target.value)}
                      data-testid="input-employee-section"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="e.g., +65 9123 4567"
                      value={newUserForm.mobileNumber}
                      onChange={(e) => handleFormChange("mobileNumber", e.target.value)}
                      data-testid="input-employee-mobile"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={newUserForm.gender}
                      onValueChange={(value) => handleFormChange("gender", value)}
                    >
                      <SelectTrigger data-testid="select-employee-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Join Date</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={newUserForm.joinDate}
                      onChange={(e) => handleFormChange("joinDate", e.target.value)}
                      data-testid="input-employee-join-date"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewUserForm(initialFormState);
                    }}
                    data-testid="button-cancel-add"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={createUserMutation.isPending}
                    data-testid="button-create-employee"
                  >
                    {createUserMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Create Employee
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        )}
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
                {records.length > 0 && selectedMonth && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                        data-testid="button-delete-current-period"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Records
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          Delete Payroll Records
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete all {records.length} payroll records for {MONTH_NAMES[parseInt(selectedMonth)]} {selectedYear}? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete-current">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => deleteMutation.mutate({ year: parseInt(selectedYear), month: parseInt(selectedMonth) })}
                          data-testid="button-confirm-delete-current"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Delete Records
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-payroll-records">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-center p-2 font-medium w-12">#</th>
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
                        <td className="p-2 text-center text-muted-foreground" data-testid={`cell-serial-${idx}`}>{idx + 1}</td>
                        <td className="p-2" data-testid={`cell-name-${idx}`}>{row.employeeName}</td>
                        <td className="p-2" data-testid={`cell-dept-${idx}`}>{row.deptName || '-'}</td>
                        <td className="p-2 text-right font-mono" data-testid={`cell-basic-${idx}`}>{formatCurrency(row.basicSalary)}</td>
                        <td className="p-2 text-right font-mono" data-testid={`cell-gross-${idx}`}>{formatCurrency(row.grossWages)}</td>
                        <td className="p-2 text-right font-mono" data-testid={`cell-cpf-${idx}`}>{formatCurrency(row.employeeCpf)}</td>
                        <td className="p-2 text-right font-mono text-green-600 dark:text-green-400" data-testid={`cell-encash-${idx}`}>
                          {parseAmount(row.annualLeaveEncashment) > 0 ? formatCurrency(row.annualLeaveEncashment) : '-'}
                        </td>
                        <td className="p-2 text-right font-mono text-red-600 dark:text-red-400" data-testid={`cell-nopay-${idx}`}>
                          {parseAmount(row.noPayDay) > 0 ? formatCurrency(row.noPayDay) : '-'}
                        </td>
                        <td className="p-2 text-right font-mono font-medium" data-testid={`cell-nett-${idx}`}>{formatCurrency(row.nett)}</td>
                        <td className="p-2 text-center">
                          <div className="flex gap-2">
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
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (row.userId) {
                                  setAdjustmentsRecord(row);
                                  setAdjustmentsDialogOpen(true);
                                } else {
                                  toast({
                                    title: "Cannot Add Adjustments",
                                    description: "This payroll record is not linked to an employee account.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              data-testid={`button-adjustments-payslip-${idx}`}
                            >
                              <ClipboardEdit className="h-4 w-4 mr-1" />
                              Adjustments
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (row.userId) {
                                  setLocation(`/admin/payroll/employees?employeeId=${row.userId}`);
                                } else {
                                  toast({
                                    title: "Cannot Edit",
                                    description: "This payroll record is not linked to an employee account.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              data-testid={`button-edit-payslip-${idx}`}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Settings
                            </Button>
                          </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-payslip">
          {selectedPayslip && (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle className="flex items-center gap-2" data-testid="text-payslip-title">
                  <FileText className="h-5 w-5" />
                  Payslip Report
                </DialogTitle>
              </DialogHeader>
              
              <PayslipView
                record={selectedPayslip}
                companySettings={companySettings}
                defaultMode="employer"
                showToggle={true}
                onPrint={() => {
                  const companyName = companySettings?.companyName || "Company";
                  const employeeName = selectedPayslip.employeeName || "Employee";
                  const payPeriod = selectedPayslip.payPeriod || "";
                  const originalTitle = document.title;
                  document.title = `${companyName} - ${employeeName} Salary Voucher ${payPeriod}`.trim();
                  setTimeout(() => {
                    window.print();
                    document.title = originalTitle;
                  }, 100);
                }}
              />

              <div className="flex justify-end gap-2 pt-4 print:hidden">
                <DialogClose asChild>
                  <Button variant="outline" data-testid="button-close-payslip">
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </DialogClose>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payslip Modal */}
      <EditPayslipModal
        record={editRecord}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditRecord(null);
        }}
        onSaved={() => {
          queryClient.invalidateQueries({
            queryKey: ['/api/admin/payroll/records'],
            exact: false,
          });
        }}
      />

      {/* Payroll Adjustments Dialog */}
      <PayrollAdjustmentsDialog
        open={adjustmentsDialogOpen}
        onOpenChange={setAdjustmentsDialogOpen}
        record={adjustmentsRecord}
      />
    </div>
  );
}
