import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, DollarSign, Save, Loader2, History, User, Building, Calendar, X, Search, AlertCircle, CheckCircle2, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmployeePayrollSummary {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  department: string | null;
  designation: string | null;
  isApproved: boolean;
  residencyStatus: string | null;
  payType: string | null;
  basicMonthlySalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  hasPayrollConfig: boolean;
}

interface EmployeePayrollSettings {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  department: string | null;
  designation: string | null;
  residencyStatus: string | null;
  birthDate: string | null;
  sprStartDate: string | null;
  payType: string | null;
  basicMonthlySalary: number | null;
  hourlyRate: number | null;
  dailyRate: number | null;
  regularHoursPerDay: number | null;
  regularDaysPerWeek: number | null;
  defaultMobileAllowance: number | null;
  defaultTransportAllowance: number | null;
  defaultMealAllowance: number | null;
  defaultShiftAllowance: number | null;
  defaultOtherAllowance: number | null;
  defaultHouseRentalAllowance: number | null;
  salaryAdjustment: number | null;
  salaryAdjustmentReason: string | null;
}

interface AuditLog {
  id: number;
  userId: string;
  changedBy: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: string;
  createdAt: string;
}

function formatCurrency(cents: number | null): string {
  if (cents === null || cents === undefined) return "$0.00";
  return `$${(cents / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function centsToDisplay(cents: number | null): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

function displayToCents(display: string): number | null {
  if (!display || display.trim() === "") return null;
  const value = parseFloat(display);
  if (isNaN(value)) return null;
  return Math.round(value * 100);
}

function getResidencyLabel(status: string | null): string {
  if (!status) return "Not Set";
  switch (status) {
    case "SC": return "Singapore Citizen";
    case "SPR": return "Singapore PR";
    case "FOREIGNER": return "Foreigner";
    default: return status;
  }
}

function getPayTypeLabel(payType: string | null): string {
  if (!payType) return "Not Set";
  switch (payType) {
    case "monthly": return "Monthly";
    case "hourly": return "Hourly";
    case "daily": return "Daily";
    default: return payType;
  }
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    residencyStatus: "Residency Status",
    birthDate: "Date of Birth",
    sprStartDate: "SPR Start Date",
    payType: "Pay Type",
    basicMonthlySalary: "Basic Monthly Salary",
    hourlyRate: "Hourly Rate",
    dailyRate: "Daily Rate",
    regularHoursPerDay: "Regular Hours/Day",
    regularDaysPerWeek: "Regular Days/Week",
    defaultMobileAllowance: "Mobile Allowance",
    defaultTransportAllowance: "Transport Allowance",
    defaultMealAllowance: "Meal Allowance",
    defaultShiftAllowance: "Shift Allowance",
    defaultOtherAllowance: "Other Allowance",
    defaultHouseRentalAllowance: "House Rental Allowance",
    salaryAdjustment: "Salary Adjustment",
    salaryAdjustmentReason: "Adjustment Reason",
    role: "Role",
    password: "Password",
  };
  return labels[field] || field;
}

export default function AdminEmployeePayrollPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: employeeList, isLoading: isLoadingList, error: listError } = useQuery<{ employees: EmployeePayrollSummary[] }>({
    queryKey: ["/api/admin/employees/payroll-list"],
  });

  const filteredEmployees = employeeList?.employees?.filter(emp => {
    const search = searchTerm.toLowerCase();
    return (
      (emp.name || "").toLowerCase().includes(search) ||
      (emp.email || "").toLowerCase().includes(search) ||
      (emp.employeeCode || "").toLowerCase().includes(search) ||
      (emp.department || "").toLowerCase().includes(search)
    );
  }) || [];

  const handleEditEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setEditDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/payroll")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Employee Payroll Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure employee pay rates, residency status, and default allowances
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Employee List
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-employees"
              />
            </div>
          </div>
          <CardDescription>
            {filteredEmployees.length} employee(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : listError ? (
            <div className="text-center py-12">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive font-medium">Failed to load employees</p>
              <p className="text-sm text-muted-foreground mt-1">
                {(listError as Error).message || "Please try refreshing the page"}
              </p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Residency</TableHead>
                    <TableHead>Pay Type</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{employee.employeeCode || "-"}</span>
                      </TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={employee.residencyStatus ? "secondary" : "outline"}>
                          {getResidencyLabel(employee.residencyStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.payType ? "secondary" : "outline"}>
                          {getPayTypeLabel(employee.payType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.payType === "monthly" && employee.basicMonthlySalary
                          ? formatCurrency(employee.basicMonthlySalary)
                          : employee.payType === "hourly" && employee.hourlyRate
                          ? `${formatCurrency(employee.hourlyRate)}/hr`
                          : employee.payType === "daily" && employee.dailyRate
                          ? `${formatCurrency(employee.dailyRate)}/day`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {employee.hasPayrollConfig ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Configured
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Incomplete
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEmployee(employee.id)}
                          data-testid={`button-edit-${employee.id}`}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EditEmployeeDialog
        employeeId={selectedEmployeeId}
        employeeName={employeeList?.employees?.find(e => e.id === selectedEmployeeId)?.name || null}
        employeeCode={employeeList?.employees?.find(e => e.id === selectedEmployeeId)?.employeeCode || null}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setSelectedEmployeeId(null);
        }}
      />
    </div>
  );
}

interface EditEmployeeDialogProps {
  employeeId: string | null;
  employeeName: string | null;
  employeeCode: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function EditEmployeeDialog({ employeeId, employeeName, employeeCode, open, onOpenChange }: EditEmployeeDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");

  const { data: settings, isLoading: isLoadingSettings } = useQuery<EmployeePayrollSettings>({
    queryKey: ["/api/admin/employees", employeeId, "payroll-settings"],
    enabled: !!employeeId && open,
  });

  const { data: auditData, isLoading: isLoadingAudit } = useQuery<{ employee: { id: string; name: string; employeeCode: string | null }; auditLogs: AuditLog[] }>({
    queryKey: ["/api/admin/employees", employeeId, "audit-logs"],
    enabled: !!employeeId && open && activeTab === "history",
  });

  const [formState, setFormState] = useState<Partial<EmployeePayrollSettings>>({});

  const updateField = (field: keyof EmployeePayrollSettings, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = {};
      
      if (formState.residencyStatus !== undefined) {
        updates.residencyStatus = formState.residencyStatus || null;
      }
      if (formState.birthDate !== undefined) {
        updates.birthDate = formState.birthDate || null;
      }
      if (formState.sprStartDate !== undefined) {
        updates.sprStartDate = formState.sprStartDate || null;
      }
      if (formState.payType !== undefined) {
        updates.payType = formState.payType || null;
      }
      if (formState.basicMonthlySalary !== undefined) {
        updates.basicMonthlySalary = formState.basicMonthlySalary;
      }
      if (formState.hourlyRate !== undefined) {
        updates.hourlyRate = formState.hourlyRate;
      }
      if (formState.dailyRate !== undefined) {
        updates.dailyRate = formState.dailyRate;
      }
      if (formState.regularHoursPerDay !== undefined) {
        updates.regularHoursPerDay = formState.regularHoursPerDay;
      }
      if (formState.regularDaysPerWeek !== undefined) {
        updates.regularDaysPerWeek = formState.regularDaysPerWeek;
      }
      if (formState.defaultMobileAllowance !== undefined) {
        updates.defaultMobileAllowance = formState.defaultMobileAllowance;
      }
      if (formState.defaultTransportAllowance !== undefined) {
        updates.defaultTransportAllowance = formState.defaultTransportAllowance;
      }
      if (formState.defaultMealAllowance !== undefined) {
        updates.defaultMealAllowance = formState.defaultMealAllowance;
      }
      if (formState.defaultShiftAllowance !== undefined) {
        updates.defaultShiftAllowance = formState.defaultShiftAllowance;
      }
      if (formState.defaultOtherAllowance !== undefined) {
        updates.defaultOtherAllowance = formState.defaultOtherAllowance;
      }
      if (formState.defaultHouseRentalAllowance !== undefined) {
        updates.defaultHouseRentalAllowance = formState.defaultHouseRentalAllowance;
      }
      if (formState.salaryAdjustment !== undefined) {
        updates.salaryAdjustment = formState.salaryAdjustment;
      }
      if (formState.salaryAdjustmentReason !== undefined) {
        updates.salaryAdjustmentReason = formState.salaryAdjustmentReason || null;
      }

      const response = await apiRequest("PATCH", `/api/admin/employees/${employeeId}/payroll-settings`, updates);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Settings Saved",
        description: `Updated ${data.changesLogged} field(s) for ${settings?.name || "employee"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees/payroll-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees", employeeId, "payroll-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees", employeeId, "audit-logs"] });
      setFormState({});
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (Object.keys(formState).length === 0) {
      toast({
        title: "No Changes",
        description: "No changes have been made",
        variant: "default",
      });
      return;
    }
    saveMutation.mutate();
  };

  const getValue = <K extends keyof EmployeePayrollSettings>(field: K): EmployeePayrollSettings[K] | undefined => {
    if (field in formState) return formState[field] as EmployeePayrollSettings[K];
    return settings?.[field];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {employeeName || settings?.name || "Employee Settings"}
          </DialogTitle>
          <DialogDescription>
            {(employeeCode || settings?.employeeCode) && <span className="font-mono">{employeeCode || settings?.employeeCode}</span>}
            {(employeeCode || settings?.employeeCode) && settings?.department && " • "}
            {settings?.department}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" data-testid="tab-settings">
              <DollarSign className="h-4 w-4 mr-2" />
              Payroll Settings
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              Audit History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-4">
            {isLoadingSettings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-6 pr-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">CPF & Residency</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Residency Status</Label>
                          <Select
                            value={getValue("residencyStatus") || ""}
                            onValueChange={(v) => updateField("residencyStatus", v || null)}
                          >
                            <SelectTrigger data-testid="select-residency">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SC">Singapore Citizen</SelectItem>
                              <SelectItem value="SPR">Singapore PR</SelectItem>
                              <SelectItem value="FOREIGNER">Foreigner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Date of Birth</Label>
                          <Input
                            type="date"
                            value={getValue("birthDate") || ""}
                            onChange={(e) => updateField("birthDate", e.target.value || null)}
                            data-testid="input-birthdate"
                          />
                        </div>
                      </div>
                      {getValue("residencyStatus") === "SPR" && (
                        <div>
                          <Label>SPR Start Date (for graduated CPF rates)</Label>
                          <Input
                            type="date"
                            value={getValue("sprStartDate") || ""}
                            onChange={(e) => updateField("sprStartDate", e.target.value || null)}
                            data-testid="input-spr-start"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Pay Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Pay Type</Label>
                          <Select
                            value={getValue("payType") || ""}
                            onValueChange={(v) => updateField("payType", v || null)}
                          >
                            <SelectTrigger data-testid="select-paytype">
                              <SelectValue placeholder="Select pay type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="hourly">Hourly</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Regular Hours/Day</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={getValue("regularHoursPerDay") ?? 8}
                            onChange={(e) => updateField("regularHoursPerDay", parseFloat(e.target.value) || 8)}
                            data-testid="input-hours-per-day"
                          />
                        </div>
                        <div>
                          <Label>Work Schedule</Label>
                          <Select
                            value={String(getValue("regularDaysPerWeek") ?? 5)}
                            onValueChange={(v) => updateField("regularDaysPerWeek", parseFloat(v))}
                          >
                            <SelectTrigger data-testid="select-days-per-week">
                              <SelectValue placeholder="Select schedule" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5-Day Week</SelectItem>
                              <SelectItem value="5.5">5.5-Day Week</SelectItem>
                              <SelectItem value="0">Executive (Monthly)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(getValue("regularDaysPerWeek") ?? 5) === 0 
                              ? "Executive: Monthly salary, no daily/hourly rate calculation"
                              : `Daily rate = (Basic × 12) ÷ (${getValue("regularDaysPerWeek") ?? 5} × 52)`}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Basic Monthly Salary ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("basicMonthlySalary") ?? null)}
                            onChange={(e) => updateField("basicMonthlySalary", displayToCents(e.target.value))}
                            data-testid="input-monthly-salary"
                          />
                        </div>
                        <div>
                          <Label>Hourly Rate ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("hourlyRate") ?? null)}
                            onChange={(e) => updateField("hourlyRate", displayToCents(e.target.value))}
                            data-testid="input-hourly-rate"
                          />
                        </div>
                        <div>
                          <Label>Daily Rate ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("dailyRate") ?? null)}
                            onChange={(e) => updateField("dailyRate", displayToCents(e.target.value))}
                            data-testid="input-daily-rate"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Default Allowances</CardTitle>
                      <CardDescription>These are applied automatically when generating payroll</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Mobile Allowance ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("defaultMobileAllowance") ?? null)}
                            onChange={(e) => updateField("defaultMobileAllowance", displayToCents(e.target.value))}
                            data-testid="input-mobile-allowance"
                          />
                        </div>
                        <div>
                          <Label>Transport Allowance ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("defaultTransportAllowance") ?? null)}
                            onChange={(e) => updateField("defaultTransportAllowance", displayToCents(e.target.value))}
                            data-testid="input-transport-allowance"
                          />
                        </div>
                        <div>
                          <Label>Meal Allowance ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("defaultMealAllowance") ?? null)}
                            onChange={(e) => updateField("defaultMealAllowance", displayToCents(e.target.value))}
                            data-testid="input-meal-allowance"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Shift Allowance ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("defaultShiftAllowance") ?? null)}
                            onChange={(e) => updateField("defaultShiftAllowance", displayToCents(e.target.value))}
                            data-testid="input-shift-allowance"
                          />
                        </div>
                        <div>
                          <Label>Other Allowance ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("defaultOtherAllowance") ?? null)}
                            onChange={(e) => updateField("defaultOtherAllowance", displayToCents(e.target.value))}
                            data-testid="input-other-allowance"
                          />
                        </div>
                        <div>
                          <Label>House Rental ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("defaultHouseRentalAllowance") ?? null)}
                            onChange={(e) => updateField("defaultHouseRentalAllowance", displayToCents(e.target.value))}
                            data-testid="input-house-rental"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Salary Adjustment</CardTitle>
                      <CardDescription>One-time adjustment to base salary (positive or negative)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Adjustment Amount ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={centsToDisplay(getValue("salaryAdjustment") ?? null)}
                            onChange={(e) => updateField("salaryAdjustment", displayToCents(e.target.value))}
                            data-testid="input-salary-adjustment"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Adjustment Reason</Label>
                        <Textarea
                          placeholder="Reason for salary adjustment..."
                          value={getValue("salaryAdjustmentReason") || ""}
                          onChange={(e) => updateField("salaryAdjustmentReason", e.target.value || null)}
                          data-testid="input-adjustment-reason"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save">
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {isLoadingAudit ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                {auditData?.auditLogs && auditData.auditLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                        <TableHead>Changed By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditData.auditLogs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getFieldLabel(log.fieldChanged)}</Badge>
                          </TableCell>
                          <TableCell className="max-w-32 truncate text-muted-foreground">
                            {log.oldValue || "-"}
                          </TableCell>
                          <TableCell className="max-w-32 truncate">
                            {log.newValue || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{log.changedBy}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit history found for this employee</p>
                  </div>
                )}
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
