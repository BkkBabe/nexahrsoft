import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Upload, FileSpreadsheet, Check, X, AlertTriangle, Loader2, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, InsertPayrollRecord } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ParsedPayrollRow {
  employeeCode: string;
  employeeName: string;
  deptCode: string;
  deptName: string;
  secCode: string;
  secName: string;
  catCode: string;
  catName: string;
  nric: string;
  joinDate: string;
  totSalary: number;
  basicSalary: number;
  monthlyVariablesComponent: number;
  flat: number;
  ot10: number;
  ot15: number;
  ot20: number;
  ot30: number;
  shiftAllowance: number;
  totRestPhAmount: number;
  mobileAllowance: number;
  transportAllowance: number;
  annualLeaveEncashment: number;
  serviceCallAllowances: number;
  otherAllowance: number;
  houseRentalAllowances: number;
  loanRepaymentTotal: number;
  noPayDay: number;
  cc: number;
  cdac: number;
  ecf: number;
  mbmf: number;
  sinda: number;
  bonus: number;
  grossWages: number;
  cpfWages: number;
  sdf: number;
  fwl: number;
  employerCpf: number;
  employeeCpf: number;
  totalCpf: number;
  total: number;
  nett: number;
  payMode: string;
  chequeNo: string;
  matchedUser?: User;
  isMatched: boolean;
}

interface PayPeriod {
  display: string;
  year: number;
  month: number;
}

const MONTH_MAP: Record<string, number> = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
};

