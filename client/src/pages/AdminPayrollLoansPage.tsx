import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, DollarSign, CreditCard, Loader2, Search, AlertCircle, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PayrollLoanAccount, User } from "@shared/schema";

// Helper to parse numeric values from PostgreSQL (returned as strings)
function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
}

interface LoanFormData {
  employeeCode: string;
  employeeName: string;
  loanType: string;
  loanDescription: string;
  principalAmount: number;
  monthlyRepayment: number;
  interestRate: number;
  startDate: string;
}

export default function AdminPayrollLoansPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<PayrollLoanAccount | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [repaymentYear, setRepaymentYear] = useState<number>(new Date().getFullYear());
  const [repaymentMonth, setRepaymentMonth] = useState<number>(new Date().getMonth() + 1);
  
  const [formData, setFormData] = useState<LoanFormData>({
    employeeCode: "",
    employeeName: "",
    loanType: "company_loan",
    loanDescription: "",
    principalAmount: 0,
    monthlyRepayment: 0,
    interestRate: 0,
    startDate: new Date().toISOString().split('T')[0],
  });

  const { data: loansData, isLoading } = useQuery<{ loans: PayrollLoanAccount[] }>({
    queryKey: ["/api/admin/payroll/loans"],
  });

  const { data: usersData } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const loans = loansData?.loans || [];
  const users = (usersData || []).filter(u => !u.isArchived);

  const filteredLoans = loans.filter(loan => 
    loan.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loan.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loan.loanType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createLoanMutation = useMutation({
    mutationFn: async (data: LoanFormData) => {
      return apiRequest("POST", "/api/admin/payroll/loans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payroll/loans"] });
      toast({ title: "Success", description: "Loan created successfully" });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const recordRepaymentMutation = useMutation({
    mutationFn: async ({ loanId, data }: { loanId: string; data: { payPeriodYear: number; payPeriodMonth: number; repaymentAmount: number } }) => {
      return apiRequest("POST", `/api/admin/payroll/loans/${loanId}/repayments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payroll/loans"] });
      toast({ title: "Success", description: "Repayment recorded successfully" });
      setShowRepaymentDialog(false);
      setSelectedLoan(null);
      setRepaymentAmount(0);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLoanMutation = useMutation({
    mutationFn: async ({ loanId, status }: { loanId: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/payroll/loans/${loanId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payroll/loans"] });
      toast({ title: "Success", description: "Loan status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      employeeCode: "",
      employeeName: "",
      loanType: "company_loan",
      loanDescription: "",
      principalAmount: 0,
      monthlyRepayment: 0,
      interestRate: 0,
      startDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleEmployeeSelect = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setFormData(prev => ({
        ...prev,
        employeeCode: user.employeeCode || "",
        employeeName: user.name,
      }));
    }
  };

  const handleCreateLoan = () => {
    if (!formData.employeeCode || !formData.employeeName || formData.principalAmount <= 0) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createLoanMutation.mutate(formData);
  };

  const handleRecordRepayment = () => {
    if (!selectedLoan || repaymentAmount <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    recordRepaymentMutation.mutate({
      loanId: selectedLoan.id,
      data: { payPeriodYear: repaymentYear, payPeriodMonth: repaymentMonth, repaymentAmount },
    });
  };

  const openRepaymentDialog = (loan: PayrollLoanAccount) => {
    setSelectedLoan(loan);
    setRepaymentAmount(parseAmount(loan.monthlyRepayment));
    setShowRepaymentDialog(true);
  };

  const formatCurrency = (dollars: number) => {
    return `$${dollars.toLocaleString("en-SG", { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      paid_off: "secondary",
      written_off: "destructive",
      suspended: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace("_", " ")}</Badge>;
  };

  const loanTypeOptions = [
    { value: "company_loan", label: "Company Loan" },
    { value: "housing_loan", label: "Housing Loan" },
    { value: "car_loan", label: "Car Loan" },
    { value: "personal_loan", label: "Personal Loan" },
    { value: "education_loan", label: "Education Loan" },
    { value: "other", label: "Other" },
  ];

  const totalOutstanding = loans.filter(l => l.status === "active").reduce((sum, l) => sum + parseAmount(l.outstandingBalance), 0);
  const totalPrincipal = loans.reduce((sum, l) => sum + parseAmount(l.principalAmount), 0);
  const activeLoansCount = loans.filter(l => l.status === "active").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/payroll")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold" data-testid="text-page-title">Loan Management</h2>
            <p className="text-sm text-muted-foreground">Manage employee loans and repayments</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-loan">
          <Plus className="h-4 w-4 mr-2" />
          Add New Loan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-loans-count">{activeLoansCount}</div>
            <p className="text-xs text-muted-foreground">of {loans.length} total loans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Principal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-principal">{formatCurrency(totalPrincipal)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-outstanding">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Active loans</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              All Loans
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search loans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-loans"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No loans found matching your search" : "No loans recorded yet"}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Monthly</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id} data-testid={`row-loan-${loan.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{loan.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{loan.employeeCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="capitalize">{loan.loanType.replace("_", " ")}</p>
                          {loan.loanDescription && (
                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">{loan.loanDescription}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(parseAmount(loan.principalAmount))}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(parseAmount(loan.outstandingBalance))}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(parseAmount(loan.monthlyRepayment))}</TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {loan.status === "active" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRepaymentDialog(loan)}
                                data-testid={`button-repay-${loan.id}`}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Repay
                              </Button>
                              {parseAmount(loan.outstandingBalance) <= 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateLoanMutation.mutate({ loanId: loan.id, status: "paid_off" })}
                                  data-testid={`button-markpaid-${loan.id}`}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Paid Off
                                </Button>
                              )}
                            </>
                          )}
                          {loan.status === "suspended" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateLoanMutation.mutate({ loanId: loan.id, status: "active" })}
                              data-testid={`button-activate-${loan.id}`}
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Loan</DialogTitle>
            <DialogDescription>Create a new loan account for an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select onValueChange={handleEmployeeSelect} data-testid="select-employee">
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.employeeCode).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan Type</Label>
              <Select
                value={formData.loanType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, loanType: value }))}
                data-testid="select-loan-type"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loanTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Input
                value={formData.loanDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, loanDescription: e.target.value }))}
                placeholder="e.g., Laptop purchase"
                data-testid="input-loan-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.principalAmount / 100 || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, principalAmount: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                  placeholder="0.00"
                  data-testid="input-principal-amount"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Repayment ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyRepayment / 100 || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthlyRepayment: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                  placeholder="0.00"
                  data-testid="input-monthly-repayment"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.interestRate || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, interestRate: parseFloat(e.target.value || "0") }))}
                  placeholder="0"
                  data-testid="input-interest-rate"
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  data-testid="input-start-date"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-loan">
              Cancel
            </Button>
            <Button onClick={handleCreateLoan} disabled={createLoanMutation.isPending} data-testid="button-confirm-loan">
              {createLoanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRepaymentDialog} onOpenChange={setShowRepaymentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              {selectedLoan && (
                <>Record repayment for {selectedLoan.employeeName}'s {selectedLoan.loanType.replace("_", " ")}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedLoan && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-lg font-bold">{formatCurrency(parseAmount(selectedLoan.outstandingBalance))}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={String(repaymentYear)} onValueChange={(v) => setRepaymentYear(parseInt(v))}>
                  <SelectTrigger data-testid="select-repayment-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={String(repaymentMonth)} onValueChange={(v) => setRepaymentMonth(parseInt(v))}>
                  <SelectTrigger data-testid="select-repayment-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m - 1).toLocaleDateString("en", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Repayment Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={repaymentAmount / 100 || ""}
                onChange={(e) => setRepaymentAmount(Math.round(parseFloat(e.target.value || "0") * 100))}
                placeholder="0.00"
                data-testid="input-repayment-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRepaymentDialog(false)} data-testid="button-cancel-repayment">
              Cancel
            </Button>
            <Button onClick={handleRecordRepayment} disabled={recordRepaymentMutation.isPending} data-testid="button-confirm-repayment">
              {recordRepaymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record Repayment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
