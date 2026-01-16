import XLSX from 'xlsx';
import path from 'path';
import { db } from './db';
import { leaveBalances, leaveApplications, users } from '@shared/schema';
import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface EmployeeLeaveData {
  employeeCode: string;
  employeeName: string;
  leaveRecords: LeaveRecord[];
  balances: {
    AL: LeaveBalance;
    ML: LeaveBalance;
    CL: LeaveBalance;
  };
}

interface LeaveRecord {
  leaveType: string;
  date: string;
  day: string;
  dayValue: number;
  remarks: string | null;
  mlClaimAmount: number | null;
}

interface LeaveBalance {
  eligible: number;
  broughtForward: number;
  earned: number;
  taken: number;
  balance: number;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseDayValue(dayStr: string): number {
  if (!dayStr) return 0;
  const match = dayStr.match(/([\d.]+)\s*day/);
  if (match) {
    return parseFloat(match[1]);
  }
  const hrMatch = dayStr.match(/([\d.]+)\s*hr/);
  if (hrMatch) {
    return parseFloat(hrMatch[1]) / 9;
  }
  return 0;
}

function extractEmployeeInfo(row: any[]): { code: string; name: string } | null {
  const cellStr = row.find(c => typeof c === 'string' && c.includes('Emp Code:'));
  if (!cellStr) return null;

  const codeMatch = cellStr.match(/Emp Code:\s*(\S+)/);
  const nameMatch = cellStr.match(/Employee:\s*([^L]+?)(?:\s*Leave|$)/);

  if (codeMatch) {
    return {
      code: codeMatch[1].trim(),
      name: nameMatch ? nameMatch[1].trim() : ''
    };
  }
  return null;
}

function extractLeaveType(row: any[]): string | null {
  const cellStr = row.find(c => typeof c === 'string' && c.includes('Leave Type:'));
  if (!cellStr) {
    const typeCell = row.find(c => typeof c === 'string' && (
      c.includes('AL -') || c.includes('ML -') || c.includes('OIL -') ||
      c.includes('UL -') || c.includes('CL -')
    ));
    if (typeCell) {
      if (typeCell.includes('AL -')) return 'AL';
      if (typeCell.includes('ML -')) return 'ML';
      if (typeCell.includes('OIL -')) return 'OIL';
      if (typeCell.includes('UL -')) return 'UL';
      if (typeCell.includes('CL -')) return 'CL';
    }
    return null;
  }
  return null;
}

function parseLeaveHistoryExcel(filePath: string): EmployeeLeaveData[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

  const employees: EmployeeLeaveData[] = [];
  let currentEmployee: EmployeeLeaveData | null = null;
  let currentLeaveType: string | null = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const empInfo = extractEmployeeInfo(row);
    if (empInfo) {
      if (currentEmployee) {
        employees.push(currentEmployee);
      }
      currentEmployee = {
        employeeCode: empInfo.code,
        employeeName: empInfo.name,
        leaveRecords: [],
        balances: {
          AL: { eligible: 0, broughtForward: 0, earned: 0, taken: 0, balance: 0 },
          ML: { eligible: 0, broughtForward: 0, earned: 0, taken: 0, balance: 0 },
          CL: { eligible: 0, broughtForward: 0, earned: 0, taken: 0, balance: 0 }
        }
      };
      currentLeaveType = null;
      continue;
    }

    if (!currentEmployee) continue;

    const rowStr = row.join(' ');
    if (rowStr.includes('Leave Type:')) {
      if (rowStr.includes('AL -') || row.some(c => typeof c === 'string' && c.includes('AL -'))) {
        currentLeaveType = 'AL';
      } else if (rowStr.includes('ML -') || row.some(c => typeof c === 'string' && c.includes('ML -'))) {
        currentLeaveType = 'ML';
      } else if (rowStr.includes('OIL -') || row.some(c => typeof c === 'string' && c.includes('OIL -'))) {
        currentLeaveType = 'OIL';
      } else if (rowStr.includes('UL -') || row.some(c => typeof c === 'string' && c.includes('UL -'))) {
        currentLeaveType = 'UL';
      } else if (rowStr.includes('CL -') || row.some(c => typeof c === 'string' && c.includes('CL -'))) {
        currentLeaveType = 'CL';
      }
      continue;
    }

    if (currentLeaveType && row[1] && typeof row[1] === 'number') {
      const dateCell = row[3];
      if (dateCell && typeof dateCell === 'string' && dateCell.match(/\d{2}-\d{2}-\d{4}/)) {
        const dayCell = row[9];
        const dayValueCell = row[24];
        const remarksCell = row[13];
        const mlClaimCell = row[31];

        const parsedDate = parseDate(dateCell);
        if (parsedDate) {
          const record: LeaveRecord = {
            leaveType: currentLeaveType,
            date: parsedDate,
            day: typeof dayCell === 'string' ? dayCell : '',
            dayValue: typeof dayValueCell === 'string' ? parseDayValue(dayValueCell) :
              typeof dayValueCell === 'number' ? dayValueCell : 1,
            remarks: typeof remarksCell === 'string' && remarksCell.trim() ? remarksCell.trim() : null,
            mlClaimAmount: typeof mlClaimCell === 'number' ? mlClaimCell : null
          };
          currentEmployee.leaveRecords.push(record);
        }
      }
    }

    if (rowStr.includes('Annual Leave') && rowStr.includes('Medical Leave')) {
      const balanceRows = data.slice(i, i + 6);
      parseBalanceSummary(currentEmployee, balanceRows);
      i += 5;
    }
  }

