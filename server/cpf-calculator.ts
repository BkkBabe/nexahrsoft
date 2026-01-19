// Singapore CPF Calculation Utility
// Based on official CPF contribution rates (supports 2025 and 2026+ rates)

export type ResidencyStatus = 'SC' | 'SPR' | 'FOREIGNER';

export interface CPFRates {
  employerRate: number;
  employeeRate: number;
  totalRate: number;
}

export interface CPFResult {
  grossWages: number; // dollars (e.g., 1200.00)
  cpfWages: number; // dollars (wages subject to CPF, capped)
  employeeCPF: number; // dollars (deducted from salary)
  employerCPF: number; // dollars (employer's additional contribution)
  totalCPF: number; // dollars
  netPay: number; // dollars (after employee CPF deduction)
  isEligible: boolean;
  reason?: string;
}

// Monthly Ordinary Wage Ceiling
const MONTHLY_OW_CEILING = 8000; // $8,000

// Annual Wage Ceiling
const ANNUAL_WAGE_CEILING = 102000; // $102,000

// Minimum wage for CPF
const MIN_WAGE_FOR_CPF = 50; // $50

// Threshold for employee contribution
const EMPLOYEE_CONTRIB_THRESHOLD = 500; // $500

// Phase-in threshold for employee contribution
const PHASE_IN_THRESHOLD = 750; // $750

// CPF contribution rates by age group for 2025 (wages earned up to Dec 2025) for Singapore Citizens
const SC_CPF_RATES_2025: { maxAge: number; employerRate: number; employeeRate: number }[] = [
  { maxAge: 55, employerRate: 0.17, employeeRate: 0.20 }, // 55 & below: 17% + 20% = 37%
  { maxAge: 60, employerRate: 0.14, employeeRate: 0.15 }, // Above 55 to 60: 14% + 15% = 29%
  { maxAge: 65, employerRate: 0.12, employeeRate: 0.115 }, // Above 60 to 65: 12% + 11.5% = 23.5%
  { maxAge: 70, employerRate: 0.09, employeeRate: 0.085 }, // Above 65 to 70: 9% + 8.5% = 17.5%
  { maxAge: 999, employerRate: 0.075, employeeRate: 0.075 }, // Above 70: 7.5% + 7.5% = 15%
];

// CPF contribution rates by age group (from 1 Jan 2026) for Singapore Citizens
const SC_CPF_RATES_2026: { maxAge: number; employerRate: number; employeeRate: number }[] = [
  { maxAge: 55, employerRate: 0.17, employeeRate: 0.20 }, // 55 & below: 17% + 20% = 37%
  { maxAge: 60, employerRate: 0.16, employeeRate: 0.18 }, // Above 55 to 60: 16% + 18% = 34%
  { maxAge: 65, employerRate: 0.125, employeeRate: 0.125 }, // Above 60 to 65: 12.5% + 12.5% = 25%
  { maxAge: 70, employerRate: 0.09, employeeRate: 0.075 }, // Above 65 to 70: 9% + 7.5% = 16.5%
  { maxAge: 999, employerRate: 0.075, employeeRate: 0.05 }, // Above 70: 7.5% + 5% = 12.5%
];

// Alias for backward compatibility
const SC_CPF_RATES = SC_CPF_RATES_2026;

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
 * Get the last day of a month for age calculation
 */
export function getWageMonthEndDate(wageMonth: string): Date {
  // wageMonth format: "YYYY-MM"
  const [year, month] = wageMonth.split('-').map(Number);
  // Create date for first day of next month, then subtract 1 day to get last day of wage month
  return new Date(year, month, 0); // month is 1-indexed here, so this gives last day of that month
}

/**
 * Determine if wage month is before 2026 (uses 2025 rates)
 */
function isPreJan2026(wageMonth?: string): boolean {
  if (!wageMonth) return false;
  const [year, month] = wageMonth.split('-').map(Number);
  // Before January 2026 means year < 2026
  return year < 2026;
}

/**
 * Get the correct SC CPF rate table based on wage month
 */
function getSCRateTable(wageMonth?: string): typeof SC_CPF_RATES_2026 {
  if (isPreJan2026(wageMonth)) {
    return SC_CPF_RATES_2025;
  }
  return SC_CPF_RATES_2026;
}

/**
 * Get CPF rates based on age, residency status, SPR tenure, and wage month
 */
