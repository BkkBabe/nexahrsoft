import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Building2, Image as ImageIcon, Clock, Mail, QrCode, Users, FileSpreadsheet, X, Check, AlertCircle, ArrowLeft, Camera } from "lucide-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CompanySettings } from "@shared/schema";

interface ParsedEmployee {
  code: string;
  name: string;
  email: string;
  shortName?: string;
  nricFin?: string;
  gender?: string;
  department?: string;
  section?: string;
  designation?: string;
  fingerId?: string;
  joinDate?: string;
  resignDate?: string;
  mobileNumber?: string;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [clockInLogoFile, setClockInLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [clockInLogoPreview, setClockInLogoPreview] = useState<string | null>(null);
  const [attendanceBufferMinutes, setAttendanceBufferMinutes] = useState<number>(15);
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [appUrl, setAppUrl] = useState<string>("https://app.nexahrms.com");
  
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedEmployees, setParsedEmployees] = useState<ParsedEmployee[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
  });

  // Update state when settings change
  useEffect(() => {
    if (settings?.attendanceBufferMinutes !== undefined) {
      setAttendanceBufferMinutes(settings.attendanceBufferMinutes);
    }
    if (settings?.senderEmail) {
      setSenderEmail(settings.senderEmail);
    }
    if (settings?.senderName) {
      setSenderName(settings.senderName);
    }
    if (settings?.appUrl) {
      setAppUrl(settings.appUrl);
    }
  }, [settings]);

  const { data: qrCodeData, isLoading: qrLoading, error: qrError } = useQuery<{ qrCode: string; appUrl: string }>({
    queryKey: ["/api/admin/qr-code"],
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadUrlRes = await apiRequest("POST", "/api/company/upload-logo", {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      const { uploadURL } = await uploadUrlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload logo");
      }

      await apiRequest("PUT", "/api/company/settings", {
        logoUrl: uploadURL.split("?")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadFaviconMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadUrlRes = await apiRequest("POST", "/api/company/upload-favicon", {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      const { uploadURL } = await uploadUrlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload favicon");
      }

      await apiRequest("PUT", "/api/company/settings", {
        faviconUrl: uploadURL.split("?")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      setFaviconFile(null);
      setFaviconPreview(null);
      toast({
        title: "Success",
        description: "Favicon uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Logo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 1 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Favicon must be less than 1MB",
          variant: "destructive",
        });
        return;
      }

      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleFaviconUpload = () => {
    if (faviconFile) {
      uploadFaviconMutation.mutate(faviconFile);
    }
  };

  const uploadClockInLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadUrlRes = await apiRequest("POST", "/api/company/upload-clockin-logo", {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      const { uploadURL } = await uploadUrlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload clock-in logo");
      }

      await apiRequest("PUT", "/api/company/settings", {
        clockInLogoUrl: uploadURL.split("?")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      setClockInLogoFile(null);
      setClockInLogoPreview(null);
      toast({
        title: "Success",
        description: "Clock-in logo uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClockInLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Clock-in logo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setClockInLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setClockInLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClockInLogoUpload = () => {
    if (clockInLogoFile) {
      uploadClockInLogoMutation.mutate(clockInLogoFile);
    }
  };

  const updateAttendanceBufferMutation = useMutation({
    mutationFn: async (minutes: number) => {
      await apiRequest("PUT", "/api/admin/attendance/buffer", {
        attendanceBufferMinutes: minutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      toast({
        title: "Success",
        description: "Attendance buffer updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateAttendanceBuffer = () => {
    updateAttendanceBufferMutation.mutate(attendanceBufferMinutes);
  };

  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (data: { senderEmail?: string; senderName?: string; appUrl?: string }) => {
      await apiRequest("PUT", "/api/company/email-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qr-code"] });
      toast({
        title: "Success",
        description: "Email settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateEmailSettings = () => {
    updateEmailSettingsMutation.mutate({
      senderEmail: senderEmail || undefined,
      senderName: senderName || undefined,
      appUrl: appUrl || undefined,
    });
  };

  const parseCSV = (text: string): { employees: ParsedEmployee[]; errors: string[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { employees: [], errors: ['CSV file must have a header row and at least one data row'] };
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    const columnMap: Record<string, string> = {
      'employee_code': 'code',
      'employeecode': 'code',
      'code': 'code',
      'emp_code': 'code',
      'name': 'name',
      'full_name': 'name',
      'fullname': 'name',
      'employee_name': 'name',
      'email': 'email',
      'email_address': 'email',
      'short_name': 'shortName',
      'shortname': 'shortName',
      'nickname': 'shortName',
      'nric_fin': 'nricFin',
      'nricfin': 'nricFin',
      'nric': 'nricFin',
      'ic': 'nricFin',
      'gender': 'gender',
      'sex': 'gender',
      'department': 'department',
      'dept': 'department',
      'section': 'section',
      'nationality': 'section',
      'designation': 'designation',
      'position': 'designation',
      'job_title': 'designation',
      'jobtitle': 'designation',
      'title': 'designation',
      'finger_id': 'fingerId',
      'fingerid': 'fingerId',
      'biometric_id': 'fingerId',
      'join_date': 'joinDate',
      'joindate': 'joinDate',
      'start_date': 'joinDate',
      'startdate': 'joinDate',
      'hire_date': 'joinDate',
      'resign_date': 'resignDate',
      'resigndate': 'resignDate',
      'end_date': 'resignDate',
      'mobile_number': 'mobileNumber',
      'mobilenumber': 'mobileNumber',
      'phone': 'mobileNumber',
      'mobile': 'mobileNumber',
    };

    const headerIndexMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const mappedField = columnMap[header];
      if (mappedField) {
        headerIndexMap[mappedField] = index;
      }
    });

    const employees: ParsedEmployee[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));

      const getValue = (field: string): string => {
        const index = headerIndexMap[field];
        return index !== undefined ? (values[index] || '').trim() : '';
      };

      const code = getValue('code');
      const name = getValue('name');
      const email = getValue('email');

      if (!code && !name && !email) {
        continue;
      }

      if (!code) {
        errors.push(`Row ${i + 1}: Missing employee code`);
        continue;
      }
      if (!name) {
        errors.push(`Row ${i + 1}: Missing name`);
        continue;
      }
      if (!email) {
        errors.push(`Row ${i + 1}: Missing email`);
        continue;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Row ${i + 1}: Invalid email format (${email})`);
        continue;
      }

      employees.push({
        code,
        name,
        email,
        shortName: getValue('shortName') || undefined,
        nricFin: getValue('nricFin') || undefined,
        gender: getValue('gender') || undefined,
        department: getValue('department') || undefined,
        section: getValue('section') || undefined,
        designation: getValue('designation') || undefined,
        fingerId: getValue('fingerId') || undefined,
        joinDate: getValue('joinDate') || undefined,
        resignDate: getValue('resignDate') || undefined,
        mobileNumber: getValue('mobileNumber') || undefined,
      });
    }

    return { employees, errors };
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }

      setCsvFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const { employees, errors } = parseCSV(text);
        setParsedEmployees(employees);
        setCsvErrors(errors);
        setShowPreview(true);
      };
      reader.readAsText(file);
    }
  };

  const importEmployeesMutation = useMutation({
    mutationFn: async (employees: ParsedEmployee[]) => {
      const response = await apiRequest("POST", "/api/admin/users/import", { employees });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Import Successful",
        description: data.message || `Imported ${data.created} employees`,
      });
      setCsvFile(null);
      setParsedEmployees([]);
      setCsvErrors([]);
      setShowPreview(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImportEmployees = () => {
    if (parsedEmployees.length > 0) {
      importEmployeesMutation.mutate(parsedEmployees);
    }
  };

  const handleCancelImport = () => {
    setCsvFile(null);
    setParsedEmployees([]);
    setCsvErrors([]);
    setShowPreview(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/dashboard">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company branding and appearance</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Import Employees
            </CardTitle>
            <CardDescription>
              Upload a CSV file to bulk import employees. Required columns: employee_code, name, email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showPreview ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <span className="text-primary hover:underline">Click to upload CSV file</span>
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvChange}
                    className="hidden"
                    data-testid="input-csv-upload"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    CSV with columns: employee_code, name, email, department, designation, etc.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <span className="font-medium">{csvFile?.name}</span>
                    <Badge variant="secondary">{parsedEmployees.length} employees</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCancelImport} data-testid="button-cancel-import">
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>

                {csvErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-medium mb-1">{csvErrors.length} row(s) with errors:</p>
                      <ul className="list-disc list-inside text-sm">
                        {csvErrors.slice(0, 5).map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                        {csvErrors.length > 5 && (
                          <li>...and {csvErrors.length - 5} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {parsedEmployees.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="p-3 bg-muted/30 border-b">
                      <h4 className="font-medium">Preview (showing first 10 rows)</h4>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Designation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedEmployees.slice(0, 10).map((emp, index) => (
                            <TableRow key={index} data-testid={`row-preview-${index}`}>
                              <TableCell className="font-mono text-sm">{emp.code}</TableCell>
                              <TableCell>{emp.name}</TableCell>
                              <TableCell className="text-sm">{emp.email}</TableCell>
                              <TableCell className="text-sm">{emp.department || '-'}</TableCell>
                              <TableCell className="text-sm">{emp.designation || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    {parsedEmployees.length > 10 && (
                      <div className="p-2 text-center text-sm text-muted-foreground border-t">
                        ...and {parsedEmployees.length - 10} more employees
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleImportEmployees}
                    disabled={parsedEmployees.length === 0 || importEmployeesMutation.isPending}
                    data-testid="button-confirm-import"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {importEmployeesMutation.isPending 
                      ? "Importing..." 
                      : `Import ${parsedEmployees.length} Employees`}
                  </Button>
                  <Button variant="outline" onClick={handleCancelImport} data-testid="button-cancel-import-2">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              App Logo
            </CardTitle>
            <CardDescription>
              Upload your app logo for header/branding (max 5MB, recommended: 200x200px)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-2">
                <Label htmlFor="logo-upload">Current App Logo</Label>
                <div className="border rounded-md p-4 bg-muted/20">
                  {settings?.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="App Logo"
                      className="h-32 w-32 object-contain mx-auto"
                      data-testid="img-current-logo"
                    />
                  ) : (
                    <div className="h-32 w-32 flex items-center justify-center mx-auto text-muted-foreground">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </div>

              {logoPreview && (
                <div className="flex-1 space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-muted/20">
                    <img
                      src={logoPreview}
                      alt="App Logo Preview"
                      className="h-32 w-32 object-contain mx-auto"
                      data-testid="img-logo-preview"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-upload">Upload New App Logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                data-testid="input-logo-upload"
              />
            </div>

            <Button
              onClick={handleLogoUpload}
              disabled={!logoFile || uploadLogoMutation.isPending}
              data-testid="button-upload-logo"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadLogoMutation.isPending ? "Uploading..." : "Upload App Logo"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Company Logo (Clock-in)
            </CardTitle>
            <CardDescription>
              Upload your company logo to display on employee clock-in photos (max 5MB, recommended: 200x200px)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-2">
                <Label>Current Clock-in Logo</Label>
                <div className="border rounded-md p-4 bg-muted/20">
                  {settings?.clockInLogoUrl ? (
                    <img
                      src={settings.clockInLogoUrl}
                      alt="Clock-in Logo"
                      className="h-32 w-32 object-contain mx-auto"
                      data-testid="img-current-clockin-logo"
                    />
                  ) : (
                    <div className="h-32 w-32 flex items-center justify-center mx-auto text-muted-foreground">
                      <Camera className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </div>

              {clockInLogoPreview && (
                <div className="flex-1 space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-muted/20">
                    <img
                      src={clockInLogoPreview}
                      alt="Clock-in Logo Preview"
                      className="h-32 w-32 object-contain mx-auto"
                      data-testid="img-clockin-logo-preview"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clockin-logo-upload">Upload New Clock-in Logo</Label>
              <Input
                id="clockin-logo-upload"
                type="file"
                accept="image/*"
                onChange={handleClockInLogoChange}
                data-testid="input-clockin-logo-upload"
              />
            </div>

            <Button
              onClick={handleClockInLogoUpload}
              disabled={!clockInLogoFile || uploadClockInLogoMutation.isPending}
              data-testid="button-upload-clockin-logo"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadClockInLogoMutation.isPending ? "Uploading..." : "Upload Clock-in Logo"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Favicon
            </CardTitle>
            <CardDescription>
              Upload your favicon (max 1MB, recommended: 32x32px or 64x64px .ico or .png)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-2">
                <Label htmlFor="favicon-upload">Current Favicon</Label>
                <div className="border rounded-md p-4 bg-muted/20">
                  {settings?.faviconUrl ? (
                    <img
                      src={settings.faviconUrl}
                      alt="Favicon"
                      className="h-16 w-16 object-contain mx-auto"
                      data-testid="img-current-favicon"
                    />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center mx-auto text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>

              {faviconPreview && (
                <div className="flex-1 space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-muted/20">
                    <img
                      src={faviconPreview}
                      alt="Favicon Preview"
                      className="h-16 w-16 object-contain mx-auto"
                      data-testid="img-favicon-preview"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon-upload">Upload New Favicon</Label>
              <Input
                id="favicon-upload"
                type="file"
                accept="image/*"
                onChange={handleFaviconChange}
                data-testid="input-favicon-upload"
              />
            </div>

            <Button
              onClick={handleFaviconUpload}
              disabled={!faviconFile || uploadFaviconMutation.isPending}
              data-testid="button-upload-favicon"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadFaviconMutation.isPending ? "Uploading..." : "Upload Favicon"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Settings
            </CardTitle>
            <CardDescription>
              Configure attendance tracking settings for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attendance-buffer">
                Clock In/Out Buffer (minutes)
              </Label>
              <p className="text-sm text-muted-foreground">
                Maximum minutes allowance before/after scheduled time
              </p>
              <Input
                id="attendance-buffer"
                type="number"
                min="0"
                max="120"
                value={attendanceBufferMinutes}
                onChange={(e) => setAttendanceBufferMinutes(parseInt(e.target.value) || 0)}
                data-testid="input-attendance-buffer"
              />
              <p className="text-xs text-muted-foreground">
                Current buffer: {attendanceBufferMinutes} minutes (Range: 0-120)
              </p>
            </div>

            <Button
              onClick={handleUpdateAttendanceBuffer}
              disabled={updateAttendanceBufferMutation.isPending}
              data-testid="button-update-buffer"
            >
              {updateAttendanceBufferMutation.isPending ? "Updating..." : "Update Buffer"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
            <CardDescription>
              Configure sender information for welcome emails to employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender-email">Sender Email</Label>
                <Input
                  id="sender-email"
                  type="email"
                  placeholder="hr@company.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  data-testid="input-sender-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name">Sender Name</Label>
                <Input
                  id="sender-name"
                  type="text"
                  placeholder="HR Department"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  data-testid="input-sender-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-url">App URL (for QR Code)</Label>
              <Input
                id="app-url"
                type="url"
                placeholder="https://app.nexahrms.com"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                data-testid="input-app-url"
              />
              <p className="text-xs text-muted-foreground">
                This URL will be embedded in the QR code sent to employees
              </p>
            </div>
            <Button
              onClick={handleUpdateEmailSettings}
              disabled={updateEmailSettingsMutation.isPending}
              data-testid="button-update-email-settings"
            >
              {updateEmailSettingsMutation.isPending ? "Updating..." : "Update Email Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              App QR Code Preview
            </CardTitle>
            <CardDescription>
              This QR code will be included in welcome emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {qrLoading ? (
                <div className="w-48 h-48 flex items-center justify-center border rounded-lg bg-muted/20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : qrError ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center border rounded-lg bg-destructive/10 text-destructive">
                  <QrCode className="h-12 w-12 mb-2" />
                  <p className="text-sm">Failed to load QR code</p>
                </div>
              ) : qrCodeData?.qrCode ? (
                <>
                  <img
                    src={qrCodeData.qrCode}
                    alt="App QR Code"
                    className="w-48 h-48"
                    data-testid="img-qr-code"
                  />
                  <p className="text-sm text-muted-foreground">
                    Scans to: {qrCodeData.appUrl}
                  </p>
                </>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center border rounded-lg bg-muted/20">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
