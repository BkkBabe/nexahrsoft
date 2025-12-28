import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Printer, Download } from "lucide-react";
import type { PayrollRecord, CompanySettings } from "@shared/schema";

interface PayslipViewProps {
  record: PayrollRecord;
  companySettings?: CompanySettings | null;
  defaultMode?: "employee" | "employer";
  showToggle?: boolean;
  onPrint?: () => void;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNegativeCurrency(cents: number): string {
  const value = Math.abs(cents) / 100;
  return `-${value.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface LineItemProps {
  label: string;
  value: number;
  isNegative?: boolean;
  isBold?: boolean;
  showZero?: boolean;
}

function LineItem({ label, value, isNegative, isBold, showZero = false }: LineItemProps) {
  if (value === 0 && !showZero) return null;
  
  const fontWeight = isBold ? "font-semibold" : "";
  const textColor = isNegative && value !== 0 ? "text-destructive" : "";
  
  return (
    <div className={`flex justify-between items-center py-1 ${fontWeight}`}>
      <span className="text-sm">{label}</span>
      <span className={`font-mono text-sm ${textColor}`}>
        ${isNegative && value !== 0 ? formatNegativeCurrency(value) : formatCurrency(value)}
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  sectionLetter: string;
  children: React.ReactNode;
  subtotal?: { label: string; value: number };
}

function Section({ title, sectionLetter, children, subtotal }: SectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {sectionLetter}
        </Badge>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="pl-2 border-l-2 border-muted">
        {children}
        {subtotal && (
          <>
            <Separator className="my-2" />
            <div className="flex justify-between items-center font-semibold">
              <span className="text-sm">{subtotal.label}</span>
              <span className="font-mono text-sm">${formatCurrency(subtotal.value)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PayslipView({
  record,
  companySettings,
  defaultMode = "employee",
  showToggle = true,
  onPrint,
}: PayslipViewProps) {
  const [viewMode, setViewMode] = useState<"employee" | "employer">(defaultMode);
  const isEmployerView = viewMode === "employer";

  const totalOvertimeAllowances =
    record.flat +
    record.ot10 +
    record.ot15 +
    record.ot20 +
    record.ot30 +
    record.shiftAllowance +
    record.totRestPhAmount;

  const totalAllowancesWithCpf =
    record.mobileAllowance +
    record.transportAllowance +
    record.annualLeaveEncashment +
    record.serviceCallAllowances;

  const totalAllowancesWithoutCpf =
    record.otherAllowance + record.houseRentalAllowances;

  const totalCommunityFund =
    record.cc + record.cdac + record.ecf + record.mbmf + record.sinda;

  const totalDeductionsEmployee =
    record.loanRepaymentTotal +
    record.noPayDay +
    totalCommunityFund +
    Math.abs(record.employeeCpf);

  const totalEmployerContributions =
    record.employerCpf + record.sdf + record.fwl;

  return (
    <Card className="print:shadow-none print:border-none" data-testid="payslip-view">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            {companySettings?.companyName && (
              <h2 className="text-xl font-bold" data-testid="text-company-name">
                {companySettings.companyName}
              </h2>
            )}
            {companySettings?.companyAddress && (
              <p className="text-sm text-muted-foreground" data-testid="text-company-address">
                {companySettings.companyAddress}
              </p>
            )}
            {companySettings?.companyUen && (
              <p className="text-sm text-muted-foreground">
                UEN: <span data-testid="text-company-uen">{companySettings.companyUen}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 print:hidden">
            {showToggle && (
              <div className="flex items-center gap-2">
                <Switch
                  id="view-mode"
                  checked={isEmployerView}
                  onCheckedChange={(checked) =>
                    setViewMode(checked ? "employer" : "employee")
                  }
                  data-testid="switch-view-mode"
                />
                <Label htmlFor="view-mode" className="text-sm flex items-center gap-1">
                  {isEmployerView ? (
                    <>
                      <Eye className="h-4 w-4" />
                      Employer View
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Employee View
                    </>
                  )}
                </Label>
              </div>
            )}
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint} data-testid="button-print">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg">Payslip - {record.payPeriod}</CardTitle>
            <Badge variant="secondary" data-testid="badge-pay-mode">
              {record.payMode || "BANK"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Section title="Employee Information" sectionLetter="A">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium" data-testid="text-employee-name">{record.employeeName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Employee Code</p>
              <p className="font-medium" data-testid="text-employee-code">{record.employeeCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium">{record.deptName || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Section</p>
              <p className="font-medium">{record.secName || "-"}</p>
            </div>
            {record.nric && (
              <div>
                <p className="text-muted-foreground">NRIC</p>
                <p className="font-medium">{record.nric}</p>
              </div>
            )}
            {record.joinDate && (
              <div>
                <p className="text-muted-foreground">Join Date</p>
                <p className="font-medium">{record.joinDate}</p>
              </div>
            )}
          </div>
        </Section>

        <Separator />

        <Section
          title="Basic Earnings"
          sectionLetter="B"
          subtotal={{ label: "Total Basic Earnings", value: record.totSalary }}
        >
          <LineItem label="Basic Salary" value={record.basicSalary} showZero />
          <LineItem label="Monthly Variables" value={record.monthlyVariablesComponent} />
        </Section>

        <Section
          title="Overtime & Shift Allowances"
          sectionLetter="C"
          subtotal={{ label: "Total Overtime", value: totalOvertimeAllowances }}
        >
          <LineItem label="Flat Rate Overtime" value={record.flat} />
          <LineItem label="OT 1.0x" value={record.ot10} />
          <LineItem label="OT 1.5x" value={record.ot15} />
          <LineItem label="OT 2.0x" value={record.ot20} />
          <LineItem label="OT 3.0x" value={record.ot30} />
          <LineItem label="Shift Allowance" value={record.shiftAllowance} />
          <LineItem label="Rest/PH Amount" value={record.totRestPhAmount} />
        </Section>

        <Section
          title="Allowances (With CPF)"
          sectionLetter="D"
          subtotal={{ label: "Total Allowances (CPF)", value: totalAllowancesWithCpf }}
        >
          <LineItem label="Mobile Allowance" value={record.mobileAllowance} />
          <LineItem label="Transport Allowance" value={record.transportAllowance} />
          <LineItem label="Annual Leave Encashment" value={record.annualLeaveEncashment} />
          <LineItem label="Service Call Allowances" value={record.serviceCallAllowances} />
        </Section>

        <Section
          title="Allowances (Without CPF)"
          sectionLetter="E"
          subtotal={{ label: "Total Allowances (Non-CPF)", value: totalAllowancesWithoutCpf }}
        >
          <LineItem label="Other Allowance" value={record.otherAllowance} />
          <LineItem label="House Rental Allowances" value={record.houseRentalAllowances} />
        </Section>

        <Section title="Bonus & Additional Payments" sectionLetter="F">
          <LineItem label="Bonus" value={record.bonus} />
        </Section>

        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center font-semibold">
            <span>Gross Wages</span>
            <span className="font-mono text-lg" data-testid="text-gross-wages">
              ${formatCurrency(record.grossWages)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>CPF Wages (Ordinary + Additional)</span>
            <span className="font-mono">${formatCurrency(record.cpfWages)}</span>
          </div>
        </div>

        <Separator />

        <Section
          title="Employee CPF Contribution"
          sectionLetter="G"
          subtotal={{ label: "Total Employee CPF", value: Math.abs(record.employeeCpf) }}
        >
          <LineItem
            label="Employee CPF (20%)"
            value={Math.abs(record.employeeCpf)}
            isNegative
          />
        </Section>

        <Section
          title="Deductions"
          sectionLetter="H"
          subtotal={{ label: "Total Deductions", value: totalDeductionsEmployee }}
        >
          <LineItem label="Loan Repayments" value={record.loanRepaymentTotal} isNegative />
          <LineItem label="No Pay Day Deduction" value={record.noPayDay} isNegative />
          <div className="text-xs text-muted-foreground mt-2 mb-1">
            Community Contributions:
          </div>
          <LineItem label="CDAC" value={record.cdac} isNegative />
          <LineItem label="MBMF" value={record.mbmf} isNegative />
          <LineItem label="SINDA" value={record.sinda} isNegative />
          <LineItem label="ECF" value={record.ecf} isNegative />
          <LineItem label="CC" value={record.cc} isNegative />
        </Section>

        {isEmployerView && (
          <>
            <Separator />
            <Section
              title="Employer Contributions (Not Shown to Employee)"
              sectionLetter="I"
              subtotal={{ label: "Total Employer Cost", value: totalEmployerContributions }}
            >
              <div className="bg-primary/5 -mx-2 px-2 py-2 rounded-md border border-dashed border-primary/20">
                <LineItem
                  label="Employer CPF (17%)"
                  value={record.employerCpf}
                />
                <LineItem label="Skills Development Fund (SDF)" value={record.sdf} />
                <LineItem label="Foreign Worker Levy (FWL)" value={record.fwl} />
              </div>
            </Section>
          </>
        )}

        <Separator />

        <Section title="Payment Summary" sectionLetter="J">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Earnings</span>
              <span className="font-mono">${formatCurrency(record.total)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Less: Deductions</span>
              <span className="font-mono text-destructive">
                -${formatCurrency(totalDeductionsEmployee)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-bold">Net Pay</span>
              <span
                className="font-mono text-2xl font-bold text-primary"
                data-testid="text-net-pay"
              >
                ${formatCurrency(record.nett)}
              </span>
            </div>

            {isEmployerView && (
              <div className="mt-4 pt-4 border-t border-dashed">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Cost to Company
                  </span>
                  <span
                    className="font-mono text-lg font-semibold"
                    data-testid="text-total-cost"
                  >
                    ${formatCurrency(record.grossWages + totalEmployerContributions)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  (Gross Wages + Employer CPF + Levies)
                </p>
              </div>
            )}
          </div>
        </Section>

        {record.payMode && (
          <div className="text-xs text-muted-foreground text-center mt-4">
            Payment Method: {record.payMode}
            {record.chequeNo && ` | Cheque No: ${record.chequeNo}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
