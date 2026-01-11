// Singapore CPF Calculation Utility (From 1 Jan 2026)
// Based on official CPF contribution rates

export type ResidencyStatus = 'SC' | 'SPR' | 'FOREIGNER';

export interface CPFRates {
  employerRate: number;
  employeeRate: number;
  totalRate: number;
}

export interface CPFResult {
  grossWages: number; // cents
  cpfWages: number; // cents (wages subject to CPF, capped)
  employeeCPF: number; // cents (deducted from salary)
  employerCPF: number; // cents (employer's additional contribution)
  totalCPF: number; // cents
  netPay: number; // cents (after employee CPF deduction)
  isEligible: boolean;
  reason?: string;
}

// Monthly Ordinary Wage Ceiling (from 2026)
const MONTHLY_OW_CEILING = 800000; // $8,000 in cents

// Annual Wage Ceiling
const ANNUAL_WAGE_CEILING = 10200000; // $102,000 in cents

// Minimum wage for CPF
const MIN_WAGE_FOR_CPF = 5000; // $50 in cents

// Threshold for employee contribution
const EMPLOYEE_CONTRIB_THRESHOLD = 50000; // $500 in cents

// Phase-in threshold for employee contribution
const PHASE_IN_THRESHOLD = 75000; // $750 in cents

// CPF contribution rates by age group (from 1 Jan 2026) for Singapore Citizens
const SC_CPF_RATES: { maxAge: number; employerRate: number; employeeRate: number }[] = [
  { maxAge: 55, employerRate: 0.17, employeeRate: 0.20 }, // 55 & below: 17% + 20% = 37%
  { maxAge: 60, employerRate: 0.16, employeeRate: 0.18 }, // Above 55 to 60: 16% + 18% = 34%
  { maxAge: 65, employerRate: 0.125, employeeRate: 0.125 }, // Above 60 to 65: 12.5% + 12.5% = 25%
  { maxAge: 70, employerRate: 0.09, employeeRate: 0.075 }, // Above 65 to 70: 9% + 7.5% = 16.5%
  { maxAge: 999, employerRate: 0.075, employeeRate: 0.05 }, // Above 70: 7.5% + 5% = 12.5%
];

// SPR graduated rates (Year 1 - applicable to both employer and employee opting for graduated rates)
const SPR_YEAR1_RATES: { maxAge: number; employerRate: number; employeeRate: number }[] = [
  { maxAge: 55, employerRate: 0.04, employeeRate: 0.05 },
  { maxAge: 60, employerRate: 0.04, employeeRate: 0.05 },
  { maxAge: 65, employerRate: 0.04, employeeRate: 0.05 },
  { maxAge: 70, employerRate: 0.04, employeeRate: 0.05 },
  { maxAge: 999, employerRate: 0.04, employeeRate: 0.05 },
];

// SPR graduated rates (Year 2)
const SPR_YEAR2_RATES: { maxAge: number; employerRate: number; employeeRate: number }[] = [
  { maxAge: 55, employerRate: 0.09, employeeRate: 0.15 },
  { maxAge: 60, employerRate: 0.09, employeeRate: 0.125 },
  { maxAge: 65, employerRate: 0.075, employeeRate: 0.075 },
  { maxAge: 70, employerRate: 0.06, employeeRate: 0.05 },
  { maxAge: 999, employerRate: 0.05, employeeRate: 0.035 },
];

/**
 * Calculate age from birth date as of a specific date
 */
