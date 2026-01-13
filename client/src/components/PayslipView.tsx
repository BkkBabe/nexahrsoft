import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Printer, Settings2 } from "lucide-react";
import type { PayrollRecord, CompanySettings } from "@shared/schema";
import PayrollAdjustmentsDialog from "./PayrollAdjustmentsDialog";

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
}

const ADJUSTMENT_TYPE_LABELS: Record<string, string> = {
  overtime: "Overtime",
  mc_days: "MC Days",
  al_days: "Annual Leave Days",
  late_hours: "Late Hours Deduction",
  advance: "Salary Advance",
  claim: "Expense Claim",
  deduction: "Other Deduction",
  bonus: "Bonus",
  other: "Other Adjustment",
};

interface PayslipViewProps {
  record: PayrollRecord;
  companySettings?: CompanySettings | null;
  defaultMode?: "employee" | "employer";
  showToggle?: boolean;
  onPrint?: () => void;
}

function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

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
  const [adjustmentsDialogOpen, setAdjustmentsDialogOpen] = useState(false);
  const isEmployerView = viewMode === "employer";

  const { data: adjustmentsData } = useQuery<{ adjustments: PayrollAdjustment[] }>({
    queryKey: ['/api/admin/payroll/adjustments', record?.userId, record?.payPeriodYear, record?.payPeriodMonth],
    queryFn: async () => {
      if (!record?.userId) return { adjustments: [] };
      const res = await fetch(
        `/api/admin/payroll/adjustments?userId=${record.userId}&year=${record.payPeriodYear}&month=${record.payPeriodMonth}`,
        { credentials: 'include' }
      );
      if (!res.ok) return { adjustments: [] };
      return res.json();
    },
    enabled: !!record?.userId,
  });

  const adjustments = adjustmentsData?.adjustments || [];
  const totalAdjustments = adjustments.reduce((sum, adj) => {
    const amount = parseAmount(adj.amount);
    const isDeduction = ['late_hours', 'advance', 'deduction'].includes(adj.adjustmentType);
    return sum + (isDeduction ? -amount : amount);
  }, 0);

  const totalOvertimeAllowances =
    parseAmount(record.flat) +
    parseAmount(record.ot10) +
    parseAmount(record.ot15) +
    parseAmount(record.ot20) +
    parseAmount(record.ot30) +
    parseAmount(record.shiftAllowance) +
    parseAmount(record.totRestPhAmount);

  const totalAllowances =
    parseAmount(record.mobileAllowance) +
    parseAmount(record.transportAllowance) +
    parseAmount(record.annualLeaveEncashment) +
    parseAmount(record.serviceCallAllowances) +
    parseAmount(record.otherAllowance) +
    parseAmount(record.houseRentalAllowances);

  const totalCommunityFund =
    parseAmount(record.cc) + parseAmount(record.cdac) + parseAmount(record.ecf) + parseAmount(record.mbmf) + parseAmount(record.sinda);

  const totalDeductionsEmployee =
    parseAmount(record.loanRepaymentTotal) +
    parseAmount(record.noPayDay) +
    totalCommunityFund +
    Math.abs(parseAmount(record.employeeCpf));

  const totalEmployerContributions =
    parseAmount(record.employerCpf) + parseAmount(record.sdf) + parseAmount(record.fwl);

  const totalEarnings =
    parseAmount(record.totSalary) +
    totalOvertimeAllowances +
    totalAllowances +
    parseAmount(record.bonus);

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
        {/* Section A: Employee Information */}
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

        {/* Section B: Earnings */}
        <Section
          title="Earnings"
          sectionLetter="B"
          subtotal={{ label: "Total Earnings", value: totalEarnings }}
        >
          <LineItem label="Basic Salary" value={record.basicSalary} showZero />
          <LineItem label="Monthly Variables" value={record.monthlyVariablesComponent} />
          {isEmployerView && (
            <>
              <HoursItem label="Basic Hours Worked" hours={record.basicHoursWorked} />
              <HoursItem label="OT Hours Worked" hours={record.otHoursWorked} />
            </>
          )}
          {totalOvertimeAllowances > 0 && (
            <>
              <div className="text-xs text-muted-foreground mt-1 mb-0.5 print:text-[10px]">Overtime & Shift:</div>
              <LineItem label="Flat Rate Overtime" value={record.flat} />
              <LineItem label="OT 1.0x" value={record.ot10} />
              <LineItem label="OT 1.5x" value={record.ot15} />
              <LineItem label="OT 2.0x" value={record.ot20} />
              <LineItem label="OT 3.0x" value={record.ot30} />
              <LineItem label="Shift Allowance" value={record.shiftAllowance} />
              <LineItem label="Rest/PH Amount" value={record.totRestPhAmount} />
            </>
          )}
          {totalAllowances > 0 && (
            <>
              <div className="text-xs text-muted-foreground mt-1 mb-0.5 print:text-[10px]">Allowances:</div>
              <LineItem label="Mobile Allowance" value={record.mobileAllowance} />
              <LineItem label="Transport Allowance" value={record.transportAllowance} />
              <LineItem label="Annual Leave Encashment" value={record.annualLeaveEncashment} />
              <LineItem label="Service Call Allowances" value={record.serviceCallAllowances} />
              <LineItem label="Other Allowance" value={record.otherAllowance} />
              <LineItem label="House Rental Allowances" value={record.houseRentalAllowances} />
            </>
          )}
          <LineItem label="Bonus" value={record.bonus} />
        </Section>

        {/* Section C: Deductions */}
        {totalDeductionsEmployee > 0 && (
          <Section
            title="Deductions"
            sectionLetter="C"
            subtotal={{ label: "Total Deductions", value: totalDeductionsEmployee }}
          >
            <LineItem
              label="Employee CPF (20%)"
              value={Math.abs(parseAmount(record.employeeCpf))}
              isNegative
            />
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

        {/* Section D: Adjustments */}
        <Section 
          title="Adjustments" 
          sectionLetter="D"
          subtotal={adjustments.length > 0 ? { label: "Total Adjustments", value: totalAdjustments } : undefined}
        >
          {adjustments.length > 0 ? (
            <>
              {adjustments.map((adj) => {
                const isDeduction = ['late_hours', 'advance', 'deduction'].includes(adj.adjustmentType);
                const label = adj.description || ADJUSTMENT_TYPE_LABELS[adj.adjustmentType] || adj.adjustmentType;
                return (
                  <LineItem
                    key={adj.id}
                    label={label}
                    value={adj.amount}
                    isNegative={isDeduction}
                  />
                );
              })}
            </>
          ) : (
            <div className="text-sm text-muted-foreground print:text-xs">
              No adjustments for this period
            </div>
          )}
          <div className="print:hidden mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustmentsDialogOpen(true)}
              data-testid="button-adjustments"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Adjustments
            </Button>
          </div>
        </Section>

        {/* Employer Contributions (shown only in employer view) */}
        {isEmployerView && totalEmployerContributions > 0 && (
          <>
            <Separator className="print:my-1" />
            <div className="bg-primary/5 rounded-lg p-3 space-y-1 print:p-2 print:space-y-0">
              <div className="text-xs text-muted-foreground mb-1 print:text-[10px]">
                Employer Contributions (Not Shown to Employee):
              </div>
              <LineItem label="Employer CPF (17%)" value={record.employerCpf} />
              <LineItem label="Skills Development Fund (SDF)" value={record.sdf} />
              <LineItem label="Foreign Worker Levy (FWL)" value={record.fwl} />
              <Separator className="my-1 print:my-0.5" />
              <div className="flex justify-between items-center font-semibold">
                <span className="text-sm print:text-xs">Total Employer Cost</span>
                <span className="font-mono text-sm print:text-xs">${formatCurrency(totalEmployerContributions)}</span>
              </div>
            </div>
          </>
        )}

        <Separator className="print:my-1" />

        {/* Section E: Payment Summary */}
        <Section title="Payment Summary" sectionLetter="E">
          <div className="space-y-2 print:space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm print:text-xs">Gross Wages</span>
              <span className="font-mono print:text-xs" data-testid="text-gross-wages">
                ${formatCurrency(record.grossWages)}
              </span>
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
                    ${formatCurrency(parseAmount(record.grossWages) + totalEmployerContributions)}
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

      <PayrollAdjustmentsDialog
        open={adjustmentsDialogOpen}
        onOpenChange={setAdjustmentsDialogOpen}
        record={record}
      />
    </Card>
  );
}