  if (currentEmployee) {
    employees.push(currentEmployee);
  }

  return employees;
}

function parseBalanceSummary(employee: EmployeeLeaveData, rows: any[][]) {
  for (const row of rows) {
    if (!row) continue;

    const getNumAt = (idx: number): number => {
      const val = row[idx];
      if (typeof val === 'number') return val;
      if (typeof val === 'string') return parseFloat(val) || 0;
      return 0;
    };

    const getLabelAt = (idx: number): string => {
      const val = row[idx];
      return typeof val === 'string' ? val.toLowerCase().trim() : '';
    };

    const label1 = getLabelAt(1);
    const label9 = getLabelAt(9);
    const label15 = getLabelAt(15);
    const label19 = getLabelAt(19);
    const label26 = getLabelAt(26);
    const label33 = getLabelAt(33);

    if (label1 === 'eligible') {
      employee.balances.AL.eligible = getNumAt(5);
    }
    if (label33 === 'eligible') {
      employee.balances.CL.eligible = getNumAt(36);
    }
    if (label1 === 'bring fwd') {
      employee.balances.AL.broughtForward = getNumAt(5);
    }
    if (label9 === 'taken') {
      employee.balances.AL.taken = getNumAt(11);
    }
    if (label15 === 'eligible') {
      employee.balances.ML.eligible = getNumAt(17);
    }
    if (label19 === 'taken') {
      employee.balances.ML.taken = getNumAt(22);
    }
    if (label33 === 'taken') {
      employee.balances.CL.taken = getNumAt(36);
    }
    if (label1 === 'earned') {
      employee.balances.AL.earned = getNumAt(5);
    }
    if (label9 === 'balance') {
      employee.balances.AL.balance = getNumAt(11);
    }
    if (label15 === 'earn') {
      employee.balances.ML.earned = getNumAt(17);
    }
    if (label19 === 'balance') {
      employee.balances.ML.balance = getNumAt(22);
    }
    if (label33 === 'balance') {
      employee.balances.CL.balance = getNumAt(36);
    }
    if (label33 === 'earn') {
      employee.balances.CL.earned = getNumAt(36);
    }
  }
}

async function findUserByEmployeeCode(employeeCode: string): Promise<{ id: string; name: string | null } | null> {
  const paddedCode = employeeCode.padStart(5, '0');
  const shortCode = employeeCode.replace(/^0+/, '');

  const [user] = await db.select({ id: users.id, name: users.name })
    .from(users)
    .where(
      or(
        eq(users.employeeCode, employeeCode),
        eq(users.employeeCode, paddedCode),
        eq(users.employeeCode, shortCode)
      )
    )
    .limit(1);

  return user || null;
}

async function importLeaveHistory(filePath: string) {
  console.log('Parsing Excel file...');
  const employeesData = parseLeaveHistoryExcel(filePath);
  console.log(`Found ${employeesData.length} employees in the file`);

  let balancesImported = 0;
  let recordsImported = 0;
  let employeesMatched = 0;
  let employeesNotFound: string[] = [];

  for (const empData of employeesData) {
    const user = await findUserByEmployeeCode(empData.employeeCode);

    if (!user) {
      employeesNotFound.push(`${empData.employeeCode} - ${empData.employeeName}`);
      continue;
    }

    employeesMatched++;
    const year = 2025;

    for (const [leaveType, balance] of Object.entries(empData.balances)) {
      if (leaveType === 'AL' || leaveType === 'ML' || leaveType === 'CL') {
        const [existing] = await db.select()
          .from(leaveBalances)
          .where(
            and(
              eq(leaveBalances.userId, user.id),
              eq(leaveBalances.leaveType, leaveType),
              eq(leaveBalances.year, year)
            )
          );

        if (existing) {
          await db.update(leaveBalances)
            .set({
              employeeCode: empData.employeeCode,
              employeeName: empData.employeeName,
              broughtForward: String(balance.broughtForward),
              earned: String(balance.earned),
              eligible: String(balance.eligible),
              taken: String(balance.taken),
              balance: String(balance.balance),
              updatedAt: new Date()
            })
            .where(eq(leaveBalances.id, existing.id));
        } else {
          await db.insert(leaveBalances).values({
            id: nanoid(),
            userId: user.id,
            employeeCode: empData.employeeCode,
            employeeName: empData.employeeName,
            leaveType,
            year,
            broughtForward: String(balance.broughtForward),
            earned: String(balance.earned),
            eligible: String(balance.eligible),
            taken: String(balance.taken),
            balance: String(balance.balance)
          });
        }
        balancesImported++;
      }
    }

    console.log(`Imported balances for ${empData.employeeCode} - ${empData.employeeName}`);
  }

  console.log('\n=== Import Summary ===');
  console.log(`Employees matched: ${employeesMatched}`);
  console.log(`Leave balances imported/updated: ${balancesImported}`);
  console.log(`Leave records imported: ${recordsImported}`);

  if (employeesNotFound.length > 0) {
    console.log(`\nEmployees not found in system (${employeesNotFound.length}):`);
    employeesNotFound.forEach(e => console.log(`  - ${e}`));
  }
}

const filePath = path.join(process.cwd(), 'attached_assets', 'Leave_History_Report_Jan25_-_Oct25_(All)_1768569192880.xls');
importLeaveHistory(filePath)
  .then(() => {
    console.log('\nImport completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Import failed:', err);
    process.exit(1);
  });
