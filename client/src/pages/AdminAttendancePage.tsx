import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Clock, Users, ArrowLeft, Grid3X3, List, ChevronLeft, ChevronRight, Search, Plus, CalendarCheck } from "lucide-react";
import { Link } from "wouter";
import type { AttendanceRecord, User } from "@shared/schema";

// Helper function to calculate hours worked (to nearest 0.5 hour)
function calculateHours(clockInTime: Date | string, clockOutTime: Date | string | null): number {
  if (!clockOutTime) return 0;
  
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Round to nearest 0.5 hour
  return Math.round(diffHours * 2) / 2;
}

// Helper function to format time
function formatTime(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Helper function to format date
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Helper to get date range for period
function getDateRange(period: 'daily' | 'weekly' | 'monthly'): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string;

  if (period === 'daily') {
    startDate = endDate;
  } else if (period === 'weekly') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    startDate = weekAgo.toISOString().split('T')[0];
  } else {
    // monthly
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = monthStart.toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

// Get all days in a month
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Locale-safe date key formatter (YYYY-MM-DD) avoiding timezone shifts
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get date key from a date string or Date object (handles API dates)
function normalizeRecordDateKey(dateValue: Date | string): string {
  const d = new Date(dateValue);
  return getDateKey(d);
}

// Get color class based on hours worked and open sessions
function getHeatmapColor(hours: number, hasOpenSession?: boolean): string {
  if (hasOpenSession) return "bg-blue-500 dark:bg-blue-400"; // Blue for in-progress
  if (hours >= 8) return "bg-green-600 dark:bg-green-500";
  if (hours >= 6) return "bg-green-400 dark:bg-green-400";
  if (hours >= 4) return "bg-yellow-400 dark:bg-yellow-500";
  if (hours > 0) return "bg-orange-400 dark:bg-orange-500";
  return "bg-muted";
}

// Get text color based on background
function getHeatmapTextColor(hours: number): string {
  if (hours > 0) return "text-white";
  return "text-muted-foreground";
}

export default function AdminAttendancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [viewMode, setViewMode] = useState<'today' | 'list' | 'heatmap'>('today');
  const [heatmapMonth, setHeatmapMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  
  // Add attendance dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [clockInTime, setClockInTime] = useState("09:00");
  const [clockOutTime, setClockOutTime] = useState("");
  
  // End clock-in dialog state
  const [showEndClockInDialog, setShowEndClockInDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [endClockOutTime, setEndClockOutTime] = useState("18:00");
  
  const { toast } = useToast();

  // Fetch all users
  const { data: usersData } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch attendance records based on period (for list view)
  const { startDate, endDate } = getDateRange(selectedPeriod);
  const { data: recordsData, isLoading: recordsLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/admin/attendance/records', { startDate, endDate }],
  });

  // Fetch attendance records for heatmap (full month)
  const heatmapStartDate = new Date(heatmapMonth.year, heatmapMonth.month, 1).toISOString().split('T')[0];
  const heatmapEndDate = new Date(heatmapMonth.year, heatmapMonth.month + 1, 0).toISOString().split('T')[0];
  const { data: heatmapRecordsData, isLoading: heatmapLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/admin/attendance/records', { startDate: heatmapStartDate, endDate: heatmapEndDate }],
  });

  // Fetch today's attendance records
  const todayDate = new Date().toISOString().split('T')[0];
  const { data: todayRecordsData, isLoading: todayLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/admin/attendance/records', { startDate: todayDate, endDate: todayDate }],
  });

  const users = usersData || [];
  const records = recordsData?.records || [];
  const heatmapRecords = heatmapRecordsData?.records || [];
  const todayRecords = todayRecordsData?.records || [];

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(users.map(u => u.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [users]);

  // Filter users for heatmap
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => !u.id.includes('admin'))
      .filter(u => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            u.name?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.employeeCode?.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .filter(u => {
        if (departmentFilter !== "all") {
          return u.department === departmentFilter;
        }
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, searchQuery, departmentFilter]);

  // Days in selected month for heatmap
  const daysInMonth = useMemo(() => {
    return getDaysInMonth(heatmapMonth.year, heatmapMonth.month);
  }, [heatmapMonth]);

  // Aggregated data type for heatmap cells
  type AggregatedAttendance = {
    totalHours: number;
    recordCount: number;
    records: AttendanceRecord[];
    hasOpenSession: boolean; // true if any record is missing clock-out
  };

  // Create a map of userId -> date -> aggregated attendance data for heatmap
  const heatmapDataMap = useMemo(() => {
    const map: Record<string, Record<string, AggregatedAttendance>> = {};
    heatmapRecords.forEach(record => {
      if (!map[record.userId]) {
        map[record.userId] = {};
      }
      const dateKey = normalizeRecordDateKey(record.date);
      
      if (!map[record.userId][dateKey]) {
        map[record.userId][dateKey] = {
          totalHours: 0,
          recordCount: 0,
          records: [],
          hasOpenSession: false,
        };
      }
      
      const hours = calculateHours(record.clockInTime, record.clockOutTime);
      map[record.userId][dateKey].totalHours += hours;
      map[record.userId][dateKey].recordCount += 1;
      map[record.userId][dateKey].records.push(record);
      
      // Track if any record is missing clock-out
      if (!record.clockOutTime) {
        map[record.userId][dateKey].hasOpenSession = true;
      }
    });
    return map;
  }, [heatmapRecords]);

  // Group records by user (for list view)
  const userRecordsMap = records.reduce((acc, record) => {
    if (!acc[record.userId]) {
      acc[record.userId] = [];
    }
    acc[record.userId].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  // Calculate total hours per user
  const userHoursMap = Object.entries(userRecordsMap).reduce((acc, [userId, userRecords]) => {
    const totalHours = userRecords.reduce((sum, record) => {
      return sum + calculateHours(record.clockInTime, record.clockOutTime);
    }, 0);
    acc[userId] = totalHours;
    return acc;
  }, {} as Record<string, number>);

  // Filter employees for add attendance dialog (exclude admins)
  const addDialogFilteredEmployees = useMemo(() => {
    if (!addSearchQuery.trim()) return [];
    const query = addSearchQuery.toLowerCase();
    return users
      .filter(u => u.role !== "admin")
      .filter(u => 
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.employeeCode?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [users, addSearchQuery]);

  // Get today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Check if employee already has attendance today
  const employeeHasAttendanceToday = (userId: string) => {
    return heatmapRecords.some(r => r.userId === userId && normalizeRecordDateKey(r.date) === todayStr);
  };

  // Add attendance mutation
  const addAttendanceMutation = useMutation({
    mutationFn: async (data: { userId: string; clockInTime: string; clockOutTime?: string }) => {
      const response = await apiRequest("POST", "/api/admin/attendance/add", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Attendance Added",
        description: data.message || "Attendance record created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/records'] });
      setShowAddDialog(false);
      setSelectedEmployee(null);
      setAddSearchQuery("");
      setClockInTime("09:00");
      setClockOutTime("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add attendance",
        variant: "destructive",
      });
    },
  });

  const handleAddAttendance = () => {
    if (!selectedEmployee) return;
    
    addAttendanceMutation.mutate({
      userId: selectedEmployee.id,
      clockInTime,
      clockOutTime: clockOutTime || undefined,
    });
  };

  // End clock-in mutation (nexaadmin only)
  const endClockInMutation = useMutation({
    mutationFn: async (data: { recordId: string; clockOutTime: string }) => {
      const response = await apiRequest("POST", "/api/admin/attendance/end-clockin", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Clock-out Set",
        description: data.message || "Clock-out time has been recorded",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/records'] });
      setShowEndClockInDialog(false);
      setSelectedRecord(null);
      setEndClockOutTime("18:00");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end clock-in",
        variant: "destructive",
      });
    },
  });

  const handleEndClockIn = () => {
    if (!selectedRecord) return;
    
    endClockInMutation.mutate({
      recordId: selectedRecord.id,
      clockOutTime: endClockOutTime,
    });
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setHeatmapMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setHeatmapMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const monthName = new Date(heatmapMonth.year, heatmapMonth.month).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-admin-attendance-title">
            Attendance Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage employee attendance records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            data-testid="button-add-attendance"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Attendance
          </Button>
          <Button
            variant={viewMode === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('today')}
            data-testid="button-view-today"
          >
            <CalendarCheck className="h-4 w-4 mr-1" />
            Today
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant={viewMode === 'heatmap' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('heatmap')}
            data-testid="button-view-heatmap"
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Heatmap
          </Button>
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {viewMode === 'today' ? (
        <>
          {/* Today's Clock-ins View */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5" />
                    Today's Clock-ins
                  </CardTitle>
                  <CardDescription>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground" data-testid="text-today-clocked-in-count">{todayRecords.length}</span> clock-ins today
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-400"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-600 dark:bg-green-500"></div>
                  <span>Completed (8+ hrs)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-400"></div>
                  <span>Completed (6-8 hrs)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-yellow-400 dark:bg-yellow-500"></div>
                  <span>Completed (4-6 hrs)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-500"></div>
                  <span>Completed (1-4 hrs)</span>
                </div>
              </div>

              {/* Today's Grid */}
              {todayLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading today's records...</div>
              ) : todayRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No clock-ins yet today</p>
                  <p className="text-sm">Employees who clock in will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {todayRecords
                    .sort((a, b) => new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime())
                    .map((record) => {
                      const user = users.find(u => u.id === record.userId);
                      const hours = calculateHours(record.clockInTime, record.clockOutTime);
                      const isInProgress = !record.clockOutTime;
                      const bgColor = isInProgress 
                        ? "bg-blue-500 dark:bg-blue-400" 
                        : getHeatmapColor(hours, false);
                      
                      return (
                        <Tooltip key={record.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`${bgColor} rounded-lg p-3 cursor-pointer transition-opacity hover:opacity-80 text-white`}
                              data-testid={`card-today-${record.id}`}
                            >
                              <div className="font-medium text-sm truncate">
                                {user?.name || 'Unknown'}
                              </div>
                              <div className="text-xs opacity-90 mt-1">
                                {isInProgress ? (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    In: {formatTime(record.clockInTime)}
                                  </span>
                                ) : (
                                  <span>{hours.toFixed(1)} hrs</span>
                                )}
                              </div>
                              {user?.department && (
                                <div className="text-[10px] opacity-75 mt-1 truncate">
                                  {user.department}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-xs">
                            <div className="font-medium">{user?.name || 'Unknown'}</div>
                            {user?.employeeCode && (
                              <div className="text-muted-foreground">{user.employeeCode}</div>
                            )}
                            <div className="mt-1">
                              <div>Clock In: {formatTime(record.clockInTime)}</div>
                              <div>
                                Clock Out: {record.clockOutTime 
                                  ? formatTime(record.clockOutTime) 
                                  : <span className="text-blue-500">In Progress</span>}
                              </div>
                              {record.clockOutTime && (
                                <div className="font-medium mt-1">{hours.toFixed(1)} hours worked</div>
                              )}
                            </div>
                            {isInProgress && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 h-6 text-xs w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRecord(record);
                                  setShowEndClockInDialog(true);
                                }}
                                data-testid={`button-end-clockin-today-${record.id}`}
                              >
                                End Clock-in
                              </Button>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Total Clock-ins</p>
                  <p className="text-xl font-bold" data-testid="text-today-total-clockins">
                    {todayRecords.length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">In Progress</p>
                  <p className="text-xl font-bold text-blue-500" data-testid="text-today-in-progress">
                    {todayRecords.filter(r => !r.clockOutTime).length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Completed</p>
                  <p className="text-xl font-bold text-green-600" data-testid="text-today-completed">
                    {todayRecords.filter(r => r.clockOutTime).length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Avg Hours</p>
                  <p className="text-xl font-bold" data-testid="text-today-avg-hours">
                    {todayRecords.filter(r => r.clockOutTime).length > 0
                      ? (todayRecords
                          .filter(r => r.clockOutTime)
                          .reduce((sum, r) => sum + calculateHours(r.clockInTime, r.clockOutTime), 0) / 
                         todayRecords.filter(r => r.clockOutTime).length
                        ).toFixed(1)
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : viewMode === 'heatmap' ? (
        <>
          {/* Heatmap View */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Attendance Heatmap
                  </CardTitle>
                  <CardDescription>Visual overview of attendance for all employees</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToPreviousMonth} data-testid="button-prev-month">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[140px] text-center" data-testid="text-current-month">
                    {monthName}
                  </span>
                  <Button variant="outline" size="icon" onClick={goToNextMonth} data-testid="button-next-month">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-employee"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-muted-foreground">Hours:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-600 dark:bg-green-500"></div>
                  <span>8+</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-400"></div>
                  <span>6-8</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-yellow-400 dark:bg-yellow-500"></div>
                  <span>4-6</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-500"></div>
                  <span>1-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-400"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-muted border"></div>
                  <span>Absent</span>
                </div>
              </div>

              {/* Heatmap Grid */}
              {heatmapLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading heatmap data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Header row with dates */}
                    <div className="flex border-b sticky top-0 bg-background z-10">
                      <div className="w-48 flex-shrink-0 p-2 font-medium text-sm border-r">
                        Employee
                      </div>
                      <div className="flex flex-1">
                        {daysInMonth.map((day, idx) => {
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          return (
                            <div
                              key={idx}
                              className={`flex-1 min-w-[28px] p-1 text-center text-xs border-r last:border-r-0 ${isWeekend ? 'bg-muted/50' : ''}`}
                            >
                              <div className="font-medium">{day.getDate()}</div>
                              <div className="text-muted-foreground text-[10px]">
                                {day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Employee rows */}
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No employees found matching your filters
                      </div>
                    ) : (
                      <div className="max-h-[60vh] overflow-y-auto">
                        {filteredUsers.map((user) => (
                          <div key={user.id} className="flex border-b hover:bg-muted/30" data-testid={`heatmap-row-${user.id}`}>
                            <div className="w-48 flex-shrink-0 p-2 border-r">
                              <div className="text-sm font-medium truncate" title={user.name || ''}>
                                {user.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.department || 'No dept'}
                              </div>
                            </div>
                            <div className="flex flex-1">
                              {daysInMonth.map((day, idx) => {
                                const dateKey = getDateKey(day);
                                const aggData = heatmapDataMap[user.id]?.[dateKey];
                                const hours = aggData?.totalHours || 0;
                                const recordCount = aggData?.recordCount || 0;
                                const hasOpenSession = aggData?.hasOpenSession || false;
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isFuture = day > today;
                                const hasRecord = aggData && recordCount > 0;

                                return (
                                  <Tooltip key={idx}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`flex-1 min-w-[28px] min-h-[36px] flex items-center justify-center text-xs border-r last:border-r-0 cursor-pointer transition-opacity hover:opacity-80 ${
                                          isFuture 
                                            ? 'bg-muted/30' 
                                            : isWeekend && !hasRecord 
                                              ? 'bg-muted/50'
                                              : getHeatmapColor(hours, hasOpenSession)
                                        } ${(hours > 0 || hasOpenSession) ? 'text-white' : ''}`}
                                        data-testid={`cell-${user.id}-${dateKey}`}
                                      >
                                        {!isFuture && hasOpenSession && hours === 0 && (
                                          <Clock className="h-3 w-3" />
                                        )}
                                        {hours > 0 && !isFuture && (
                                          <span className="font-medium">{Number.isInteger(hours) ? hours : hours.toFixed(1)}</span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs max-w-xs">
                                      <div className="font-medium">{user.name}</div>
                                      <div className="text-muted-foreground">{formatDate(day)}</div>
                                      {aggData ? (
                                        <div className="mt-1 space-y-1">
                                          {recordCount > 1 && (
                                            <div className="text-yellow-600 dark:text-yellow-400 font-medium">
                                              {recordCount} entries
                                            </div>
                                          )}
                                          {aggData.records.map((record, rIdx) => (
                                            <div key={record.id} className="border-t pt-1 first:border-t-0 first:pt-0">
                                              {recordCount > 1 && <div className="text-muted-foreground">Entry {rIdx + 1}:</div>}
                                              <div>In: {formatTime(record.clockInTime)}</div>
                                              <div>Out: {record.clockOutTime ? formatTime(record.clockOutTime) : <span className="text-blue-500">In Progress</span>}</div>
                                              <div>{record.clockOutTime ? `${calculateHours(record.clockInTime, record.clockOutTime).toFixed(1)} hrs` : '-'}</div>
                                              {!record.clockOutTime && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="mt-1 h-6 text-xs"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedRecord(record);
                                                    setShowEndClockInDialog(true);
                                                  }}
                                                  data-testid={`button-end-clockin-${record.id}`}
                                                >
                                                  End Clock-in
                                                </Button>
                                              )}
                                            </div>
                                          ))}
                                          <div className="border-t pt-1 font-medium">
                                            Total: {hours.toFixed(1)} hours
                                          </div>
                                        </div>
                                      ) : isFuture ? (
                                        <div className="text-muted-foreground">Future date</div>
                                      ) : (
                                        <div className="text-muted-foreground">No record</div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Total Employees</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-total-employees">
                    {filteredUsers.length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Total Records</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-total-records">
                    {heatmapRecords.filter(r => filteredUsers.some(u => u.id === r.userId)).length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Active This Month</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-active">
                    {new Set(heatmapRecords.filter(r => filteredUsers.some(u => u.id === r.userId)).map(r => r.userId)).size}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Working Days</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-working-days">
                    {daysInMonth.filter(d => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      return d.getDay() !== 0 && d.getDay() !== 6 && d <= today;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* List View (Original) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Period Overview
              </CardTitle>
              <CardDescription>Select a period to view attendance data</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
                </TabsList>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Total Users</p>
                    <p className="text-2xl font-bold" data-testid="text-total-users">
                      {users.filter(u => !u.id.includes('admin')).length}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Total Records</p>
                    <p className="text-2xl font-bold" data-testid="text-total-records">
                      {records.length}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Active Users</p>
                    <p className="text-2xl font-bold" data-testid="text-active-users">
                      {Object.keys(userRecordsMap).length}
                    </p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Period</p>
                    <p className="text-sm font-semibold" data-testid="text-period-label">
                      {selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'This Week' : 'This Month'}
                    </p>
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* User Attendance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                User Attendance Details
              </CardTitle>
              <CardDescription>Hours worked by each employee</CardDescription>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading attendance data...</p>
              ) : users.filter(u => !u.id.includes('admin')).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
              ) : (
                <div className="space-y-4">
                  {users.filter(u => !u.id.includes('admin')).map((user) => {
                    const userRecords = userRecordsMap[user.id] || [];
                    const totalHours = userHoursMap[user.id] || 0;
                    const hasRecords = userRecords.length > 0;

                    return (
                      <div
                        key={user.id}
                        className="border rounded-md p-4 space-y-3"
                        data-testid={`user-attendance-${user.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold" data-testid={`text-user-name-${user.id}`}>
                              {user.name}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary" data-testid={`text-user-hours-${user.id}`}>
                              {totalHours.toFixed(1)} hrs
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {userRecords.length} {userRecords.length === 1 ? 'day' : 'days'}
                            </p>
                          </div>
                        </div>

                        {hasRecords && (
                          <div className="space-y-2 pt-2 border-t">
                            {userRecords.map((record) => (
                              <div
                                key={record.id}
                                className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded"
                                data-testid={`record-${record.id}`}
                              >
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{formatDate(record.date)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTime(record.clockInTime)} - {formatTime(record.clockOutTime)}
                                    </p>
                                  </div>
                                </div>
                                <p className="font-semibold">
                                  {calculateHours(record.clockInTime, record.clockOutTime).toFixed(1)} hrs
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {!hasRecords && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No attendance records for this period
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Attendance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setSelectedEmployee(null);
          setAddSearchQuery("");
          setClockInTime("09:00");
          setClockOutTime("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
            <DialogDescription>
              Add attendance for an employee for today ({new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Employee Search */}
            <div className="space-y-2">
              <Label>Search Employee</Label>
              <Input
                placeholder="Type name, email, or employee code..."
                value={addSearchQuery}
                onChange={(e) => {
                  setAddSearchQuery(e.target.value);
                  setSelectedEmployee(null);
                }}
                data-testid="input-search-add-attendance"
              />
            </div>

            {/* Search Results */}
            {addSearchQuery.trim() !== "" && !selectedEmployee && (
              <div className="border rounded-lg max-h-48 overflow-auto">
                {addDialogFilteredEmployees.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No matching employees found
                  </div>
                ) : (
                  <div className="divide-y">
                    {addDialogFilteredEmployees.map((emp) => {
                      const hasAttendance = employeeHasAttendanceToday(emp.id);
                      return (
                        <div
                          key={emp.id}
                          className={`p-3 cursor-pointer hover-elevate ${hasAttendance ? 'opacity-50' : ''}`}
                          onClick={() => {
                            if (!hasAttendance) {
                              setSelectedEmployee(emp);
                            }
                          }}
                          data-testid={`option-employee-${emp.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {emp.email} {emp.employeeCode && `· ${emp.employeeCode}`}
                              </div>
                            </div>
                            {hasAttendance && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                Already clocked in
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Employee */}
            {selectedEmployee && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground">Selected Employee:</div>
                <div className="font-medium">{selectedEmployee.name}</div>
                <div className="text-sm text-muted-foreground">{selectedEmployee.email}</div>
              </div>
            )}

            {/* Time Inputs */}
            {selectedEmployee && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clockIn">Clock In Time</Label>
                  <Input
                    id="clockIn"
                    type="time"
                    value={clockInTime}
                    onChange={(e) => setClockInTime(e.target.value)}
                    data-testid="input-clock-in-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clockOut">Clock Out Time (Optional)</Label>
                  <Input
                    id="clockOut"
                    type="time"
                    value={clockOutTime}
                    onChange={(e) => setClockOutTime(e.target.value)}
                    data-testid="input-clock-out-time"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Note: Attendance can only be added for today. This action will be recorded in the audit log.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAttendance}
              disabled={!selectedEmployee || !clockInTime || addAttendanceMutation.isPending}
              data-testid="button-confirm-add-attendance"
            >
              {addAttendanceMutation.isPending ? "Adding..." : "Add Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Clock-in Dialog (nexaadmin only) */}
      <Dialog open={showEndClockInDialog} onOpenChange={(open) => {
        setShowEndClockInDialog(open);
        if (!open) {
          setSelectedRecord(null);
          setEndClockOutTime("18:00");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>End Clock-in</DialogTitle>
            <DialogDescription>
              Set the clock-out time for this attendance record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRecord && (
              <>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Record Details:</div>
                  <div className="font-medium">
                    {users.find(u => u.id === selectedRecord.userId)?.name || 'Unknown Employee'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Date: {formatDate(selectedRecord.date)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Clock In: {formatTime(selectedRecord.clockInTime)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endClockOut">Clock Out Time</Label>
                  <Input
                    id="endClockOut"
                    type="time"
                    value={endClockOutTime}
                    onChange={(e) => setEndClockOutTime(e.target.value)}
                    data-testid="input-end-clock-out-time"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Note: Only master admin (nexaadmin) can end clock-ins. This action will be recorded in the audit log.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndClockInDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEndClockIn}
              disabled={!selectedRecord || !endClockOutTime || endClockInMutation.isPending}
              data-testid="button-confirm-end-clockin"
            >
              {endClockInMutation.isPending ? "Saving..." : "Set Clock-out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
