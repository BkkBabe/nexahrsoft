import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Edit, History, Users, RefreshCw, X, Save, Filter, Calculator, UserPlus, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, EmployeeDataAuditLog } from "@shared/schema";

interface EditableFields {
  name: string;
  email: string;
  designation: string;
  mobileNumber: string;
  gender: string;
  joinDate: string;
  resignDate: string;
  nricFin: string;
  birthday: string;
  workPermitNumber: string;
  workPermitExpiry: string;
  finNumber: string;
  finNumberExpiry: string;
  remarks1: string;
  remarks2: string;
  remarks3: string;
  remarks4: string;
  // Salary calculation fields
  basicMonthlySalary: string;
  hourlyRate: string;
  ot15Rate: string;
  ot20Rate: string;
  defaultMobileAllowance: string;
  defaultTransportAllowance: string;
  defaultMealAllowance: string;
  defaultShiftAllowance: string;
  defaultOtherAllowance: string;
  defaultHouseRentalAllowance: string;
}

export default function AdminEmployeeDataPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingAuditUser, setViewingAuditUser] = useState<User | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmployeeData, setNewEmployeeData] = useState({
    employeeCode: "",
    name: "",
    email: "",
    department: "",
    designation: "",
    mobileNumber: "",
    gender: "",
    joinDate: "",
  });
  const [editFormData, setEditFormData] = useState<EditableFields>({
    name: "",
    email: "",
    designation: "",
    mobileNumber: "",
    gender: "",
    joinDate: "",
    resignDate: "",
    nricFin: "",
    birthday: "",
    workPermitNumber: "",
    workPermitExpiry: "",
    finNumber: "",
    finNumberExpiry: "",
    remarks1: "",
    remarks2: "",
    remarks3: "",
    remarks4: "",
    basicMonthlySalary: "",
    hourlyRate: "",
    ot15Rate: "",
    ot20Rate: "",
    defaultMobileAllowance: "",
    defaultTransportAllowance: "",
    defaultMealAllowance: "",
    defaultShiftAllowance: "",
    defaultOtherAllowance: "",
    defaultHouseRentalAllowance: "",
  });

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: auditLogsData, isLoading: auditLoading } = useQuery<{ employee: { id: string; name: string; employeeCode: string }; auditLogs: EmployeeDataAuditLog[] }>({
    queryKey: ["/api/admin/employees", viewingAuditUser?.id, "data-audit-logs"],
    queryFn: async () => {
      if (!viewingAuditUser?.id) return { employee: { id: "", name: "", employeeCode: "" }, auditLogs: [] };
      const response = await fetch(`/api/admin/employees/${viewingAuditUser.id}/data-audit-logs`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    },
    enabled: !!viewingAuditUser?.id,
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: Partial<EditableFields> }) => {
      return await apiRequest("PUT", `/api/admin/users/${data.userId}`, data.updates);
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Employee data updated successfully",
      });
      setEditingUser(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee data",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newEmployeeData) => {
      const response = await apiRequest("POST", "/api/admin/users/create", data);
      return response.json() as Promise<{ initialPassword?: string; user?: { name?: string } }>;
    },
    onSuccess: async (response) => {
      toast({
        title: "Employee Created",
        description: `${response.user?.name || "Employee"} created successfully. Initial password: ${response.initialPassword}`,
      });
      setIsAddDialogOpen(false);
      setNewEmployeeData({
        employeeCode: "",
        name: "",
        email: "",
        department: "",
        designation: "",
        mobileNumber: "",
        gender: "",
        joinDate: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const isIncompleteRecord = (user: User): boolean => {
    return !user.employeeCode || !user.department || !user.basicMonthlySalary;
  };

  const users = usersData || [];

  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    users.forEach(u => {
      if (u.department) deptSet.add(u.department);
    });
    return Array.from(deptSet).sort();
  }, [users]);

  const incompleteCount = useMemo(() => {
    return users.filter(u => !u.isArchived && isIncompleteRecord(u)).length;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => !u.isArchived)
      .filter(u => {
        const matchesSearch = searchTerm === "" || 
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesDepartment = selectedDepartment === "all" || u.department === selectedDepartment;
        
        const matchesIncomplete = !showIncompleteOnly || isIncompleteRecord(u);
        
        return matchesSearch && matchesDepartment && matchesIncomplete;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchTerm, selectedDepartment, showIncompleteOnly]);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      designation: user.designation || "",
      mobileNumber: user.mobileNumber || "",
      gender: user.gender || "",
      joinDate: user.joinDate || "",
      resignDate: user.resignDate || "",
      nricFin: user.nricFin || "",
      birthday: user.birthday || "",
      workPermitNumber: user.workPermitNumber || "",
      workPermitExpiry: user.workPermitExpiry || "",
      finNumber: user.finNumber || "",
      finNumberExpiry: user.finNumberExpiry || "",
      remarks1: user.remarks1 || "",
      remarks2: user.remarks2 || "",
      remarks3: user.remarks3 || "",
      remarks4: user.remarks4 || "",
      basicMonthlySalary: user.basicMonthlySalary || "",
      hourlyRate: user.hourlyRate || "",
      ot15Rate: user.ot15Rate || "",
      ot20Rate: user.ot20Rate || "",
      defaultMobileAllowance: user.defaultMobileAllowance || "",
      defaultTransportAllowance: user.defaultTransportAllowance || "",
      defaultMealAllowance: user.defaultMealAllowance || "",
      defaultShiftAllowance: user.defaultShiftAllowance || "",
      defaultOtherAllowance: user.defaultOtherAllowance || "",
      defaultHouseRentalAllowance: user.defaultHouseRentalAllowance || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUserMutation.mutate({
      userId: editingUser.id,
      updates: editFormData,
    });
  };

  const handleViewAuditLog = (user: User) => {
    setViewingAuditUser(user);
  };

  const auditLogs = auditLogsData?.auditLogs || [];

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: "Name",
      email: "Email",
      designation: "Designation",
      mobileNumber: "Mobile Number",
      gender: "Gender",
      joinDate: "Join Date",
      resignDate: "Resign Date",
      nricFin: "NRIC/FIN",
      employeeCode: "Employee Code",
      birthday: "Birthday",
      workPermitNumber: "Work Permit Number",
      workPermitExpiry: "Work Permit Expiry",
      finNumber: "FIN Number",
      finNumberExpiry: "FIN Number Expiry",
      remarks1: "Remarks 1",
      remarks2: "Remarks 2",
      remarks3: "Remarks 3",
      remarks4: "Remarks 4",
      basicMonthlySalary: "Monthly Salary",
      hourlyRate: "Hourly Rate",
      ot15Rate: "OT 1.5x Rate",
      ot20Rate: "OT 2.0x Rate",
      defaultMobileAllowance: "Mobile Allowance",
      defaultTransportAllowance: "Transport Allowance",
      defaultMealAllowance: "Meal Allowance",
      defaultShiftAllowance: "Shift Allowance",
      defaultOtherAllowance: "Other Allowance",
      defaultHouseRentalAllowance: "House Rental Allowance",
    };
    return labels[field] || field;
  };

  const calculateRates = () => {
    const monthlySalary = parseFloat(editFormData.basicMonthlySalary) || 0;
    if (monthlySalary <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid monthly salary first",
        variant: "destructive",
      });
      return;
    }
    // Standard calculation: Monthly / 26 days / 8 hours
    const hourly = monthlySalary / 26 / 8;
    const ot15 = hourly * 1.5;
    const ot20 = hourly * 2.0;
    
    setEditFormData(prev => ({
      ...prev,
      hourlyRate: hourly.toFixed(2),
      ot15Rate: ot15.toFixed(2),
      ot20Rate: ot20.toFixed(2),
    }));
    
    toast({
      title: "Rates Calculated",
      description: `Hourly: $${hourly.toFixed(2)}, OT 1.5x: $${ot15.toFixed(2)}, OT 2.0x: $${ot20.toFixed(2)}`,
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">
                Employee Data Management
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                View and edit employee information with full audit trail
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetchUsers()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-employee"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employees ({filteredUsers.length})
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-search"
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40" data-testid="select-department">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={showIncompleteOnly ? "default" : "outline"}
                onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
                className="gap-2"
                data-testid="button-show-incomplete"
              >
                <AlertCircle className="h-4 w-4" />
                Incomplete
                {incompleteCount > 0 && (
                  <Badge variant="secondary" className="ml-1" data-testid="badge-incomplete-count">
                    {incompleteCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No employees found matching your criteria
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">S/N</TableHead>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, index) => (
                      <TableRow key={user.id} data-testid={`row-employee-${user.id}`}>
                        <TableCell className="font-mono text-muted-foreground">
                          <div className="flex items-center gap-2">
                            {index + 1}
                            {isIncompleteRecord(user) && (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.employeeCode ? "outline" : "destructive"} className="font-mono">
                            {user.employeeCode || "Missing"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.department || "-"}</TableCell>
                        <TableCell>{user.designation || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                        <TableCell>{user.joinDate || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(user)}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewAuditLog(user)}
                              data-testid={`button-audit-${user.id}`}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Employee: {editingUser?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-edit-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      data-testid="input-edit-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-designation">Designation</Label>
                    <Input
                      id="edit-designation"
                      value={editFormData.designation}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, designation: e.target.value }))}
                      data-testid="input-edit-designation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-mobileNumber">Mobile Number</Label>
                    <Input
                      id="edit-mobileNumber"
                      value={editFormData.mobileNumber}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                      data-testid="input-edit-mobileNumber"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-gender">Gender</Label>
                    <Select 
                      value={editFormData.gender} 
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, gender: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-birthday">Birthday</Label>
                    <Input
                      id="edit-birthday"
                      type="date"
                      value={editFormData.birthday}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, birthday: e.target.value }))}
                      data-testid="input-edit-birthday"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-joinDate">Join Date</Label>
                    <Input
                      id="edit-joinDate"
                      type="date"
                      value={editFormData.joinDate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, joinDate: e.target.value }))}
                      data-testid="input-edit-joinDate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-resignDate">Resign Date</Label>
                    <Input
                      id="edit-resignDate"
                      type="date"
                      value={editFormData.resignDate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, resignDate: e.target.value }))}
                      data-testid="input-edit-resignDate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-nricFin">NRIC/FIN</Label>
                    <Input
                      id="edit-nricFin"
                      value={editFormData.nricFin}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, nricFin: e.target.value }))}
                      data-testid="input-edit-nricFin"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Work Permit & FIN Details */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Work Permit & FIN Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-workPermitNumber">Work Permit Number</Label>
                    <Input
                      id="edit-workPermitNumber"
                      value={editFormData.workPermitNumber}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, workPermitNumber: e.target.value }))}
                      data-testid="input-edit-workPermitNumber"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-workPermitExpiry">Work Permit Expiry</Label>
                    <Input
                      id="edit-workPermitExpiry"
                      type="date"
                      value={editFormData.workPermitExpiry}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, workPermitExpiry: e.target.value }))}
                      data-testid="input-edit-workPermitExpiry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-finNumber">FIN Number</Label>
                    <Input
                      id="edit-finNumber"
                      value={editFormData.finNumber}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, finNumber: e.target.value }))}
                      data-testid="input-edit-finNumber"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-finNumberExpiry">FIN Number Expiry</Label>
                    <Input
                      id="edit-finNumberExpiry"
                      type="date"
                      value={editFormData.finNumberExpiry}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, finNumberExpiry: e.target.value }))}
                      data-testid="input-edit-finNumberExpiry"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Salary Calculation */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Salary Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-basicMonthlySalary">Monthly Salary ($)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="edit-basicMonthlySalary"
                        type="number"
                        step="0.01"
                        value={editFormData.basicMonthlySalary}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, basicMonthlySalary: e.target.value }))}
                        data-testid="input-edit-basicMonthlySalary"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={calculateRates}
                        data-testid="button-calculate-rates"
                      >
                        <Calculator className="h-4 w-4 mr-1" />
                        Calculate
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="edit-hourlyRate"
                      type="number"
                      step="0.01"
                      value={editFormData.hourlyRate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      data-testid="input-edit-hourlyRate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ot15Rate">OT 1.5x Rate ($)</Label>
                    <Input
                      id="edit-ot15Rate"
                      type="number"
                      step="0.01"
                      value={editFormData.ot15Rate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, ot15Rate: e.target.value }))}
                      data-testid="input-edit-ot15Rate"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ot20Rate">OT 2.0x Rate ($)</Label>
                    <Input
                      id="edit-ot20Rate"
                      type="number"
                      step="0.01"
                      value={editFormData.ot20Rate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, ot20Rate: e.target.value }))}
                      data-testid="input-edit-ot20Rate"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Allowances */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Allowances</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-defaultMobileAllowance">Mobile Allowance ($)</Label>
                    <Input
                      id="edit-defaultMobileAllowance"
                      type="number"
                      step="0.01"
                      value={editFormData.defaultMobileAllowance}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, defaultMobileAllowance: e.target.value }))}
                      data-testid="input-edit-defaultMobileAllowance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-defaultTransportAllowance">Transport Allowance ($)</Label>
                    <Input
                      id="edit-defaultTransportAllowance"
                      type="number"
                      step="0.01"
                      value={editFormData.defaultTransportAllowance}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, defaultTransportAllowance: e.target.value }))}
                      data-testid="input-edit-defaultTransportAllowance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-defaultMealAllowance">Meal Allowance ($)</Label>
                    <Input
                      id="edit-defaultMealAllowance"
                      type="number"
                      step="0.01"
                      value={editFormData.defaultMealAllowance}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, defaultMealAllowance: e.target.value }))}
                      data-testid="input-edit-defaultMealAllowance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-defaultShiftAllowance">Shift Allowance ($)</Label>
                    <Input
                      id="edit-defaultShiftAllowance"
                      type="number"
                      step="0.01"
                      value={editFormData.defaultShiftAllowance}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, defaultShiftAllowance: e.target.value }))}
                      data-testid="input-edit-defaultShiftAllowance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-defaultOtherAllowance">Other Allowance ($)</Label>
                    <Input
                      id="edit-defaultOtherAllowance"
                      type="number"
                      step="0.01"
                      value={editFormData.defaultOtherAllowance}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, defaultOtherAllowance: e.target.value }))}
                      data-testid="input-edit-defaultOtherAllowance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-defaultHouseRentalAllowance">House Rental ($)</Label>
                    <Input
                      id="edit-defaultHouseRentalAllowance"
                      type="number"
                      step="0.01"
                      value={editFormData.defaultHouseRentalAllowance}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, defaultHouseRentalAllowance: e.target.value }))}
                      data-testid="input-edit-defaultHouseRentalAllowance"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Remarks */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Remarks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-remarks1">Remarks 1</Label>
                    <Textarea
                      id="edit-remarks1"
                      value={editFormData.remarks1}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, remarks1: e.target.value }))}
                      rows={2}
                      data-testid="input-edit-remarks1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-remarks2">Remarks 2</Label>
                    <Textarea
                      id="edit-remarks2"
                      value={editFormData.remarks2}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, remarks2: e.target.value }))}
                      rows={2}
                      data-testid="input-edit-remarks2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-remarks3">Remarks 3</Label>
                    <Textarea
                      id="edit-remarks3"
                      value={editFormData.remarks3}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, remarks3: e.target.value }))}
                      rows={2}
                      data-testid="input-edit-remarks3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-remarks4">Remarks 4</Label>
                    <Textarea
                      id="edit-remarks4"
                      value={editFormData.remarks4}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, remarks4: e.target.value }))}
                      rows={2}
                      data-testid="input-edit-remarks4"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateUserMutation.isPending}
                data-testid="button-save-edit"
              >
                {updateUserMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingAuditUser} onOpenChange={(open) => !open && setViewingAuditUser(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Change History: {viewingAuditUser?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No changes have been recorded for this employee
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Changed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.changedAt), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getFieldLabel(log.fieldName || "")}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.oldValue || <span className="italic">empty</span>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.newValue || <span className="italic text-muted-foreground">empty</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.changedBy}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewingAuditUser(null)}
                data-testid="button-close-audit"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Employee
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-employeeCode">Employee Code *</Label>
                  <Input
                    id="new-employeeCode"
                    value={newEmployeeData.employeeCode}
                    onChange={(e) => setNewEmployeeData(prev => ({ ...prev, employeeCode: e.target.value }))}
                    placeholder="e.g., EMP001"
                    data-testid="input-new-employeeCode"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-name">Name *</Label>
                  <Input
                    id="new-name"
                    value={newEmployeeData.name}
                    onChange={(e) => setNewEmployeeData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                    data-testid="input-new-name"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="new-email">Email *</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmployeeData.email}
                    onChange={(e) => setNewEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@company.com"
                    data-testid="input-new-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-department">Department</Label>
                  <Input
                    id="new-department"
                    value={newEmployeeData.department}
                    onChange={(e) => setNewEmployeeData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="e.g., Operations"
                    data-testid="input-new-department"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-designation">Designation</Label>
                  <Input
                    id="new-designation"
                    value={newEmployeeData.designation}
                    onChange={(e) => setNewEmployeeData(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g., Engineer"
                    data-testid="input-new-designation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-mobileNumber">Mobile Number</Label>
                  <Input
                    id="new-mobileNumber"
                    value={newEmployeeData.mobileNumber}
                    onChange={(e) => setNewEmployeeData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                    placeholder="e.g., 91234567"
                    data-testid="input-new-mobileNumber"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-gender">Gender</Label>
                  <Select 
                    value={newEmployeeData.gender} 
                    onValueChange={(value) => setNewEmployeeData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger data-testid="select-new-gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="new-joinDate">Join Date</Label>
                  <Input
                    id="new-joinDate"
                    type="date"
                    value={newEmployeeData.joinDate}
                    onChange={(e) => setNewEmployeeData(prev => ({ ...prev, joinDate: e.target.value }))}
                    data-testid="input-new-joinDate"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                * Required fields. An initial password will be generated automatically.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                data-testid="button-cancel-add"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={() => createUserMutation.mutate(newEmployeeData)}
                disabled={createUserMutation.isPending || !newEmployeeData.employeeCode || !newEmployeeData.name || !newEmployeeData.email}
                data-testid="button-create-employee"
              >
                {createUserMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Create Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
