import { Download, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

//todo: remove mock functionality
const mockPayslip = {
  month: "January 2024",
  employeeId: "EMP001",
  employeeName: "Faith Jr. Negapatan",
  department: "Engineering",
  earnings: [
    { item: "Basic Salary", amount: 4500.0 },
    { item: "Housing Allowance", amount: 800.0 },
    { item: "Transport Allowance", amount: 200.0 },
  ],
  deductions: [
    { item: "CPF Employee", amount: 900.0 },
    { item: "Income Tax", amount: 450.0 },
  ],
};

export default function PayslipPage() {
  const [selectedMonth, setSelectedMonth] = useState("2024-01");

  const totalEarnings = mockPayslip.earnings.reduce((sum, item) => sum + item.amount, 0);
  const totalDeductions = mockPayslip.deductions.reduce((sum, item) => sum + item.amount, 0);
  const netPay = totalEarnings - totalDeductions;

  const handleDownload = () => {
    console.log("Downloading payslip for", selectedMonth);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
            Payslip
          </h2>
          <p className="text-sm text-muted-foreground">
            View and download your monthly payslips
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-01">January 2024</SelectItem>
              <SelectItem value="2023-12">December 2023</SelectItem>
              <SelectItem value="2023-11">November 2023</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownload} data-testid="button-download">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payslip Details
            </span>
            <span className="text-lg" data-testid="text-payslip-month">{mockPayslip.month}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Employee ID</p>
              <p className="font-medium" data-testid="text-employee-id">{mockPayslip.employeeId}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Employee Name</p>
              <p className="font-medium" data-testid="text-employee-name">{mockPayslip.employeeName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium" data-testid="text-department">{mockPayslip.department}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Earnings</h3>
            {mockPayslip.earnings.map((item, index) => (
              <div key={index} className="flex justify-between items-center" data-testid={`row-earning-${index}`}>
                <span className="text-sm">{item.item}</span>
                <span className="font-medium font-mono" data-testid={`text-earning-amount-${index}`}>
                  ${item.amount.toFixed(2)}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Earnings</span>
              <span className="font-mono text-green-600" data-testid="text-total-earnings">
                ${totalEarnings.toFixed(2)}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Deductions</h3>
            {mockPayslip.deductions.map((item, index) => (
              <div key={index} className="flex justify-between items-center" data-testid={`row-deduction-${index}`}>
                <span className="text-sm">{item.item}</span>
                <span className="font-medium font-mono" data-testid={`text-deduction-amount-${index}`}>
                  ${item.amount.toFixed(2)}
                </span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between items-center font-semibold">
              <span>Total Deductions</span>
              <span className="font-mono text-red-600" data-testid="text-total-deductions">
                ${totalDeductions.toFixed(2)}
              </span>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Net Pay</span>
              <span className="text-2xl font-bold font-mono" data-testid="text-net-pay">
                ${netPay.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
