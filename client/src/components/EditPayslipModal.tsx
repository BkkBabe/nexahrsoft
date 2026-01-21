import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, History, DollarSign, AlertCircle, Calculator, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PayrollRecord, PayrollAuditLog } from "@shared/schema";

const CPF_ELIGIBLE_FIELDS = [
  'basicSalary', 'monthlyVariablesComponent', 'flat', 'ot10', 'ot15', 'ot20', 'ot30',
  'shiftAllowance', 'mobileAllowance', 'transportAllowance', 'serviceCallAllowances',
  'annualLeaveEncashment', 'totRestPhAmount', 'bonus'
];

interface EditPayslipModalProps {
  record: PayrollRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface FieldConfig {
  key: string;
  label: string;
  section: string;
}

const EDITABLE_FIELDS: FieldConfig[] = [
  { key: "basicSalary", label: "Basic Salary", section: "earnings" },
  { key: "monthlyVariablesComponent", label: "Monthly Variables Component", section: "earnings" },
  { key: "flat", label: "Flat Rate Overtime", section: "overtime" },
  { key: "ot10", label: "OT 1.0x", section: "overtime" },
  { key: "ot15", label: "OT 1.5x", section: "overtime" },
  { key: "ot20", label: "OT 2.0x", section: "overtime" },
  { key: "ot30", label: "OT 3.0x", section: "overtime" },
  { key: "shiftAllowance", label: "Shift Allowance", section: "overtime" },
  { key: "totRestPhAmount", label: "Total Rest / PH Amount", section: "overtime" },
  { key: "mobileAllowance", label: "Mobile Allowance", section: "allowances_cpf" },
  { key: "transportAllowance", label: "Transport Allowance (60-111)", section: "allowances_cpf" },
  { key: "serviceCallAllowances", label: "Service Call Allowances (60-102)", section: "allowances_cpf" },
  { key: "annualLeaveEncashment", label: "Annual Leave Encashment", section: "allowances_cpf" },
  { key: "otherAllowance", label: "Other Allowance", section: "allowances_no_cpf" },
  { key: "houseRentalAllowances", label: "House Rental Allowances (60-217)", section: "allowances_no_cpf" },
  { key: "bonus", label: "Bonus", section: "bonus" },
  { key: "employerCpf", label: "Employer CPF", section: "cpf" },
  { key: "employeeCpf", label: "Employee CPF (negative)", section: "cpf" },
  { key: "sdf", label: "SDF", section: "levies" },
  { key: "fwl", label: "FWL", section: "levies" },
  { key: "loanRepaymentTotal", label: "Loan Repayments", section: "deductions" },
  { key: "noPayDay", label: "No Pay Day Deduction", section: "deductions" },
  { key: "cc", label: "CC (Community Contribution)", section: "community" },
  { key: "cdac", label: "CDAC", section: "community" },
  { key: "ecf", label: "ECF", section: "community" },
  { key: "mbmf", label: "MBMF", section: "community" },
  { key: "sinda", label: "SINDA", section: "community" },
];

const SECTIONS: Record<string, string> = {
  earnings: "Basic Earnings",
  overtime: "Overtime & Shift Allowances",
  allowances_cpf: "Allowances (With CPF)",
  allowances_no_cpf: "Allowances (Without CPF)",
  bonus: "Bonus & Additional",
  cpf: "CPF Contributions",
  levies: "Levies (SDF/FWL)",
  deductions: "Deductions",
  community: "Community Contributions",
};

// Helper to safely parse numeric values (API returns strings from PostgreSQL numeric type)
function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Format currency from dollars (values are now stored as dollars, not cents)
function formatCurrency(dollars: number | string | null | undefined): string {
  const amount = parseAmount(dollars);
  return amount.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Parse currency string to dollars (no multiplication needed now)
function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const float = parseFloat(cleaned);
  return isNaN(float) ? 0 : Math.round(float * 100) / 100; // Round to 2 decimal places
}

export default function EditPayslipModal({
  record,
  open,
  onClose,
  onSaved,
}: EditPayslipModalProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showCpfConfirmDialog, setShowCpfConfirmDialog] = useState(false);
  const [isRecalculatingCpf, setIsRecalculatingCpf] = useState(false);

