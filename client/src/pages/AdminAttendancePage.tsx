import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Clock, Users, ArrowLeft, Grid3X3, List, ChevronLeft, ChevronRight, Search } from "lucide-react";
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

// Get color class based on hours worked
function getHeatmapColor(hours: number): string {
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
  const [viewMode, setViewMode] = useState<'list' | 'heatmap'>('heatmap');
  const [heatmapMonth, setHeatmapMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Fetch all users
  const { data: usersData } = useQuery<{ users: User[] }>({
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

  const users = usersData?.users || [];
  const records = recordsData?.records || [];
  const heatmapRecords = heatmapRecordsData?.records || [];

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

  // Create a map of userId -> date -> record for heatmap
  const heatmapDataMap = useMemo(() => {
    const map: Record<string, Record<string, AttendanceRecord>> = {};
    heatmapRecords.forEach(record => {
      if (!map[record.userId]) {
        map[record.userId] = {};
      }
      const dateKey = normalizeRecordDateKey(record.date);
      map[record.userId][dateKey] = record;
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

      {viewMode === 'heatmap' ? (
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
                                const record = heatmapDataMap[user.id]?.[dateKey];
                                const hours = record ? calculateHours(record.clockInTime, record.clockOutTime) : 0;
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isFuture = day > today;

                                return (
                                  <Tooltip key={idx}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`flex-1 min-w-[28px] min-h-[36px] flex items-center justify-center text-xs border-r last:border-r-0 cursor-pointer transition-opacity hover:opacity-80 ${
                                          isFuture 
                                            ? 'bg-muted/30' 
                                            : isWeekend && hours === 0 
                                              ? 'bg-muted/50'
                                              : getHeatmapColor(hours)
                                        } ${hours > 0 ? getHeatmapTextColor(hours) : ''}`}
                                        data-testid={`cell-${user.id}-${dateKey}`}
                                      >
                                        {hours > 0 && !isFuture && (
                                          <span className="font-medium">{Number.isInteger(hours) ? hours : hours.toFixed(1)}</span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      <div className="font-medium">{user.name}</div>
                                      <div className="text-muted-foreground">{formatDate(day)}</div>
                                      {record ? (
                                        <div className="mt-1 space-y-0.5">
                                          <div>In: {formatTime(record.clockInTime)}</div>
                                          <div>Out: {formatTime(record.clockOutTime)}</div>
                                          <div className="font-medium">{hours.toFixed(1)} hours</div>
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
    </div>
  );
}
