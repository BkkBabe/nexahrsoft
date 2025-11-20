import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Calendar, TrendingUp, Camera, MapPin } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [showCamera, setShowCamera] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [override, setOverride] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Location display component
  const LocationDisplay = ({ lat, lon }: { lat: string; lon: string }) => {
    const { data, isLoading } = useQuery<{ coordinates: string; address: string }>({
      queryKey: ['/api/geocode/reverse', { lat, lon }],
      enabled: !!lat && !!lon,
      staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    });

    if (isLoading) {
      return (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {parseFloat(lat).toFixed(4)}, {parseFloat(lon).toFixed(4)}
        </p>
      );
    }

    return (
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {parseFloat(lat).toFixed(4)}, {parseFloat(lon).toFixed(4)}
        </p>
        {data?.address && (
          <p className="pl-4 text-xs">
            {data.address}
          </p>
        )}
      </div>
    );
  };

  // Fetch today's attendance records
  const { data: todayData, isLoading: todayLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/attendance/today'],
  });

  // Fetch attendance records based on period
  const { startDate, endDate } = getDateRange(selectedPeriod);
  const { data: recordsData, isLoading: recordsLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/attendance/records', { startDate, endDate }],
  });

  const todayRecords = todayData?.records || [];
  const records = recordsData?.records || [];

  // Calculate total hours for today
  const todayTotalHours = todayRecords.reduce((sum, record) => {
    return sum + calculateHours(record.clockInTime, record.clockOutTime);
  }, 0);

  // Calculate total hours for selected period
  const totalHours = records.reduce((sum, record) => {
    return sum + calculateHours(record.clockInTime, record.clockOutTime);
  }, 0);

  // Check if there's an active (uncompleted) clock-in
  const activeRecord = todayRecords.find(r => !r.clockOutTime);

  // Get location
  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  };

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera",
        variant: "destructive",
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoDataUrl = canvas.toDataURL('image/jpeg');
        setPhotoData(photoDataUrl);
        
        // Stop camera
        stopCamera();
        setShowCamera(false);
      }
    }
  };

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      // Try to get location, but don't fail if unavailable
      let loc: { latitude: number; longitude: number } | null = null;
      try {
        loc = await getLocation();
        setLocation(loc);
      } catch (error) {
        console.error("Location error:", error);
        toast({
          title: "Location Unavailable",
          description: "Clocking in without GPS location. Please enable location services for future clock-ins.",
          variant: "default",
        });
      }

      return apiRequest("POST", "/api/attendance/clock-in", {
        photoUrl: photoData,
        latitude: loc ? loc.latitude.toString() : null,
        longitude: loc ? loc.longitude.toString() : null,
        override: override,
      });
    },
    onSuccess: () => {
      toast({
        title: "Clocked In",
        description: "Your attendance has been recorded",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/today'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/records'], exact: false });
      setPhotoData(null);
      setLocation(null);
      setOverride(false);
    },
    onError: (error: any) => {
      // Check if requires confirmation
      if (error.requiresConfirmation || (error.message && error.message.includes("less than 5 minutes"))) {
        setConfirmationMessage(error.message);
        setShowConfirmation(true);
      } else {
        toast({
          title: "Clock In Failed",
          description: error.message || "Failed to clock in",
          variant: "destructive",
        });
        setPhotoData(null);
        setLocation(null);
      }
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
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/records'], exact: false });
    },
    onError: (error: any) => {
      toast({
        title: "Clock Out Failed",
        description: error.message || "Failed to clock out",
        variant: "destructive",
      });
    },
  });

  const handleClockIn = async () => {
    setShowCamera(true);
    await startCamera();
  };

  const handlePhotoCapture = () => {
    capturePhoto();
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    clockOutMutation.mutate();
  };

  const handleConfirmClockIn = () => {
    setShowConfirmation(false);
    setOverride(true);
    // Directly retry the mutation with existing photo/location
    clockInMutation.mutate();
  };

  const handleCancelCamera = () => {
    stopCamera();
    setShowCamera(false);
    setPhotoData(null);
    setOverride(false); // Reset override flag
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPhotoData(null);
    setLocation(null);
    setOverride(false); // Reset override flag
  };

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
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Hours Today</p>
                <p className="text-3xl font-bold text-primary" data-testid="text-daily-hours">
                  {todayTotalHours.toFixed(1)} hrs
                </p>
                <p className="text-xs text-muted-foreground">
                  {todayRecords.length} clock-in{todayRecords.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Today's Records */}
              {todayRecords.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  {todayRecords.map((record, index) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-md bg-muted/30 space-y-2"
                      data-testid={`today-record-${index}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Clock-in #{index + 1}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(record.clockInTime)} - {formatTime(record.clockOutTime)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {calculateHours(record.clockInTime, record.clockOutTime).toFixed(1)} hrs
                          </p>
                          {!record.clockOutTime && (
                            <p className="text-xs text-green-600">Active</p>
                          )}
                        </div>
                      </div>
                      {record.latitude && record.longitude && (
                        <LocationDisplay lat={record.latitude} lon={record.longitude} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleClockIn}
                  disabled={clockInMutation.isPending}
                  className="flex-1"
                  data-testid="button-clock-in"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {clockInMutation.isPending ? "Clocking In..." : "Clock In"}
                </Button>
                <Button
                  onClick={handleClockOut}
                  disabled={!activeRecord || clockOutMutation.isPending}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-clock-out"
                >
                  {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={(open) => {
        if (!open) handleCancelCamera();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take Attendance Photo</DialogTitle>
            <DialogDescription>
              Capture your photo for attendance verification
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-md"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCamera}>
              Cancel
            </Button>
            <Button onClick={handlePhotoCapture} data-testid="button-capture-photo">
              <Camera className="mr-2 h-4 w-4" />
              Capture & Clock In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={(open) => {
        if (!open) handleCancelConfirmation();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Clock In</DialogTitle>
            <DialogDescription>
              {confirmationMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelConfirmation}>
              Cancel
            </Button>
            <Button onClick={handleConfirmClockIn} data-testid="button-confirm-clock-in">
              Yes, Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                          {record.latitude && record.longitude && (
                            <LocationDisplay lat={record.latitude} lon={record.longitude} />
                          )}
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