export function getCPFRates(
  age: number,
  residencyStatus: ResidencyStatus,
  sprYears?: number,
  wageMonth?: string // Format: "YYYY-MM" - used to select correct rate table
): CPFRates {
  // Foreigners don't pay CPF
  if (residencyStatus === 'FOREIGNER') {
    return { employerRate: 0, employeeRate: 0, totalRate: 0 };
  }
  
  let ratesTable: typeof SC_CPF_RATES;
  
  if (residencyStatus === 'SC') {
    ratesTable = getSCRateTable(wageMonth);
  } else {
    // SPR with graduated rates (using same rates for both 2025 and 2026 for now)
    if (sprYears !== undefined && sprYears < 1) {
      ratesTable = SPR_YEAR1_RATES;
    } else if (sprYears !== undefined && sprYears < 2) {
      ratesTable = SPR_YEAR2_RATES;
    } else {
      // SPR Year 3+ uses full SC rates
      ratesTable = getSCRateTable(wageMonth);
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
 * Round to 2 decimal places for dollar amounts (general rounding)
 */
function roundToDollars(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Floor to nearest dollar (for employee CPF per CPF Board rules)
 * Employee CPF is always rounded DOWN to the nearest dollar
 */
function floorToDollars(amount: number): number {
  return Math.floor(amount);
}

/**
 * Ceil to nearest dollar (for employer CPF per CPF Board rules)
 * Employer CPF is always rounded UP to the nearest dollar
 */
function ceilToDollars(amount: number): number {
  return Math.ceil(amount);
}

/**
 * Calculate employee CPF contribution with phase-in for low wages
 * Employee CPF is always rounded DOWN to the nearest dollar per CPF Board rules
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
    return floorToDollars(excessWages * phaseInRate);
  }
  
  // Full contribution for wages >= $750
  // Employee CPF is floored to nearest dollar
  return floorToDollars(wages * employeeRate);
}

/**
 * Calculate employer CPF contribution
 * Employer CPF is always rounded UP to the nearest dollar per CPF Board rules
 */
function calculateEmployerCPF(wages: number, employerRate: number): number {
  return ceilToDollars(wages * employerRate);
}

/**
 * Calculate CPF contributions for a given monthly wage
 * 
 * @param totalWages - Total gross wages for the month in dollars
 * @param age - Employee age at end of wage month (NOT payment date)
 * @param residencyStatus - SC, SPR, or FOREIGNER
 * @param sprYears - Years as SPR (for graduated rates)
 * @param annualOrdinaryWagesToDate - For annual wage ceiling tracking
 * @param wageMonth - Format "YYYY-MM" - determines which rate table to use
 */
export function calculateCPF(
  totalWages: number,
  age: number,
  residencyStatus: ResidencyStatus,
  sprYears?: number,
  annualOrdinaryWagesToDate: number = 0,
  wageMonth?: string // Format: "YYYY-MM" - determines rate table (2025 vs 2026)
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
  
  // Get CPF rates based on age, residency, and wage month (for correct year's rates)
  const rates = getCPFRates(age, residencyStatus, sprYears, wageMonth);
  
  // Apply monthly ordinary wage ceiling
  let cpfWages = Math.min(totalWages, MONTHLY_OW_CEILING);
  
  // Also check against annual wage ceiling (for additional wages)
  const remainingAnnualCeiling = ANNUAL_WAGE_CEILING - annualOrdinaryWagesToDate;
  if (cpfWages > remainingAnnualCeiling) {
    cpfWages = Math.max(0, remainingAnnualCeiling);
  }
  
  // Calculate employer CPF (always rounded UP to nearest dollar per CPF Board rules)
  const employerCPF = calculateEmployerCPF(cpfWages, rates.employerRate);
  
  // Calculate employee CPF with phase-in (always rounded DOWN to nearest dollar)
  const employeeCPF = calculateEmployeeCPF(cpfWages, rates.employeeRate);
  
  // Total CPF is sum of both (NOT separately calculated from total rate)
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
  hourlyRate: number, // dollars (e.g., 15.50)
  otMultiplier: number = 1.5
): { regularPay: number; overtimePay: number; totalPay: number } {
  const regularPay = roundToDollars(regularHours * hourlyRate);
  const overtimePay = roundToDollars(overtimeHours * hourlyRate * otMultiplier);
  const totalPay = roundToDollars(regularPay + overtimePay);
  
  return { regularPay, overtimePay, totalPay };
}

/**
 * Convert monthly salary to daily rate using MOM formula
 * Daily rate = (Monthly Salary × 12) ÷ (Days per Week × 52)
 */
export function monthlyToDailyRate(
  monthlySalary: number, // dollars (e.g., 1200.00)
  regularDaysPerWeek: number = 5
): number {
  // MOM formula: Daily rate = (Monthly × 12) / (Days per Week × 52)
  return roundToDollars((monthlySalary * 12) / (regularDaysPerWeek * 52));
}

/**
 * Convert monthly salary to hourly rate using MOM formula
 * Hourly rate = Daily rate ÷ Hours per Day
 */
export function monthlyToHourlyRate(
  monthlySalary: number, // dollars (e.g., 1200.00)
  regularHoursPerDay: number = 8,
  regularDaysPerWeek: number = 5
): number {
  // MOM formula: Daily rate = (Monthly × 12) / (Days per Week × 52)
  // Hourly rate = Daily rate / Hours per Day
  const dailyRate = monthlyToDailyRate(monthlySalary, regularDaysPerWeek);
  return roundToDollars(dailyRate / regularHoursPerDay);
}

/**
 * Convert daily rate to hourly rate
 */
export function dailyToHourlyRate(
  dailyRate: number, // dollars (e.g., 120.00)
  regularHoursPerDay: number = 8
): number {
  return roundToDollars(dailyRate / regularHoursPerDay);
}