export function calculateAge(birthDate: string, asOfDate: Date = new Date()): number {
  const birth = new Date(birthDate);
  let age = asOfDate.getFullYear() - birth.getFullYear();
  const monthDiff = asOfDate.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && asOfDate.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Calculate years of SPR status
 */
export function calculateSPRYears(sprStartDate: string, asOfDate: Date = new Date()): number {
  const start = new Date(sprStartDate);
  const diffMs = asOfDate.getTime() - start.getTime();
  return diffMs / (365.25 * 24 * 60 * 60 * 1000);
}

/**
 * Get CPF rates based on age, residency status, and SPR tenure
 */
export function getCPFRates(
  age: number,
  residencyStatus: ResidencyStatus,
  sprYears?: number
): CPFRates {
  // Foreigners don't pay CPF
  if (residencyStatus === 'FOREIGNER') {
    return { employerRate: 0, employeeRate: 0, totalRate: 0 };
  }
  
  let ratesTable: typeof SC_CPF_RATES;
  
  if (residencyStatus === 'SC') {
    ratesTable = SC_CPF_RATES;
  } else {
    // SPR with graduated rates
    if (sprYears !== undefined && sprYears < 1) {
      ratesTable = SPR_YEAR1_RATES;
    } else if (sprYears !== undefined && sprYears < 2) {
      ratesTable = SPR_YEAR2_RATES;
    } else {
      // SPR Year 3+ uses full SC rates
      ratesTable = SC_CPF_RATES;
    }
  }
  
  const rates = ratesTable.find(r => age <= r.maxAge) || ratesTable[ratesTable.length - 1];
  
  return {
    employerRate: rates.employerRate,
    employeeRate: rates.employeeRate,
    totalRate: rates.employerRate + rates.employeeRate,
  };
}

/**
 * Calculate employee CPF contribution with phase-in for low wages
 */
function calculateEmployeeCPF(wages: number, employeeRate: number): number {
  // For wages < $500, employee doesn't contribute (only employer)
  if (wages < EMPLOYEE_CONTRIB_THRESHOLD) {
    return 0;
  }
  
  // For wages $500 - $750, use phase-in formula
  if (wages < PHASE_IN_THRESHOLD) {
    // Phase-in formula: 0.6 * (TW - $500) for the first tier
    // Simplified: employee pays reduced rate
    const excessWages = wages - EMPLOYEE_CONTRIB_THRESHOLD;
    const phaseInRate = 0.6; // Approximate phase-in multiplier
    return Math.round(excessWages * phaseInRate);
  }
  
  // Full contribution for wages >= $750
  return Math.round(wages * employeeRate);
}

/**
 * Calculate CPF contributions for a given monthly wage
 */
export function calculateCPF(
  totalWages: number, // cents (total gross wages for the month)
  age: number,
  residencyStatus: ResidencyStatus,
  sprYears?: number,
  annualOrdinaryWagesToDate: number = 0 // For annual wage ceiling tracking
): CPFResult {
  // Check eligibility
  if (residencyStatus === 'FOREIGNER') {
    return {
      grossWages: totalWages,
      cpfWages: 0,
      employeeCPF: 0,
      employerCPF: 0,
      totalCPF: 0,
      netPay: totalWages,
      isEligible: false,
      reason: 'Foreigners are not eligible for CPF',
    };
  }
  
  if (totalWages < MIN_WAGE_FOR_CPF) {
    return {
      grossWages: totalWages,
      cpfWages: 0,
      employeeCPF: 0,
      employerCPF: 0,
      totalCPF: 0,
      netPay: totalWages,
      isEligible: false,
      reason: 'Monthly wages below $50 are not subject to CPF',
    };
  }
  
  const rates = getCPFRates(age, residencyStatus, sprYears);
  
  // Apply monthly ordinary wage ceiling
  let cpfWages = Math.min(totalWages, MONTHLY_OW_CEILING);
  
  // Also check against annual wage ceiling (for additional wages)
  const remainingAnnualCeiling = ANNUAL_WAGE_CEILING - annualOrdinaryWagesToDate;
  if (cpfWages > remainingAnnualCeiling) {
    cpfWages = Math.max(0, remainingAnnualCeiling);
  }
  
  // Calculate employer CPF (always applies for eligible employees)
  const employerCPF = Math.round(cpfWages * rates.employerRate);
  
  // Calculate employee CPF with phase-in
  const employeeCPF = calculateEmployeeCPF(cpfWages, rates.employeeRate);
  
  const totalCPF = employerCPF + employeeCPF;
  const netPay = totalWages - employeeCPF;
  
  return {
    grossWages: totalWages,
    cpfWages,
    employeeCPF,
    employerCPF,
    totalCPF,
    netPay,
    isEligible: true,
  };
}

/**
 * Calculate total hours worked from attendance records
 */
export function calculateHoursFromAttendance(
  clockInTime: Date | string,
  clockOutTime: Date | string | null
): number {
  if (!clockOutTime) return 0;
  
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Round to nearest 0.25 hour (15 minutes) for more precision
  return Math.round(diffHours * 4) / 4;
}

/**
 * Split hours into regular and overtime
 */
export function splitHours(
  totalHours: number,
  regularHoursPerDay: number = 8,
  daysWorked: number = 1
): { regularHours: number; overtimeHours: number } {
  const maxRegularHours = regularHoursPerDay * daysWorked;
  const regularHours = Math.min(totalHours, maxRegularHours);
  const overtimeHours = Math.max(0, totalHours - maxRegularHours);
  
  return { regularHours, overtimeHours };
}

/**
 * Calculate pay from hours worked
 */
export function calculatePayFromHours(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number, // cents
  otMultiplier: number = 1.5
): { regularPay: number; overtimePay: number; totalPay: number } {
  const regularPay = Math.round(regularHours * hourlyRate);
  const overtimePay = Math.round(overtimeHours * hourlyRate * otMultiplier);
  const totalPay = regularPay + overtimePay;
  
  return { regularPay, overtimePay, totalPay };
}

/**
 * Convert monthly salary to hourly rate
 */
export function monthlyToHourlyRate(
  monthlySalary: number, // cents
  regularHoursPerDay: number = 8,
  regularDaysPerWeek: number = 5
): number {
  // Assuming ~4.33 weeks per month
  const hoursPerMonth = regularHoursPerDay * regularDaysPerWeek * 4.33;
  return Math.round(monthlySalary / hoursPerMonth);
}

/**
 * Convert daily rate to hourly rate
 */
export function dailyToHourlyRate(
  dailyRate: number, // cents
  regularHoursPerDay: number = 8
): number {
  return Math.round(dailyRate / regularHoursPerDay);
}
