import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, DollarSign, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { PayrollRecord } from "@shared/schema";

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
  rate: string | null;
  amount: string | null;
  notes: string | null;
  status: string;
  createdBy: string;
  createdAt: string;
}

interface PayrollAdjustmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PayrollRecord | null;
}

function formatCurrency(dollars: number | string | null): string {
  if (dollars === null || dollars === undefined) return "$0.00";
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  return `$${num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getAdjustmentTypeInfo(type: string) {
  return ADJUSTMENT_TYPES.find(t => t.value === type);
}

function getAdjustmentTypeLabel(type: string): string {
  const found = ADJUSTMENT_TYPES.find(t => t.value === type);
  return found ? found.label : type;
}

export default function PayrollAdjustmentsDialog({ open, onOpenChange, record }: PayrollAdjustmentsDialogProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdjustment, setNewAdjustment] = useState({
    adjustmentType: "",
    description: "",
    hours: "",
    days: "",
    rate: "",
    amount: "",
    notes: "",
  });

  const { data: adjustmentsData, isLoading } = useQuery<{ adjustments: PayrollAdjustment[] }>({
    queryKey: ['/api/admin/payroll/adjustments', record?.userId, record?.payPeriodYear, record?.payPeriodMonth],
    queryFn: async () => {
      if (!record?.userId) return { adjustments: [] };
      const res = await fetch(
        `/api/admin/payroll/adjustments?userId=${record.userId}&year=${record.payPeriodYear}&month=${record.payPeriodMonth}`,
        { credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to fetch adjustments');
      return res.json();
    },
    enabled: open && !!record?.userId,
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/payroll/adjustments", data);
    },
    onSuccess: () => {
      toast({ title: "Adjustment Added", description: "The adjustment has been added and applied to the payslip." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payroll/adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payroll/records'] });
      setShowAddForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add adjustment", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (adjustmentId: string) => {
      return apiRequest("DELETE", `/api/admin/payroll/adjustments/${adjustmentId}`);
    },
    onSuccess: () => {
      toast({ title: "Adjustment Deleted", description: "The adjustment has been removed from the payslip." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payroll/adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payroll/records'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete adjustment", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewAdjustment({
      adjustmentType: "",
      description: "",
      hours: "",
      days: "",
      rate: "",
      amount: "",
      notes: "",
    });
  };

  const handleAddAdjustment = () => {
    if (!record?.userId || !newAdjustment.adjustmentType) {
      toast({ title: "Error", description: "Please select an adjustment type", variant: "destructive" });
      return;
    }

    const typeInfo = getAdjustmentTypeInfo(newAdjustment.adjustmentType);
    
    const payload = {
      userId: record.userId,
      payPeriodYear: record.payPeriodYear,
      payPeriodMonth: record.payPeriodMonth,
      adjustmentType: newAdjustment.adjustmentType,
      description: newAdjustment.description || null,
      hours: newAdjustment.hours ? parseFloat(newAdjustment.hours) : null,
      days: newAdjustment.days ? parseFloat(newAdjustment.days) : null,
      rate: newAdjustment.rate ? newAdjustment.rate : null,
      amount: newAdjustment.amount ? newAdjustment.amount : null,
      notes: newAdjustment.notes || null,
      status: "approved",
    };

    addMutation.mutate(payload);
  };

  const adjustments = adjustmentsData?.adjustments || [];
  const selectedType = getAdjustmentTypeInfo(newAdjustment.adjustmentType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="dialog-adjustments">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payroll Adjustments
          </DialogTitle>
          <DialogDescription>
            {record?.employeeName} - {record?.payPeriod}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {adjustments.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Hours/Days</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustments.map((adj) => {
                        const typeInfo = getAdjustmentTypeInfo(adj.adjustmentType);
                        const isDeduction = typeInfo?.isDeduction;
                        const amount = adj.amount ? parseFloat(adj.amount) : 0;
                        
                        return (
                          <TableRow key={adj.id}>
                            <TableCell>
                              <Badge variant={isDeduction ? "destructive" : "default"}>
                                {getAdjustmentTypeLabel(adj.adjustmentType)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {adj.description || "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {adj.hours ? `${adj.hours} hrs` : adj.days ? `${adj.days} days` : "-"}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                              {isDeduction ? '-' : ''}{formatCurrency(amount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(adj.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-adjustment-${adj.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No adjustments for this period
                </div>
              )}

              <Separator />

              {!showAddForm ? (
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                  data-testid="button-show-add-adjustment"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Adjustment
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <h4 className="font-medium">New Adjustment</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Adjustment Type *</Label>
                      <Select
                        value={newAdjustment.adjustmentType}
                        onValueChange={(value) => setNewAdjustment(prev => ({ ...prev, adjustmentType: value }))}
                      >
                        <SelectTrigger data-testid="select-adjustment-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ADJUSTMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={newAdjustment.description}
                        onChange={(e) => setNewAdjustment(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description"
                        data-testid="input-adjustment-description"
                      />
                    </div>
                  </div>

                  {selectedType && (
                    <div className="grid grid-cols-3 gap-4">
                      {selectedType.hasHours && (
                        <div className="space-y-2">
                          <Label>Hours</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={newAdjustment.hours}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setNewAdjustment(prev => ({ ...prev, hours: value }));
                              }
                            }}
                            placeholder="0.0"
                            data-testid="input-adjustment-hours"
                          />
                        </div>
                      )}

                      {selectedType.hasDays && (
                        <div className="space-y-2">
                          <Label>Days</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={newAdjustment.days}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setNewAdjustment(prev => ({ ...prev, days: value }));
                              }
                            }}
                            placeholder="0.0"
                            data-testid="input-adjustment-days"
                          />
                        </div>
                      )}

                      {selectedType.hasRate && (
                        <div className="space-y-2">
                          <Label>Rate ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={newAdjustment.rate}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setNewAdjustment(prev => ({ ...prev, rate: value }));
                              }
                            }}
                            placeholder="0.00"
                            data-testid="input-adjustment-rate"
                          />
                        </div>
                      )}

                      {selectedType.hasAmount && (
                        <div className="space-y-2">
                          <Label>Amount ($)</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={newAdjustment.amount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setNewAdjustment(prev => ({ ...prev, amount: value }));
                              }
                            }}
                            placeholder="0.00"
                            data-testid="input-adjustment-amount"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={newAdjustment.notes}
                      onChange={(e) => setNewAdjustment(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes for audit trail"
                      rows={2}
                      data-testid="input-adjustment-notes"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      data-testid="button-cancel-adjustment"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddAdjustment}
                      disabled={addMutation.isPending || !newAdjustment.adjustmentType}
                      data-testid="button-save-adjustment"
                    >
                      {addMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add & Apply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-adjustments">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
