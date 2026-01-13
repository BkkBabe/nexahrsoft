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

function formatNegativeCurrency(dollars: number | string | null | undefined): string {
  const value = Math.abs(parseAmount(dollars));
  return `-${value.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Type for monetary values (can be string from API or number)
type MonetaryValue = number | string | null | undefined;

interface LineItemProps {
  label: string;
  value: MonetaryValue;
  isNegative?: boolean;
  isBold?: boolean;
  showZero?: boolean;
}

function LineItem({ label, value, isNegative, isBold, showZero = false }: LineItemProps) {
  const numValue = parseAmount(value);
  if (numValue === 0 && !showZero) return null;
  
  const fontWeight = isBold ? "font-semibold" : "";
  const textColor = isNegative && numValue !== 0 ? "text-destructive" : "";
  
  return (
    <div className={`flex justify-between items-center py-0.5 print:py-0 ${fontWeight}`}>
      <span className="text-sm print:text-xs">{label}</span>
      <span className={`font-mono text-sm print:text-xs ${textColor}`}>
        ${isNegative && numValue !== 0 ? formatNegativeCurrency(value) : formatCurrency(value)}
      </span>
    </div>
  );
}

// Format hours display (e.g., "45.50 hrs")
function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "0.00";
  return hours.toFixed(2);
}

interface HoursItemProps {
  label: string;
  hours: number | null | undefined;
}

function HoursItem({ label, hours }: HoursItemProps) {
  const numHours = hours ?? 0;
  if (numHours === 0) return null;
  
  return (
    <div className="flex justify-between items-center py-0.5 print:py-0">
      <span className="text-sm print:text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm print:text-xs text-muted-foreground">
        {formatHours(numHours)} hrs
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  sectionLetter: string;
  children: React.ReactNode;
  subtotal?: { label: string; value: MonetaryValue };
  hideIfZero?: boolean;
}

function Section({ title, sectionLetter, children, subtotal, hideIfZero = false }: SectionProps) {
  const subtotalValue = parseAmount(subtotal?.value);
  if (hideIfZero && subtotal && subtotalValue === 0) return null;
  
  return (
    <div className="space-y-1 print:space-y-0">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs print:text-[10px] print:px-1 print:py-0">
          {sectionLetter}
        </Badge>
        <h3 className="text-sm print:text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="pl-2 border-l-2 border-muted print:border-l print:pl-1">
        {children}
        {subtotal && subtotalValue > 0 && (
          <>
            <Separator className="my-1 print:my-0.5" />
            <div className="flex justify-between items-center font-semibold">
              <span className="text-sm print:text-xs">{subtotal.label}</span>
              <span className="font-mono text-sm print:text-xs">${formatCurrency(subtotal.value)}</span>
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
    parseAmount(record.flat) +
    parseAmount(record.ot10) +
    parseAmount(record.ot15) +
    parseAmount(record.ot20) +
    parseAmount(record.ot30) +
    parseAmount(record.shiftAllowance) +
    parseAmount(record.totRestPhAmount);

  const totalAllowancesWithCpf =
    parseAmount(record.mobileAllowance) +
    parseAmount(record.transportAllowance) +
    parseAmount(record.annualLeaveEncashment) +
    parseAmount(record.serviceCallAllowances);

  const totalAllowancesWithoutCpf =
    parseAmount(record.otherAllowance) + parseAmount(record.houseRentalAllowances);

  const totalCommunityFund =
    parseAmount(record.cc) + parseAmount(record.cdac) + parseAmount(record.ecf) + parseAmount(record.mbmf) + parseAmount(record.sinda);

  const totalDeductionsEmployee =
    parseAmount(record.loanRepaymentTotal) +
    parseAmount(record.noPayDay) +
    totalCommunityFund +
    Math.abs(parseAmount(record.employeeCpf));

  const totalEmployerContributions =
    parseAmount(record.employerCpf) + parseAmount(record.sdf) + parseAmount(record.fwl);

  return (
    <Card className="print:shadow-none print:border-none" data-testid="payslip-view">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4 print:gap-2">
          <div className="flex items-start gap-4 print:gap-2">
            {companySettings?.clockInLogoUrl && (
              <img
                src={companySettings.clockInLogoUrl}
                alt="Company Logo"
                className="h-16 w-16 object-contain rounded print:h-12 print:w-12"
                data-testid="img-company-logo"
              />
            )}
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

      <CardContent className="space-y-4 print:space-y-2">
        <Section title="Employee Information" sectionLetter="A">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm print:text-xs print:gap-1">
            <div>
              <p className="text-muted-foreground print:text-[10px]">Name</p>
              <p className="font-medium" data-testid="text-employee-name">{record.employeeName}</p>
            </div>
            <div>
              <p className="text-muted-foreground print:text-[10px]">Employee Code</p>
              <p className="font-medium" data-testid="text-employee-code">{record.employeeCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground print:text-[10px]">Department</p>
              <p className="font-medium">{record.deptName || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground print:text-[10px]">Section</p>
              <p className="font-medium">{record.secName || "-"}</p>
            </div>
            {record.nric && (
              <div>
                <p className="text-muted-foreground print:text-[10px]">NRIC</p>
                <p className="font-medium">{record.nric}</p>
              </div>
            )}
            {record.joinDate && (
              <div>
                <p className="text-muted-foreground print:text-[10px]">Join Date</p>
                <p className="font-medium">{record.joinDate}</p>
              </div>
            )}
          </div>
        </Section>

        <Separator className="print:my-1" />

        <Section
          title="Basic Earnings"
          sectionLetter="B"
          subtotal={{ label: "Total Basic Earnings", value: record.totSalary }}
        >
          <LineItem label="Basic Salary" value={record.basicSalary} showZero />
          <LineItem label="Monthly Variables" value={record.monthlyVariablesComponent} />
          {isEmployerView && (
            <>
              <HoursItem label="Basic Hours Worked" hours={record.basicHoursWorked} />
              <HoursItem label="OT Hours Worked" hours={record.otHoursWorked} />
            </>
          )}
        </Section>

        <Section
          title="Overtime & Shift Allowances"
          sectionLetter="C"
          subtotal={{ label: "Total Overtime", value: totalOvertimeAllowances }}
          hideIfZero
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
          hideIfZero
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
          hideIfZero
        >
          <LineItem label="Other Allowance" value={record.otherAllowance} />
          <LineItem label="House Rental Allowances" value={record.houseRentalAllowances} />
        </Section>

        {parseAmount(record.bonus) > 0 && (
          <Section title="Bonus & Additional Payments" sectionLetter="F">
            <LineItem label="Bonus" value={record.bonus} />
          </Section>
        )}

        <div className="bg-muted/30 rounded-lg p-3 space-y-1 print:p-2 print:space-y-0">
          <div className="flex justify-between items-center font-semibold">
            <span className="print:text-sm">Gross Wages</span>
            <span className="font-mono text-lg print:text-sm" data-testid="text-gross-wages">
              ${formatCurrency(record.grossWages)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground print:text-xs">
            <span>CPF Wages (Ordinary + Additional)</span>
            <span className="font-mono">${formatCurrency(record.cpfWages)}</span>
          </div>
        </div>

        <Separator className="print:my-1" />

        <Section
          title="Employee CPF Contribution"
          sectionLetter="G"
          subtotal={{ label: "Total Employee CPF", value: Math.abs(parseAmount(record.employeeCpf)) }}
          hideIfZero
        >
          <LineItem
            label="Employee CPF (20%)"
            value={Math.abs(parseAmount(record.employeeCpf))}
            isNegative
          />
        </Section>

        {totalDeductionsEmployee > 0 && (
          <Section
            title="Deductions"
            sectionLetter="H"
            subtotal={{ label: "Total Deductions", value: totalDeductionsEmployee }}
          >
            <LineItem label="Loan Repayments" value={record.loanRepaymentTotal} isNegative />
            <LineItem label="No Pay Day Deduction" value={record.noPayDay} isNegative />
            {totalCommunityFund > 0 && (
              <>
                <div className="text-xs text-muted-foreground mt-1 mb-0.5 print:text-[10px]">
                  Community Contributions:
                </div>
                <LineItem label="CDAC" value={record.cdac} isNegative />
                <LineItem label="MBMF" value={record.mbmf} isNegative />
                <LineItem label="SINDA" value={record.sinda} isNegative />
                <LineItem label="ECF" value={record.ecf} isNegative />
                <LineItem label="CC" value={record.cc} isNegative />
              </>
            )}
          </Section>
        )}

        {isEmployerView && totalEmployerContributions > 0 && (
          <>
            <Separator className="print:my-1" />
            <Section
              title="Employer Contributions (Not Shown to Employee)"
              sectionLetter="I"
              subtotal={{ label: "Total Employer Cost", value: totalEmployerContributions }}
            >
              <div className="bg-primary/5 -mx-2 px-2 py-1 rounded-md border border-dashed border-primary/20 print:py-0.5">
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

        <Separator className="print:my-1" />

        <Section title="Payment Summary" sectionLetter="J">
          <div className="space-y-2 print:space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm print:text-xs">Total Earnings</span>
              <span className="font-mono print:text-xs">${formatCurrency(record.total)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm print:text-xs">Less: Deductions</span>
              <span className="font-mono text-destructive print:text-xs">
                -${formatCurrency(totalDeductionsEmployee)}
              </span>
            </div>
            <Separator className="print:my-0.5" />
            <div className="flex justify-between items-center pt-1 print:pt-0.5">
              <span className="text-lg font-bold print:text-sm">Net Pay</span>
              <span
                className="font-mono text-2xl font-bold text-primary print:text-base"
                data-testid="text-net-pay"
              >
                ${formatCurrency(record.nett)}
              </span>
            </div>

            {isEmployerView && (
              <div className="mt-3 pt-3 border-t border-dashed print:mt-1 print:pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground print:text-xs">
                    Total Cost to Company
                  </span>
                  <span
                    className="font-mono text-lg font-semibold print:text-sm"
                    data-testid="text-total-cost"
                  >
                    ${formatCurrency(record.grossWages + totalEmployerContributions)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 print:text-[10px] print:mt-0.5">
                  (Gross Wages + Employer CPF + Levies)
                </p>
              </div>
            )}
          </div>
        </Section>

        {record.payMode && (
          <div className="text-xs text-muted-foreground text-center mt-2 print:text-[10px] print:mt-1">
            Payment Method: {record.payMode}
            {record.chequeNo && ` | Cheque No: ${record.chequeNo}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
