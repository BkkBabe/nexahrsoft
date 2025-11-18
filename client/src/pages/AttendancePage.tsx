import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Calendar, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AttendanceRecord } from "@shared/schema";

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

export default function AttendancePage() {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Fetch today's attendance
  const { data: todayData, isLoading: todayLoading } = useQuery<{ record: AttendanceRecord | null }>({
    queryKey: ['/api/attendance/today'],
  });

  // Fetch attendance records based on period
  const { startDate, endDate } = getDateRange(selectedPeriod);
  const { data: recordsData, isLoading: recordsLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/attendance/records', { startDate, endDate }],
  });

  const todayRecord = todayData?.record;
  const records = recordsData?.records || [];

  // Calculate total hours for selected period
  const totalHours = records.reduce((sum, record) => {
    return sum + calculateHours(record.clockInTime, record.clockOutTime);
  }, 0);

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/attendance/clock-in", {}),
    onSuccess: () => {
      toast({
        title: "Clocked In",
        description: "Your attendance has been recorded",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/records'] });
    },
    onError: (error: any) => {
      toast({
        title: "Clock In Failed",
        description: error.message || "Failed to clock in",
        variant: "destructive",
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/attendance/clock-out", {}),
    onSuccess: () => {
      toast({
        title: "Clocked Out",
        description: "Your attendance has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/records'] });
    },
    onError: (error: any) => {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    },
  });

  const handleClockIn = () => {
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    clockOutMutation.mutate();
  };

  const dailyHours = todayRecord ? calculateHours(todayRecord.clockInTime, todayRecord.clockOutTime) : 0;
  const isClockedIn = todayRecord && !todayRecord.clockOutTime;
  const isClockedOut = todayRecord && todayRecord.clockOutTime;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-attendance-title">
          Attendance
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your daily attendance and view your work hours
        </p>
      </div>

      {/* Clock In/Out Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Clock In</p>
                  <p className="text-lg font-semibold" data-testid="text-clock-in-time">
                    {formatTime(todayRecord?.clockInTime || null)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Clock Out</p>
                  <p className="text-lg font-semibold" data-testid="text-clock-out-time">
                    {formatTime(todayRecord?.clockOutTime || null)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Hours Today</p>
                  <p className="text-lg font-semibold" data-testid="text-daily-hours">
                    {dailyHours.toFixed(1)} hrs
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleClockIn}
                  disabled={isClockedIn || isClockedOut || clockInMutation.isPending}
                  className="flex-1"
                  data-testid="button-clock-in"
                >
                  {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={!isClockedIn || clockOutMutation.isPending}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-clock-out"
                >
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </Button>
              </div>

              {isClockedOut && (
                <p className="text-sm text-muted-foreground text-center">
                  You've completed your attendance for today
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Hours Summary
          </CardTitle>
          <CardDescription>View your work hours by period</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily" data-testid="tab-daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <div className="text-center space-y-2 mb-6">
                <p className="text-4xl font-bold text-primary" data-testid="text-total-hours">
                  {totalHours.toFixed(1)} hrs
                </p>
                <p className="text-sm text-muted-foreground">
                  Total hours {selectedPeriod === 'daily' ? 'today' : selectedPeriod === 'weekly' ? 'this week' : 'this month'}
                </p>
              </div>

              {recordsLoading ? (
                <p className="text-sm text-muted-foreground text-center">Loading records...</p>
              ) : records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center">
                  No attendance records for this period
                </p>
              ) : (
                <div className="space-y-2">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      data-testid={`attendance-record-${record.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{formatDate(record.date)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(record.clockInTime)} - {formatTime(record.clockOutTime)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {calculateHours(record.clockInTime, record.clockOutTime).toFixed(1)} hrs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
