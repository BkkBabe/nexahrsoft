import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, DollarSign, Save, Loader2, History, User, Building, Calendar, X, Search, AlertCircle, CheckCircle2, Edit, Plus, Trash2, PlusCircle, MinusCircle } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

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

interface SalaryAdjustment {
  id: string;
  userId: string;
  adjustmentType: "addition" | "deduction";
  amount: number;
  description: string | null;
  isActive: boolean;
  showForEmployee: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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

function formatCurrency(dollars: number | null): string {
  if (dollars === null || dollars === undefined) return "$0.00";
  return `$${Number(dollars).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dollarsToDisplay(dollars: number | null): string {
  if (dollars === null || dollars === undefined) return "";
  return Number(dollars).toFixed(2);
}

function displayToDollars(display: string): number | null {
  if (!display || display.trim() === "") return null;
  const value = parseFloat(display);
  if (isNaN(value)) return null;
  return Math.round(value * 100) / 100; // Round to 2 decimal places
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

function calculateCompletionPercentage(employee: EmployeePayrollSummary): number {
  const fields = [
    employee.residencyStatus,
    employee.basicMonthlySalary,
  ];
  const filledCount = fields.filter(f => f !== null && f !== undefined).length;
  return Math.round((filledCount / fields.length) * 100);
}

function toTitleCase(str: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
  const [urlParamProcessed, setUrlParamProcessed] = useState(false);
  const [returnToGenerate, setReturnToGenerate] = useState<string | null>(null);

  const { data: employeeList, isLoading: isLoadingList, error: listError } = useQuery<{ employees: EmployeePayrollSummary[] }>({
    queryKey: ["/api/admin/employees/payroll-list"],
  });

  // Check for employeeId query parameter to auto-open edit dialog
  useEffect(() => {
    if (!urlParamProcessed && employeeList?.employees) {
      const urlParams = new URLSearchParams(window.location.search);
      const employeeId = urlParams.get('employeeId');
      const returnTo = urlParams.get('returnTo');
      const period = urlParams.get('period');
      
      if (employeeId) {
        // Verify the employee exists in the list
        const employee = employeeList.employees.find(emp => emp.id === employeeId);
        if (employee) {
          setSelectedEmployeeId(employeeId);
          setEditDialogOpen(true);
          
          // Store return info if coming from generate page
          if (returnTo === 'generate' && period) {
            setReturnToGenerate(period);
          }
        }
        setUrlParamProcessed(true);
      }
    }
  }, [employeeList, urlParamProcessed]);
  
  // Handle dialog close - return to generate page if came from there
  const handleDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open && returnToGenerate) {
      // Navigate back to generate payroll page with the period
      setLocation(`/admin/payroll/generate`);
      setReturnToGenerate(null);
    }
  };

  const filteredEmployees = (employeeList?.employees?.filter(emp => {
    const search = searchTerm.toLowerCase();
    return (
      (emp.name || "").toLowerCase().includes(search) ||
      (emp.email || "").toLowerCase().includes(search) ||
      (emp.employeeCode || "").toLowerCase().includes(search) ||
      (emp.department || "").toLowerCase().includes(search)
    );
  }) || []).sort((a, b) => {
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const handleEditEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setEditDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/admin/payroll")}
          data-testid="button-back"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Payroll Management
        </Button>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Employee Payroll Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure employee residency status, monthly salary, and allowances
            </p>
          </div>
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
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Residency</TableHead>
                    <TableHead>Monthly Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee, index) => (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{toTitleCase(employee.name)}</div>
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
                        {employee.basicMonthlySalary
                          ? formatCurrency(employee.basicMonthlySalary)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const completion = calculateCompletionPercentage(employee);
                          if (completion === 100) {
                            return (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Badge>
                            );
                          } else if (completion > 0) {
                            return (
                              <Badge variant="outline" className="border-amber-500 text-amber-600">
                                {completion}% Complete
                              </Badge>
                            );
                          } else {
                            return (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Incomplete
                              </Badge>
                            );
                          }
                        })()}
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
        key={selectedEmployeeId || "empty"}
        employeeId={selectedEmployeeId}
        employeeName={employeeList?.employees?.find(e => e.id === selectedEmployeeId)?.name || null}
        employeeCode={employeeList?.employees?.find(e => e.id === selectedEmployeeId)?.employeeCode || null}
        open={editDialogOpen}
        onOpenChange={(open) => {
          handleDialogClose(open);
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
    queryKey: [`/api/admin/employees/${employeeId}/payroll-settings`],
    enabled: !!employeeId && open,
  });

  const { data: auditData, isLoading: isLoadingAudit } = useQuery<{ employee: { id: string; name: string; employeeCode: string | null }; auditLogs: AuditLog[] }>({
    queryKey: [`/api/admin/employees/${employeeId}/audit-logs`],
    enabled: !!employeeId && open && activeTab === "history",
  });

  const [formState, setFormState] = useState<Partial<EmployeePayrollSettings>>({});
  const [salaryInputText, setSalaryInputText] = useState<string>("");
  const [salaryInputDirty, setSalaryInputDirty] = useState(false);
  
  const [allowanceInputs, setAllowanceInputs] = useState({
    mobile: "",
    transport: "",
    meal: "",
    shift: "",
    other: "",
    houseRental: "",
  });
  const [allowancesDirty, setAllowancesDirty] = useState(false);

  useEffect(() => {
    if (!salaryInputDirty) {
      if (settings?.basicMonthlySalary !== undefined && settings.basicMonthlySalary !== null) {
        setSalaryInputText(dollarsToDisplay(settings.basicMonthlySalary));
      } else {
        setSalaryInputText("");
      }
    }
  }, [settings?.basicMonthlySalary, salaryInputDirty]);

  useEffect(() => {
    if (!open) {
      setSalaryInputDirty(false);
      setSalaryInputText("");
      setAllowancesDirty(false);
      setAllowanceInputs({ mobile: "", transport: "", meal: "", shift: "", other: "", houseRental: "" });
    }
  }, [open]);

  useEffect(() => {
    if (!allowancesDirty && settings) {
      setAllowanceInputs({
        mobile: dollarsToDisplay(settings.defaultMobileAllowance ?? null),
        transport: dollarsToDisplay(settings.defaultTransportAllowance ?? null),
        meal: dollarsToDisplay(settings.defaultMealAllowance ?? null),
        shift: dollarsToDisplay(settings.defaultShiftAllowance ?? null),
        other: dollarsToDisplay(settings.defaultOtherAllowance ?? null),
        houseRental: dollarsToDisplay(settings.defaultHouseRentalAllowance ?? null),
      });
    }
  }, [settings, allowancesDirty]);

  const updateField = (field: keyof EmployeePayrollSettings, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleAllowanceChange = (key: keyof typeof allowanceInputs, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAllowanceInputs(prev => ({ ...prev, [key]: value }));
      setAllowancesDirty(true);
    }
  };

  const handleAllowanceBlur = (key: keyof typeof allowanceInputs, field: keyof EmployeePayrollSettings) => {
    const value = allowanceInputs[key];
    if (value && !isNaN(parseFloat(value))) {
      const formatted = parseFloat(value).toFixed(2);
      setAllowanceInputs(prev => ({ ...prev, [key]: formatted }));
      updateField(field, displayToDollars(formatted));
    } else if (value === "") {
      updateField(field, null);
    }
  };

  const allowanceKeyDownHandler = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) return;
    if ((e.metaKey || e.ctrlKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
    if (!/[\d.]/.test(e.key)) {
      e.preventDefault();
    }
    if (e.key === '.' && e.currentTarget.value.includes('.')) {
      e.preventDefault();
    }
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
      if (formState.basicMonthlySalary !== undefined) {
        updates.basicMonthlySalary = formState.basicMonthlySalary;
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

      const response = await apiRequest("PATCH", `/api/admin/employees/${employeeId}/payroll-settings`, updates);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Settings Saved",
        description: `Updated ${data.changesLogged} field(s) for ${settings?.name || "employee"}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees/payroll-list"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/employees/${employeeId}/payroll-settings`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/employees/${employeeId}/audit-logs`] });
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
                              <SelectItem value="SC" data-testid="option-residency-sc">Singapore Citizen</SelectItem>
                              <SelectItem value="SPR" data-testid="option-residency-spr">Singapore PR</SelectItem>
                              <SelectItem value="FOREIGNER" data-testid="option-residency-foreigner">Foreigner</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getValue("residencyStatus") === "FOREIGNER" && "No CPF contributions for foreigners"}
                          </p>
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
                      <CardTitle className="text-lg">Monthly Salary</CardTitle>
                      <CardDescription>Base monthly salary before allowances and adjustments</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <Label>Basic Monthly Salary ($)</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={salaryInputText}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setSalaryInputText(value);
                              setSalaryInputDirty(true);
                              // Also update formState on change so the save button knows there are changes
                              if (value && !isNaN(parseFloat(value))) {
                                updateField("basicMonthlySalary", displayToDollars(value));
                              } else if (value === "") {
                                updateField("basicMonthlySalary", null);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                            if (allowedKeys.includes(e.key)) return;
                            if ((e.metaKey || e.ctrlKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                            if (!/[\d.]/.test(e.key)) {
                              e.preventDefault();
                            }
                            if (e.key === '.' && e.currentTarget.value.includes('.')) {
                              e.preventDefault();
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value && !isNaN(parseFloat(value))) {
                              const formatted = parseFloat(value).toFixed(2);
                              setSalaryInputText(formatted);
                              updateField("basicMonthlySalary", displayToDollars(formatted));
                            } else if (value === "") {
                              updateField("basicMonthlySalary", null);
                            }
                          }}
                          className="max-w-xs"
                          data-testid="input-monthly-salary"
                        />
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
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={allowanceInputs.mobile}
                            onChange={(e) => handleAllowanceChange("mobile", e.target.value)}
                            onKeyDown={allowanceKeyDownHandler}
                            onBlur={() => handleAllowanceBlur("mobile", "defaultMobileAllowance")}
                            data-testid="input-mobile-allowance"
                          />
                        </div>
                        <div>
                          <Label>Transport Allowance ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={allowanceInputs.transport}
                            onChange={(e) => handleAllowanceChange("transport", e.target.value)}
                            onKeyDown={allowanceKeyDownHandler}
                            onBlur={() => handleAllowanceBlur("transport", "defaultTransportAllowance")}
                            data-testid="input-transport-allowance"
                          />
                        </div>
                        <div>
                          <Label>Meal Allowance ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={allowanceInputs.meal}
                            onChange={(e) => handleAllowanceChange("meal", e.target.value)}
                            onKeyDown={allowanceKeyDownHandler}
                            onBlur={() => handleAllowanceBlur("meal", "defaultMealAllowance")}
                            data-testid="input-meal-allowance"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Shift Allowance ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={allowanceInputs.shift}
                            onChange={(e) => handleAllowanceChange("shift", e.target.value)}
                            onKeyDown={allowanceKeyDownHandler}
                            onBlur={() => handleAllowanceBlur("shift", "defaultShiftAllowance")}
                            data-testid="input-shift-allowance"
                          />
                        </div>
                        <div>
                          <Label>Other Allowance ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={allowanceInputs.other}
                            onChange={(e) => handleAllowanceChange("other", e.target.value)}
                            onKeyDown={allowanceKeyDownHandler}
                            onBlur={() => handleAllowanceBlur("other", "defaultOtherAllowance")}
                            data-testid="input-other-allowance"
                          />
                        </div>
                        <div>
                          <Label>House Rental ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={allowanceInputs.houseRental}
                            onChange={(e) => handleAllowanceChange("houseRental", e.target.value)}
                            onKeyDown={allowanceKeyDownHandler}
                            onBlur={() => handleAllowanceBlur("houseRental", "defaultHouseRentalAllowance")}
                            data-testid="input-house-rental"
                          />
                        </div>
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

// Salary adjustments are now managed through Payroll Management page using PayrollAdjustmentsDialog
