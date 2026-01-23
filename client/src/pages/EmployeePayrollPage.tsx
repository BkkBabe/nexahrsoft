import { useState } from "react";
import { DollarSign, FileText, Calendar, ChevronRight, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { PayrollRecord, CompanySettings } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import PayslipView from "@/components/PayslipView";

export default function EmployeePayrollPage() {
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  const { data: payrollData, isLoading } = useQuery<{ records: PayrollRecord[] }>({
    queryKey: ["/api/employee/payroll"],
  });

  const { data: companySettingsData } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
  });

  const records = payrollData?.records || [];
  const companySettings = companySettingsData;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">My Payslips</h2>
          <p className="text-sm text-muted-foreground">
            View your payslips
          </p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
          My Payslips
        </h2>
        <p className="text-sm text-muted-foreground">
          View your monthly payslips
        </p>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Payslips Available</h3>
            <p className="text-sm text-muted-foreground">
              Your payslips will appear here once they are made available by your administrator.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => {
            const netPay = parseFloat(record.nett?.toString() || "0");
            const grossPay = parseFloat(record.grossWages?.toString() || "0");
            
            return (
              <Card 
                key={record.id} 
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedPayslip(record)}
                data-testid={`card-payslip-${record.id}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold" data-testid={`text-period-${record.id}`}>
                          {record.payPeriod}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{record.deptName || "Department"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Net Pay</p>
                        <p className="text-xl font-bold font-mono" data-testid={`text-net-pay-${record.id}`}>
                          ${netPay.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" data-testid="text-payslip-dialog-title">
              <FileText className="h-5 w-5" />
              Payslip - {selectedPayslip?.payPeriod}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPayslip && (
            <PayslipView
              record={selectedPayslip}
              companySettings={companySettings}
              defaultMode="employee"
              showToggle={false}
              isAdmin={false}
            />
          )}

          <div className="flex justify-end pt-4">
            <DialogClose asChild>
              <Button variant="outline" data-testid="button-close-payslip">
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