  const { data: recordWithAudit, isLoading: loadingAudit } = useQuery<{
    record: PayrollRecord;
    auditLogs: PayrollAuditLog[];
  }>({
    queryKey: ["/api/admin/payroll/records", record?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/payroll/records/${record?.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch record");
      return res.json();
    },
    enabled: !!record?.id && open,
  });

  useEffect(() => {
    if (record) {
      const initialValues: Record<string, number> = {};
      EDITABLE_FIELDS.forEach((field) => {
        initialValues[field.key] = (record as any)[field.key] || 0;
      });
      setValues(initialValues);
      setHasChanges(false);
      setReason("");
    }
  }, [record]);

  const calculateTotals = () => {
    const totSalary = values.basicSalary + values.monthlyVariablesComponent;
    const overtimeTotal =
      values.flat +
      values.ot10 +
      values.ot15 +
      values.ot20 +
      values.ot30 +
      values.shiftAllowance +
      values.totRestPhAmount;
    const allowancesWithCpf =
      values.mobileAllowance +
      values.transportAllowance +
      values.annualLeaveEncashment +
      values.serviceCallAllowances;
    const allowancesWithoutCpf =
      values.otherAllowance + values.houseRentalAllowances;
    const grossWages =
      totSalary +
      overtimeTotal +
      allowancesWithCpf +
      allowancesWithoutCpf +
      values.bonus;
    const cpfWages = totSalary + overtimeTotal + allowancesWithCpf + values.bonus;
    const communityDeductions =
      values.cc + values.cdac + values.ecf + values.mbmf + values.sinda;
    const totalDeductions =
      values.loanRepaymentTotal +
      values.noPayDay +
      communityDeductions +
      Math.abs(values.employeeCpf);
    const nett = grossWages - totalDeductions;

    return { totSalary, grossWages, cpfWages, totalDeductions, nett };
  };

  const totals = calculateTotals();

  const hasCpfEligibleChanges = useMemo(() => {
    if (!record) return false;
    return CPF_ELIGIBLE_FIELDS.some(field => {
      const originalValue = parseAmount((record as any)[field]);
      const currentValue = values[field] || 0;
      return currentValue !== originalValue;
    });
  }, [record, values]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest("PATCH", `/api/admin/payroll/records/${record?.id}`, data);
    },
    onSuccess: (response: any) => {
      const cpfRecalculated = response?.cpfRecalculated;
      const cpfSkippedReason = response?.cpfSkippedReason;
      
      if (cpfRecalculated) {
        toast({
          title: "Payslip Updated & CPF Recalculated",
          description: "Changes saved with CPF contributions recalculated based on updated wages.",
        });
      } else if (cpfSkippedReason) {
        toast({
          title: "Payslip Updated",
          description: cpfSkippedReason,
          variant: "default",
        });
      } else {
        toast({
          title: "Payslip Updated",
          description: "Changes have been saved with audit trail.",
        });
      }
      
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/payroll/records"],
        exact: false,
      });
      setIsRecalculatingCpf(false);
      if (onSaved) onSaved();
      onClose();
    },
    onError: (error: Error) => {
      setIsRecalculatingCpf(false);
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshFromSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/admin/payroll/records/${record?.id}/refresh-from-settings`, {
        reason: "Refreshed allowances from employee settings",
      });
    },
    onSuccess: (response: any) => {
      const changes = response?.changes || [];
      if (changes.length === 0) {
        toast({
          title: "No Changes Needed",
          description: "Payslip already matches employee settings.",
        });
      } else {
        toast({
          title: "Payslip Refreshed",
          description: `Updated ${changes.length} field(s) from employee settings.`,
        });
      }
      
      // Always invalidate and close on success (even when no changes)
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/payroll/records"],
        exact: false,
      });
      if (onSaved) onSaved();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Refresh Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleValueChange = (key: string, inputValue: string) => {
    const cents = parseCurrency(inputValue);
    setValues((prev) => ({ ...prev, [key]: cents }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!record) return;
    
    if (hasCpfEligibleChanges) {
      setShowCpfConfirmDialog(true);
    } else {
      const payload = { ...values, reason };
      updateMutation.mutate(payload);
    }
  };

  const handleSaveWithCpfRecalculation = (recalculateCpf: boolean) => {
    if (!record) return;
    setShowCpfConfirmDialog(false);
    
    if (recalculateCpf) {
      setIsRecalculatingCpf(true);
    }
    
    const payload = { ...values, reason, recalculateCpf };
    updateMutation.mutate(payload);
  };

  const groupedFields = EDITABLE_FIELDS.reduce(
    (acc, field) => {
      if (!acc[field.section]) acc[field.section] = [];
      acc[field.section].push(field);
      return acc;
    },
    {} as Record<string, FieldConfig[]>
  );

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Edit Payslip - {record.employeeName}
          </DialogTitle>
          <DialogDescription>
            {record.payPeriod} | Employee Code: {record.employeeCode}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            <Accordion
              type="multiple"
              defaultValue={Object.keys(SECTIONS)}
              className="w-full"
            >
              {Object.entries(SECTIONS).map(([sectionKey, sectionTitle]) => {
                const fields = groupedFields[sectionKey] || [];
                if (fields.length === 0) return null;

                return (
                  <AccordionItem key={sectionKey} value={sectionKey}>
                    <AccordionTrigger className="text-sm font-medium">
                      {sectionTitle}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {fields.map((field) => {
                          const originalValue = (record as any)[field.key] || 0;
                          const currentValue = values[field.key] || 0;
                          const isChanged = currentValue !== originalValue;

                          return (
                            <div key={field.key} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor={field.key}
                                  className="text-xs font-medium"
                                >
                                  {field.label}
                                </Label>
                                {isChanged && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                    data-testid={`badge-changed-${field.key}`}
                                  >
                                    Modified
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  id={field.key}
                                  type="text"
                                  value={formatCurrency(currentValue)}
                                  onChange={(e) =>
                                    handleValueChange(field.key, e.target.value)
                                  }
                                  className="font-mono"
                                  data-testid={`input-${field.key}`}
                                />
                              </div>
                              {isChanged && (
                                <p className="text-xs text-muted-foreground">
                                  Was: ${formatCurrency(originalValue)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <Separator />

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">Calculated Totals</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Salary</p>
                  <p className="font-mono font-medium" data-testid="text-calc-tot-salary">
                    ${formatCurrency(totals.totSalary)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gross Wages</p>
                  <p className="font-mono font-medium" data-testid="text-calc-gross-wages">
                    ${formatCurrency(totals.grossWages)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPF Wages</p>
                  <p className="font-mono font-medium" data-testid="text-calc-cpf-wages">
                    ${formatCurrency(totals.cpfWages)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Deductions</p>
                  <p className="font-mono font-medium text-destructive" data-testid="text-calc-deductions">
                    -${formatCurrency(totals.totalDeductions)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Net Pay</p>
                  <p className="font-mono font-bold text-lg text-primary" data-testid="text-calc-nett">
                    ${formatCurrency(totals.nett)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Changes (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Explain why these changes are being made..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="input-reason"
              />
            </div>

            {recordWithAudit?.auditLogs && recordWithAudit.auditLogs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">Change History</h4>
                </div>
                <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                  {recordWithAudit.auditLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2 text-xs space-y-1"
                      data-testid={`audit-log-${idx}`}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {log.fieldName}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(log.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <p>
                        <span className="text-muted-foreground">Changed by:</span>{" "}
                        {log.changedBy}
                      </p>
                      <p>
                        <span className="text-muted-foreground">From:</span>{" "}
                        <span className="font-mono">
                          ${formatCurrency(parseInt(log.oldValue || "0"))}
                        </span>{" "}
                        <span className="text-muted-foreground">to</span>{" "}
                        <span className="font-mono">
                          ${formatCurrency(parseInt(log.newValue || "0"))}
                        </span>
                      </p>
                      {log.reason && (
                        <p className="text-muted-foreground italic">
                          Reason: {log.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          {hasChanges && !reason.trim() && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Reason is required to save changes
            </div>
          )}
          {hasChanges && reason.trim() && hasCpfEligibleChanges && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <Calculator className="h-4 w-4" />
              CPF-eligible fields changed - will prompt for recalculation
            </div>
          )}
          {hasChanges && reason.trim() && !hasCpfEligibleChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Unsaved changes
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="secondary"
              onClick={() => refreshFromSettingsMutation.mutate()}
              disabled={refreshFromSettingsMutation.isPending || updateMutation.isPending || hasChanges}
              title={hasChanges ? "Save or discard changes before refreshing" : "Update allowances from employee settings"}
              data-testid="button-refresh-from-settings"
            >
              {refreshFromSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh from Settings
            </Button>
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending || isRecalculatingCpf || !reason.trim()}
              data-testid="button-save"
            >
              {isRecalculatingCpf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recalculating CPF...
                </>
              ) : updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {!isRecalculatingCpf && !updateMutation.isPending && "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showCpfConfirmDialog} onOpenChange={setShowCpfConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              Recalculate CPF Contributions?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You have modified fields that affect CPF wages (salary, overtime, allowances, or bonus).
              </p>
              <p>
                Would you like the system to automatically recalculate CPF contributions based on the updated wages and the employee's age/residency status?
              </p>
              <p className="text-muted-foreground text-xs">
                Note: CPF rates are calculated using official Singapore CPF 2026 rates based on the employee's age and residency status.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleSaveWithCpfRecalculation(false)} data-testid="button-skip-cpf">
              Save Without Recalculating
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSaveWithCpfRecalculation(true)} data-testid="button-recalculate-cpf">
              <Calculator className="h-4 w-4 mr-2" />
              Recalculate CPF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
