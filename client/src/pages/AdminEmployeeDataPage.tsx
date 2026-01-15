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
import { ArrowLeft, Search, Edit, History, Users, RefreshCw, X, Save, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, EmployeeDataAuditLog } from "@shared/schema";

interface EditableFields {
  name: string;
  email: string;
  department: string;
  designation: string;
  section: string;
  shortName: string;
  mobileNumber: string;
  gender: string;
  joinDate: string;
  resignDate: string;
  nricFin: string;
  fingerId: string;
}

export default function AdminEmployeeDataPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingAuditUser, setViewingAuditUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<EditableFields>({
    name: "",
    email: "",
    department: "",
    designation: "",
    section: "",
    shortName: "",
    mobileNumber: "",
    gender: "",
    joinDate: "",
    resignDate: "",
    nricFin: "",
    fingerId: "",
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

  const users = usersData || [];

  const departments = useMemo(() => {
    const deptSet = new Set<string>();
    users.forEach(u => {
      if (u.department) deptSet.add(u.department);
    });
    return Array.from(deptSet).sort();
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
        
        return matchesSearch && matchesDepartment;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchTerm, selectedDepartment]);

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      department: user.department || "",
      designation: user.designation || "",
      section: user.section || "",
      shortName: user.shortName || "",
      mobileNumber: user.mobileNumber || "",
      gender: user.gender || "",
      joinDate: user.joinDate || "",
      resignDate: user.resignDate || "",
      nricFin: user.nricFin || "",
      fingerId: user.fingerId || "",
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
      department: "Department",
      designation: "Designation",
      section: "Section",
      shortName: "Short Name",
      mobileNumber: "Mobile Number",
      gender: "Gender",
      joinDate: "Join Date",
      resignDate: "Resign Date",
      nricFin: "NRIC/FIN",
      fingerId: "Finger ID",
      employeeCode: "Employee Code",
    };
    return labels[field] || field;
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
          <Button
            variant="outline"
            onClick={() => refetchUsers()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
                        <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {user.employeeCode || "N/A"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
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
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editFormData.department}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                  data-testid="input-edit-department"
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
                <Label htmlFor="edit-section">Section</Label>
                <Input
                  id="edit-section"
                  value={editFormData.section}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, section: e.target.value }))}
                  data-testid="input-edit-section"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-shortName">Short Name</Label>
                <Input
                  id="edit-shortName"
                  value={editFormData.shortName}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, shortName: e.target.value }))}
                  data-testid="input-edit-shortName"
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
              <div className="space-y-2">
                <Label htmlFor="edit-fingerId">Finger ID</Label>
                <Input
                  id="edit-fingerId"
                  value={editFormData.fingerId}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, fingerId: e.target.value }))}
                  data-testid="input-edit-fingerId"
                />
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
      </div>
    </div>
  );
}
