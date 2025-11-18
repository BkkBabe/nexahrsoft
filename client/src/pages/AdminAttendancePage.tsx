import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, Users } from "lucide-react";
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

export default function AdminAttendancePage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Fetch all users
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch attendance records based on period
  const { startDate, endDate } = getDateRange(selectedPeriod);
  const { data: recordsData, isLoading: recordsLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/admin/attendance/records', { startDate, endDate }],
  });

  const users = usersData?.users || [];
  const records = recordsData?.records || [];

  // Group records by user
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-admin-attendance-title">
          Attendance Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage employee attendance records
        </p>
      </div>

      {/* Overview Card */}
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
    </div>
  );
}
