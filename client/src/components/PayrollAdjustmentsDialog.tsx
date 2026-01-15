import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import type { PayrollRecord } from "@shared/schema";

export interface PayrollAdjustment {
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
  onAdjustmentSaved?: () => void;
}

export const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  addition: "Addition",
  deduction: "Deduction",
  suppress_ot15: "Suppress OT 1.5x",
  suppress_ot20: "Suppress OT 2.0x",
};

const ADJUSTMENT_TYPES = [
  { value: "addition", label: "Addition", hasAmount: true },
  { value: "deduction", label: "Deduction", hasAmount: true },
  { value: "suppress_ot15", label: "Suppress OT 1.5x (No OT1.5 in Payroll)", isFlag: true },
  { value: "suppress_ot20", label: "Suppress OT 2.0x (No OT2.0 in Payroll)", isFlag: true },
];

function formatCurrency(dollars: number | string | null): string {
  if (dollars === null || dollars === undefined) return "$0.00";
  const num = typeof dollars === 'string' ? parseFloat(dollars) : dollars;
  return `$${num.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PayrollAdjustmentsDialog({ open, onOpenChange, record, onAdjustmentSaved }: PayrollAdjustmentsDialogProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdjustment, setNewAdjustment] = useState({
    adjustmentType: "",
    notes: "",
    amount: "",
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
    onSuccess: async (_, variables) => {
      const isSuppressType = variables.adjustmentType === 'suppress_ot15' || variables.adjustmentType === 'suppress_ot20';
      
      if (isSuppressType) {
        toast({ title: "Adjustment Added", description: "Recalculating payroll..." });
        // Add delay for suppress adjustments to allow payroll recalculation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      toast({ title: "Adjustment Added", description: "The adjustment has been saved." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payroll/adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payroll/records'] });
      setShowAddForm(false);
      resetForm();
      
      // Notify parent to refresh payslip view
      if (onAdjustmentSaved) {
        onAdjustmentSaved();
      }
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
      toast({ title: "Adjustment Deleted", description: "The adjustment has been removed." });
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
      notes: "",
      amount: "",
    });
  };

  const handleAddAdjustment = () => {
    if (!record?.userId || !newAdjustment.adjustmentType) {
      toast({ title: "Error", description: "Please select an adjustment type", variant: "destructive" });
      return;
    }

    const typeConfig = ADJUSTMENT_TYPES.find(t => t.value === newAdjustment.adjustmentType);
    const isFlag = typeConfig?.isFlag;

    if (!isFlag && (!newAdjustment.amount || parseFloat(newAdjustment.amount) <= 0)) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const payload = {
      userId: record.userId,
      payPeriodYear: record.payPeriodYear,
      payPeriodMonth: record.payPeriodMonth,
      adjustmentType: newAdjustment.adjustmentType,
      description: newAdjustment.notes || null,
      hours: null,
      days: null,
      rate: null,
      amount: isFlag ? null : newAdjustment.amount,
      notes: newAdjustment.notes || null,
      status: "approved",
    };

    addMutation.mutate(payload);
  };

  const selectedTypeConfig = ADJUSTMENT_TYPES.find(t => t.value === newAdjustment.adjustmentType);

  const adjustments = adjustmentsData?.adjustments || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-adjustments">
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
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustments.map((adj) => {
                        const isDeduction = adj.adjustmentType === 'deduction';
                        const isSuppress = adj.adjustmentType === 'suppress_ot15' || adj.adjustmentType === 'suppress_ot20';
                        const amount = adj.amount ? parseFloat(adj.amount) : 0;
                        const typeLabel = ADJUSTMENT_TYPE_LABELS[adj.adjustmentType] || adj.adjustmentType;
                        
                        return (
                          <TableRow key={adj.id}>
                            <TableCell>
                              <Badge variant={isSuppress ? "secondary" : isDeduction ? "destructive" : "default"}>
                                {typeLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {adj.notes || adj.description || "-"}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${isSuppress ? 'text-muted-foreground' : isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                              {isSuppress ? '(Flag)' : `${isDeduction ? '-' : ''}${formatCurrency(amount)}`}
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
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Adjustment Type *</Label>
                      <Select
                        value={newAdjustment.adjustmentType}
                        onValueChange={(value) => setNewAdjustment(prev => ({ ...prev, adjustmentType: value, amount: '' }))}
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
                      <Label>Notes</Label>
                      <Textarea
                        value={newAdjustment.notes}
                        onChange={(e) => setNewAdjustment(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Description or notes for this adjustment"
                        rows={2}
                        data-testid="input-adjustment-notes"
                      />
                    </div>

                    {selectedTypeConfig?.hasAmount && (
                      <div className="space-y-2">
                        <Label>Amount ($) *</Label>
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
                    
                    {selectedTypeConfig?.isFlag && (
                      <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                        This adjustment is a flag that will suppress the corresponding overtime calculation for this employee during payroll generation.
                      </div>
                    )}
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
                      disabled={addMutation.isPending || !newAdjustment.adjustmentType || (selectedTypeConfig?.hasAmount && !newAdjustment.amount)}
                      data-testid="button-save-adjustment"
                    >
                      {addMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Adjustment"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
