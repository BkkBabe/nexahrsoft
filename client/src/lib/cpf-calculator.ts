// Singapore CPF Calculation Utility (Client-side)
// Based on official CPF contribution rates (supports 2025 and 2026+ rates)

export type ResidencyStatus = 'SC' | 'SPR' | 'FOREIGNER';

export interface CPFRates {
  employerRate: number;
  employeeRate: number;
  totalRate: number;
}

export interface CPFResult {
  grossWages: number;
  cpfWages: number;
  employeeCPF: number;
  employerCPF: number;
  totalCPF: number;
  netPay: number;
  isEligible: boolean;
  reason?: string;
  rates: CPFRates;
}

// Monthly Ordinary Wage Ceiling
const MONTHLY_OW_CEILING = 8000;

// Minimum wage for CPF
const MIN_WAGE_FOR_CPF = 50;

// Threshold for employee contribution
const EMPLOYEE_CONTRIB_THRESHOLD = 500;

// Phase-in threshold for employee contribution
const PHASE_IN_THRESHOLD = 750;

// CPF contribution rates by age group for 2025 (wages earned up to Dec 2025) for Singapore Citizens
const SC_CPF_RATES_2025: { maxAge: number; employerRate: number; employeeRate: number }[] = [
  { maxAge: 55, employerRate: 0.17, employeeRate: 0.20 },
  { maxAge: 60, employerRate: 0.14, employeeRate: 0.15 },
  { maxAge: 65, employerRate: 0.12, employeeRate: 0.115 },
  { maxAge: 70, employerRate: 0.09, employeeRate: 0.085 },
  { maxAge: 999, employerRate: 0.075, employeeRate: 0.075 },
];

// CPF contribution rates by age group (from 1 Jan 2026) for Singapore Citizens
const SC_CPF_RATES_2026: { maxAge: number; employerRate: number; employeeRate: number }[] = [
  { maxAge: 55, employerRate: 0.17, employeeRate: 0.20 },
  { maxAge: 60, employerRate: 0.16, employeeRate: 0.18 },
  { maxAge: 65, employerRate: 0.125, employeeRate: 0.125 },
  { maxAge: 70, employerRate: 0.09, employeeRate: 0.075 },
  { maxAge: 999, employerRate: 0.075, employeeRate: 0.05 },
];

// SPR graduated rates (Year 1)
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
 * Determine if wage month is before 2026 (uses 2025 rates)
 */
function isPreJan2026(wageMonth?: string): boolean {
  if (!wageMonth) return false;
  const [year] = wageMonth.split('-').map(Number);
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
  wageMonth?: string
): CPFRates {
  if (residencyStatus === 'FOREIGNER') {
    return { employerRate: 0, employeeRate: 0, totalRate: 0 };
  }
  
  let ratesTable: typeof SC_CPF_RATES_2026;
  
  if (residencyStatus === 'SC') {
    ratesTable = getSCRateTable(wageMonth);
  } else {
    // SPR with graduated rates
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
 * Floor to nearest dollar (for employee CPF per CPF Board rules)
 */
function floorToDollars(amount: number): number {
  return Math.floor(amount);
}

/**
 * Ceil to nearest dollar (for employer CPF per CPF Board rules)
 */
function ceilToDollars(amount: number): number {
  return Math.ceil(amount);
}

/**
 * Calculate employee CPF contribution with phase-in for low wages
 */
function calculateEmployeeCPF(wages: number, employeeRate: number): number {
  if (wages < EMPLOYEE_CONTRIB_THRESHOLD) {
    return 0;
  }
  
  if (wages < PHASE_IN_THRESHOLD) {
    const excessWages = wages - EMPLOYEE_CONTRIB_THRESHOLD;
    const phaseInRate = 0.6;
    return floorToDollars(excessWages * phaseInRate);
  }
  
  return floorToDollars(wages * employeeRate);
}

/**
 * Calculate employer CPF contribution
 */
function calculateEmployerCPF(wages: number, employerRate: number): number {
  return ceilToDollars(wages * employerRate);
}

/**
 * Calculate CPF contributions for a given monthly wage
 */
export function calculateCPF(
  totalWages: number,
  age: number,
  residencyStatus: ResidencyStatus,
  sprYears?: number,
  wageMonth?: string
): CPFResult {
  const rates = getCPFRates(age, residencyStatus, sprYears, wageMonth);
  
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
      rates,
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
      rates,
    };
  }
  
  // Apply monthly ordinary wage ceiling
  const cpfWages = Math.min(totalWages, MONTHLY_OW_CEILING);
  
  // Calculate contributions
  const employerCPF = calculateEmployerCPF(cpfWages, rates.employerRate);
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
    rates,
  };
}

/**
 * Format percentage for display
 */
export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Get age bracket description for display
 */
export function getAgeBracketDescription(age: number): string {
  if (age <= 55) return '55 & below';
  if (age <= 60) return 'Above 55 to 60';
  if (age <= 65) return 'Above 60 to 65';
  if (age <= 70) return 'Above 65 to 70';
  return 'Above 70';
}

/**
 * Get SPR year description
 */
export function getSPRYearDescription(sprYears: number | undefined): string {
  if (sprYears === undefined) return 'Full rates';
  if (sprYears < 1) return 'Year 1 (Graduated)';
  if (sprYears < 2) return 'Year 2 (Graduated)';
  return 'Year 3+ (Full rates)';
}