function parsePayPeriod(row2Text: string): PayPeriod | null {
  const match = row2Text.match(/([A-Z]{3})\s*['"]?(\d{4})/i);
  if (match) {
    const monthStr = match[1].toUpperCase();
    const year = parseInt(match[2]);
    const month = MONTH_MAP[monthStr];
    if (month && year) {
      return {
        display: `${monthStr} ${year}`,
        year,
        month,
      };
    }
  }
  return null;
}

function parseAmount(value: string): number {
  if (!value || value.trim() === '' || value === '-') return 0;
  const cleaned = value.replace(/[,$]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }
  
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

export default function AdminPayrollImportPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [parsedData, setParsedData] = useState<ParsedPayrollRow[]>([]);
  const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["/api/admin/users"],
  });

  const users = usersData?.users || [];

  const saveEmployeeCodeMutation = useMutation({
    mutationFn: async ({ userId, employeeCode }: { userId: string; employeeCode: string }) => {
      return apiRequest("POST", `/api/admin/users/${userId}/save-employee-code`, { employeeCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Employee Code Saved",
        description: "The employee code has been saved for future matching.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectEmployee = (user: User) => {
    if (selectedRowIndex === null) return;
    
    const rowData = parsedData[selectedRowIndex];
    const csvEmployeeCode = rowData.employeeCode;
    
    setParsedData(prev => prev.map((row, idx) => 
      idx === selectedRowIndex 
        ? { ...row, matchedUser: user, isMatched: true }
        : row
    ));
    
    if (csvEmployeeCode && !user.employeeCode) {
      saveEmployeeCodeMutation.mutate({ userId: user.id, employeeCode: csvEmployeeCode });
    }
    
    setSearchDialogOpen(false);
    setSearchQuery("");
    setSelectedRowIndex(null);
  };

  const openSearchDialog = (rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    setSearchQuery(parsedData[rowIndex]?.employeeName || "");
    setSearchDialogOpen(true);
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.employeeCode?.toLowerCase().includes(query) ||
      u.department?.toLowerCase().includes(query)
    );
  });

  const importMutation = useMutation({
    mutationFn: async (records: Partial<InsertPayrollRecord>[]) => {
      return apiRequest("POST", "/api/admin/payroll/import", { records });
    },
    onSuccess: () => {
      toast({
        title: "Import Successful",
        description: `${parsedData.length} payroll records imported successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payroll/records"] });
      setParsedData([]);
      setPayPeriod(null);
      setFileName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const matchEmployeeByCode = useCallback((code: string): User | undefined => {
    return users.find(u => 
      u.employeeCode?.toLowerCase() === code.toLowerCase() ||
      u.employeeCode === code
    );
  }, [users]);

  const handleFileUpload = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsvRows(text);
      
      if (rows.length < 7) {
        toast({
          title: "Invalid CSV",
          description: "CSV file does not have enough rows.",
          variant: "destructive",
        });
        return;
      }

      const row2 = rows[1]?.join(',') || '';
      const period = parsePayPeriod(row2);
      if (!period) {
        toast({
          title: "Warning",
          description: "Could not parse pay period from row 2. Please verify manually.",
          variant: "destructive",
        });
      }
      setPayPeriod(period);

      const dataRows = rows.slice(6, rows.length - 1);
      
      const parsed: ParsedPayrollRow[] = dataRows
        .filter(row => row[1] && row[1].trim() !== '' && row[1] !== 'EMP CODE')
        .map(row => {
          const employeeCode = row[1]?.trim() || '';
          const matchedUser = matchEmployeeByCode(employeeCode);
          
          const loanCols = [25, 26, 27, 28, 29, 30].map(i => parseAmount(row[i] || ''));
          const loanTotal = loanCols.reduce((a, b) => a + b, 0);
          
          return {
            employeeCode,
            employeeName: row[2]?.trim() || '',
            deptCode: row[3]?.trim() || '',
            deptName: row[4]?.trim() || '',
            secCode: row[5]?.trim() || '',
            secName: row[6]?.trim() || '',
            catCode: row[7]?.trim() || '',
            catName: row[8]?.trim() || '',
            nric: row[9]?.trim() || '',
            joinDate: row[10]?.trim() || '',
            totSalary: parseAmount(row[11] || ''),
            basicSalary: parseAmount(row[48] || ''),
            monthlyVariablesComponent: parseAmount(row[49] || ''),
            flat: parseAmount(row[12] || ''),
            ot10: parseAmount(row[13] || ''),
            ot15: parseAmount(row[14] || ''),
            ot20: parseAmount(row[15] || ''),
            ot30: parseAmount(row[16] || ''),
            shiftAllowance: parseAmount(row[17] || ''),
            totRestPhAmount: parseAmount(row[18] || ''),
            mobileAllowance: parseAmount(row[19] || ''),
            transportAllowance: parseAmount(row[20] || ''),
            annualLeaveEncashment: parseAmount(row[21] || ''),
            serviceCallAllowances: parseAmount(row[22] || ''),
            otherAllowance: parseAmount(row[23] || ''),
            houseRentalAllowances: parseAmount(row[24] || ''),
            loanRepaymentTotal: loanTotal,
            noPayDay: parseAmount(row[31] || ''),
            cc: parseAmount(row[32] || ''),
            cdac: parseAmount(row[33] || ''),
            ecf: parseAmount(row[34] || ''),
            mbmf: parseAmount(row[35] || ''),
            sinda: parseAmount(row[36] || ''),
            bonus: parseAmount(row[37] || ''),
            grossWages: parseAmount(row[38] || ''),
            cpfWages: parseAmount(row[39] || ''),
            sdf: parseAmount(row[40] || ''),
            fwl: parseAmount(row[41] || ''),
            employerCpf: parseAmount(row[42] || ''),
            employeeCpf: parseAmount(row[43] || ''),
            totalCpf: parseAmount(row[44] || ''),
            total: parseAmount(row[44] || ''),
            nett: parseAmount(row[45] || ''),
            payMode: row[46]?.trim() || '',
            chequeNo: row[47]?.trim() || '',
            matchedUser,
            isMatched: !!matchedUser,
          };
        });

      setParsedData(parsed);
      toast({
        title: "CSV Parsed",
        description: `Found ${parsed.length} payroll records for ${period?.display || 'unknown period'}.`,
      });
    };
    
    reader.readAsText(file);
  }, [matchEmployeeByCode, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileUpload(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  }, [handleFileUpload, toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleConfirmImport = () => {
    if (!payPeriod) {
      toast({
        title: "Missing Pay Period",
        description: "Could not determine pay period from CSV.",
        variant: "destructive",
      });
      return;
    }

    const records: Partial<InsertPayrollRecord>[] = parsedData.map(row => ({
      userId: row.matchedUser?.id || null,
      payPeriod: payPeriod.display,
      payPeriodYear: payPeriod.year,
      payPeriodMonth: payPeriod.month,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      deptCode: row.deptCode || null,
      deptName: row.deptName || null,
      secCode: row.secCode || null,
      secName: row.secName || null,
      catCode: row.catCode || null,
      catName: row.catName || null,
      nric: row.nric || null,
      joinDate: row.joinDate || null,
      totSalary: row.totSalary,
      basicSalary: row.basicSalary,
      monthlyVariablesComponent: row.monthlyVariablesComponent,
      flat: row.flat,
      ot10: row.ot10,
      ot15: row.ot15,
      ot20: row.ot20,
      ot30: row.ot30,
      shiftAllowance: row.shiftAllowance,
      totRestPhAmount: row.totRestPhAmount,
      mobileAllowance: row.mobileAllowance,
      transportAllowance: row.transportAllowance,
      annualLeaveEncashment: row.annualLeaveEncashment,
      serviceCallAllowances: row.serviceCallAllowances,
      otherAllowance: row.otherAllowance,
      houseRentalAllowances: row.houseRentalAllowances,
      loanRepaymentTotal: row.loanRepaymentTotal,
      loanRepaymentDetails: null,
      noPayDay: row.noPayDay,
      cc: row.cc,
      cdac: row.cdac,
      ecf: row.ecf,
      mbmf: row.mbmf,
      sinda: row.sinda,
      bonus: row.bonus,
      grossWages: row.grossWages,
      cpfWages: row.cpfWages,
      sdf: row.sdf,
      fwl: row.fwl,
      employerCpf: row.employerCpf,
      employeeCpf: row.employeeCpf,
      totalCpf: row.totalCpf,
      total: row.total,
      nett: row.nett,
      payMode: row.payMode || null,
      chequeNo: row.chequeNo || null,
      importedBy: 'admin',
    }));

    importMutation.mutate(records);
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const matchedCount = parsedData.filter(r => r.isMatched).length;
  const unmatchedCount = parsedData.length - matchedCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/payslip")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Import Payroll Data</h1>
          <p className="text-muted-foreground">Upload monthly payroll CSV to import salary records</p>
        </div>
      </div>

      {parsedData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload Payroll CSV
            </CardTitle>
            <CardDescription>
              Upload your monthly payroll report CSV file. The system will parse and validate the data before import.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              data-testid="dropzone-csv"
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop your CSV file here</p>
              <p className="text-muted-foreground mb-4">or click to browse</p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-upload"
                data-testid="input-csv-file"
              />
              <Button asChild>
                <label htmlFor="csv-upload" className="cursor-pointer">
                  Select CSV File
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Preview: {fileName}
                  </CardTitle>
                  <CardDescription>
                    Pay Period: <strong>{payPeriod?.display || 'Unknown'}</strong> | 
                    Total Records: <strong>{parsedData.length}</strong>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => { setParsedData([]); setPayPeriod(null); setFileName(""); }}
                    data-testid="button-clear"
                  >
                    Clear
                  </Button>
                  <Button 
                    onClick={handleConfirmImport}
                    disabled={importMutation.isPending}
                    data-testid="button-confirm-import"
                  >
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Import ({parsedData.length} records)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-matched-count">{matchedCount}</p>
                    <p className="text-muted-foreground text-sm">Matched Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                    <X className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-unmatched-count">{unmatchedCount}</p>
                    <p className="text-muted-foreground text-sm">Unmatched Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-total-nett">
                      {formatCurrency(parsedData.reduce((sum, r) => sum + r.nett, 0))}
                    </p>
                    <p className="text-muted-foreground text-sm">Total Nett Pay</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {unmatchedCount > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      {unmatchedCount} employees not found in system
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      These payroll records will be imported without linking to employee profiles. 
                      You can add these employees later and link their payroll records.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-payroll-preview">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Emp Code</th>
                      <th className="text-left p-2 font-medium">Name</th>
                      <th className="text-left p-2 font-medium">Department</th>
                      <th className="text-right p-2 font-medium">Basic</th>
                      <th className="text-right p-2 font-medium">Gross</th>
                      <th className="text-right p-2 font-medium">CPF (Emp)</th>
                      <th className="text-right p-2 font-medium">Nett</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={`border-b ${row.isMatched ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-red-50/50 dark:bg-red-950/20'}`}
                        data-testid={`row-payroll-${idx}`}
                      >
                        <td className="p-2">
                          {row.isMatched ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 text-red-600" />
                          )}
                        </td>
                        <td className="p-2 font-mono">{row.employeeCode}</td>
                        <td className="p-2">{row.employeeName}</td>
                        <td className="p-2">{row.deptName || '-'}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(row.basicSalary)}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(row.grossWages)}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(row.employeeCpf)}</td>
                        <td className="p-2 text-right font-mono font-medium">{formatCurrency(row.nett)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
