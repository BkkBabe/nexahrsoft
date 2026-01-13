import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Loader2, DollarSign, Clock, Calendar, Trash2, Edit, FileText, User } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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

const ADJUSTMENT_TYPES = [
  { value: "overtime", label: "Overtime", hasHours: true, hasRate: true },
  { value: "mc_days", label: "MC Days", hasDays: true },
  { value: "al_days", label: "Annual Leave Days", hasDays: true },
  { value: "late_hours", label: "Late Hours Deduction", hasHours: true, hasRate: true, isDeduction: true },
  { value: "advance", label: "Salary Advance", hasAmount: true, isDeduction: true },
  { value: "claim", label: "Expense Claim", hasAmount: true },
  { value: "deduction", label: "Other Deduction", hasAmount: true, isDeduction: true },
  { value: "bonus", label: "Bonus", hasAmount: true },
  { value: "other", label: "Other Adjustment", hasAmount: true },
];

interface PayrollAdjustment {
  id: string;
  userId: string;
  payPeriodYear: number;
  payPeriodMonth: number;
  adjustmentType: string;
  description: string | null;
  hours: number | null;
  days: number | null;
  rate: number | null;
  amount: number | null;
  notes: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  employeeCode: string | null;
  department: string | null;
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

function getAdjustmentTypeLabel(type: string): string {
  const found = ADJUSTMENT_TYPES.find(t => t.value === type);
  return found ? found.label : type;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    case "processed":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminPayrollAdjustmentsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentMonth));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [adjustmentType, setAdjustmentType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [days, setDays] = useState("");
  const [rate, setRate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const { data: adjustmentsData, isLoading: isLoadingAdjustments } = useQuery<{ adjustments: PayrollAdjustment[] }>({
    queryKey: ["/api/admin/payroll/adjustments", { year: selectedYear, month: selectedMonth }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/payroll/adjustments?year=${selectedYear}&month=${selectedMonth}`);
      return res.json();
    },
  });

  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery<{ employees: Employee[] }>({
    queryKey: ["/api/admin/employees/payroll-list"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const typeConfig = ADJUSTMENT_TYPES.find(t => t.value === adjustmentType);
      const payload: Record<string, any> = {
        userId: selectedEmployeeId,
        payPeriodYear: parseInt(selectedYear),
        payPeriodMonth: parseInt(selectedMonth),
        adjustmentType,
        description: description || null,
        notes: notes || null,
      };

      if (typeConfig?.hasHours && hours) {
        payload.hours = parseFloat(hours);
      }
      if (typeConfig?.hasDays && days) {
        payload.days = parseFloat(days);
      }
      if (typeConfig?.hasRate && rate) {
        payload.rate = displayToDollars(rate);
      }
      if (typeConfig?.hasAmount && amount) {
        payload.amount = displayToDollars(amount);
      }

      const response = await apiRequest("POST", "/api/admin/payroll/adjustments", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Adjustment Created",
        description: "Payroll adjustment has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payroll/adjustments"] });
      resetForm();
      setAddDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create adjustment",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/payroll/adjustments/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Adjustment Deleted",
        description: "Payroll adjustment has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payroll/adjustments"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete adjustment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedEmployeeId("");
    setAdjustmentType("");
    setDescription("");
    setHours("");
    setDays("");
    setRate("");
    setAmount("");
    setNotes("");
  };

  const typeConfig = ADJUSTMENT_TYPES.find(t => t.value === adjustmentType);
  const employees = employeesData?.employees || [];
  const adjustments = adjustmentsData?.adjustments || [];

  const getEmployeeName = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp ? emp.name : "Unknown";
  };

  const getEmployeeCode = (userId: string) => {
    const emp = employees.find(e => e.id === userId);
    return emp?.employeeCode || "";
  };

  const calculateAdjustmentValue = (adj: PayrollAdjustment): number => {
    if (adj.amount) return adj.amount;
    if (adj.hours && adj.rate) return Math.round(adj.hours * adj.rate);
    if (adj.days && adj.rate) return Math.round(adj.days * adj.rate);
    return 0;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/admin/payroll")}
              data-testid="button-back-payroll"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payroll
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Payroll Adjustments</h1>
              <p className="text-muted-foreground">Add overtime, claims, deductions and other adjustments</p>
            </div>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-adjustment">
            <Plus className="h-4 w-4 mr-2" />
            Add Adjustment
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Pay Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-40">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => (
                      <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Adjustments for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
            </CardTitle>
            <CardDescription>
              {adjustments.length} adjustment(s) recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAdjustments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : adjustments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No adjustments for this period</p>
                <p className="text-sm">Click "Add Adjustment" to create one</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map(adj => {
                    const typeInfo = ADJUSTMENT_TYPES.find(t => t.value === adj.adjustmentType);
                    const value = calculateAdjustmentValue(adj);
                    const isDeduction = typeInfo?.isDeduction;

                    return (
                      <TableRow key={adj.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{getEmployeeName(adj.userId)}</div>
                            <div className="text-xs text-muted-foreground font-mono">{getEmployeeCode(adj.userId)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getAdjustmentTypeLabel(adj.adjustmentType)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {adj.hours && <div><Clock className="h-3 w-3 inline mr-1" />{adj.hours} hrs</div>}
                            {adj.days && <div><Calendar className="h-3 w-3 inline mr-1" />{adj.days} days</div>}
                            {adj.rate && <div>@ {formatCurrency(adj.rate)}/hr</div>}
                            {adj.description && <div className="text-muted-foreground">{adj.description}</div>}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                          {isDeduction ? '-' : '+'}{formatCurrency(value)}
                        </TableCell>
                        <TableCell>{getStatusBadge(adj.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{adj.createdBy}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(adj.createdAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {adj.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(adj.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-adjustment-${adj.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Add Payroll Adjustment
              </DialogTitle>
              <DialogDescription>
                Add overtime, claims, deductions or other adjustments for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-60">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{emp.name}</span>
                            {emp.employeeCode && <span className="text-muted-foreground font-mono text-xs">({emp.employeeCode})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Adjustment Type</Label>
                <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                  <SelectTrigger data-testid="select-adjustment-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADJUSTMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {typeConfig && (
                <>
                  {typeConfig.hasHours && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Hours</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                          placeholder="e.g. 4.5"
                          data-testid="input-hours"
                        />
                      </div>
                      {typeConfig.hasRate && (
                        <div>
                          <Label>Rate ($/hr)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            placeholder="e.g. 15.00"
                            data-testid="input-rate"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {typeConfig.hasDays && (
                    <div>
                      <Label>Days</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        placeholder="e.g. 2"
                        data-testid="input-days"
                      />
                    </div>
                  )}

                  {typeConfig.hasAmount && (
                    <div>
                      <Label>Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="e.g. 150.00"
                        data-testid="input-amount"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description"
                  data-testid="input-description"
                />
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for audit trail"
                  rows={3}
                  data-testid="input-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!selectedEmployeeId || !adjustmentType || createMutation.isPending}
                data-testid="button-save-adjustment"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Adjustment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
