import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, Calendar, TrendingUp, Camera, MapPin, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AttendanceRecord, CompanySettings } from "@shared/schema";

interface SessionData {
  authenticated: boolean;
  isAdmin?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    isApproved?: boolean;
  };
}

// Live elapsed time display component for active sessions
function LiveElapsedTime({ clockInTime }: { clockInTime: Date | string }) {
  const [elapsed, setElapsed] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateElapsed = () => {
      const clockIn = new Date(clockInTime);
      const now = new Date();
      setCurrentTime(now);
      const diffMs = now.getTime() - clockIn.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) {
        setElapsed(`${hours}h ${minutes}m`);
      } else {
        setElapsed(`${minutes}m`);
      }
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [clockInTime]);

  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-green-600">
        {currentTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Singapore'
        })}
      </p>
      <p className="text-sm text-muted-foreground">
        Active for {elapsed}
      </p>
    </div>
  );
}

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

// Helper function to format time in Singapore timezone
function formatTime(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Singapore' // Always display in Singapore timezone
  });
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
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string | null>(null);
  const [isLocationReady, setIsLocationReady] = useState(false);
  const [override, setOverride] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clockInLogoImage, setClockInLogoImage] = useState<HTMLImageElement | null>(null);

  // Fetch user session
  const { data: sessionData, isLoading: sessionLoading } = useQuery<SessionData>({
    queryKey: ['/api/auth/session'],
  });

  // Fetch company settings
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/company/settings'],
  });

  // Preload clock-in logo image
  useEffect(() => {
    if (companySettings?.clockInLogoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setClockInLogoImage(img);
      };
      img.onerror = () => {
        console.error("Failed to load clock-in logo");
        setClockInLogoImage(null);
      };
      img.src = companySettings.clockInLogoUrl;
    } else {
      setClockInLogoImage(null);
    }
  }, [companySettings?.clockInLogoUrl]);

  const userName = sessionData?.user?.name || "User";
  const isSessionReady = !sessionLoading && sessionData?.authenticated && sessionData?.user?.name;

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

  // Draw overlay on canvas
  const drawPhotoOverlay = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    isClockIn: boolean,
    time: string,
    dayName: string,
    dateStr: string,
    locationText: string,
    username: string,
    logoImage: HTMLImageElement | null
  ) => {
    const width = canvas.width;
    const height = canvas.height;
    
    // Scale factor based on canvas size for responsive text
    const scale = Math.min(width, height) / 400;
    
    // Draw semi-transparent dark overlay at bottom
    const overlayHeight = height * 0.35;
    const gradient = ctx.createLinearGradient(0, height - overlayHeight, 0, height);
    gradient.addColorStop(0, 'rgba(0, 30, 50, 0)');
    gradient.addColorStop(0.3, 'rgba(0, 30, 50, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 30, 50, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - overlayHeight, width, overlayHeight);
    
    // Draw Clock-in/Clock-out badge (blue for clock-in, green for clock-out)
    const badgeColor = isClockIn ? '#2563eb' : '#16a34a';
    const badgeText = isClockIn ? 'Clock-in' : 'Clock-out';
    const badgeX = 20 * scale;
    const badgeY = height - overlayHeight + 30 * scale;
    const badgeHeight = 36 * scale;
    const badgeWidth = 130 * scale;
    
    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6 * scale);
    ctx.fill();
    
    // Checkmark and text in badge
    ctx.fillStyle = 'white';
    ctx.font = `bold ${16 * scale}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2713 ' + badgeText, badgeX + 12 * scale, badgeY + badgeHeight / 2);
    
    // Draw time (large)
    const timeY = badgeY + badgeHeight + 35 * scale;
    ctx.fillStyle = 'white';
    ctx.font = `bold ${32 * scale}px Inter, sans-serif`;
    ctx.fillText(time, badgeX, timeY);
    
    // Draw separator and day/date
    const timeWidth = ctx.measureText(time).width;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(badgeX + timeWidth + 15 * scale, timeY - 20 * scale, 2 * scale, 40 * scale);
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${14 * scale}px Inter, sans-serif`;
    ctx.fillText(dayName, badgeX + timeWidth + 30 * scale, timeY - 8 * scale);
    ctx.font = `${14 * scale}px Inter, sans-serif`;
    ctx.fillText(dateStr, badgeX + timeWidth + 30 * scale, timeY + 12 * scale);
    
    // Draw location info box
    const infoBoxY = timeY + 30 * scale;
    const infoBoxHeight = 70 * scale;
    const infoBoxWidth = width * 0.55;
    
    ctx.fillStyle = 'rgba(0, 100, 150, 0.6)';
    ctx.beginPath();
    ctx.roundRect(badgeX, infoBoxY, infoBoxWidth, infoBoxHeight, 6 * scale);
    ctx.fill();
    
    // Location icon and text
    ctx.fillStyle = 'white';
    ctx.font = `${12 * scale}px Inter, sans-serif`;
    const locIcon = '\u2316';
    ctx.fillText(locIcon + '  ' + (locationText || 'Location unavailable'), badgeX + 10 * scale, infoBoxY + 18 * scale);
    
    // Username
    const userIcon = '\u2302';
    ctx.fillText(userIcon + '  ' + username, badgeX + 10 * scale, infoBoxY + 38 * scale);
    
    // Verification text
    const verifyIcon = '\u2713';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `${10 * scale}px Inter, sans-serif`;
    ctx.fillText(verifyIcon + '  Time & location verified by NexaHRMS', badgeX + 10 * scale, infoBoxY + 56 * scale);
    
    // Company logo (right side) - draw actual image if available
    const maxLogoWidth = 120 * scale;
    const maxLogoHeight = 80 * scale;
    const logoPadding = 20 * scale;
    
    if (logoImage) {
      // Calculate aspect ratio to fit logo within bounds
      const imgAspect = logoImage.width / logoImage.height;
      let logoWidth = maxLogoWidth;
      let logoHeight = logoWidth / imgAspect;
      
      if (logoHeight > maxLogoHeight) {
        logoHeight = maxLogoHeight;
        logoWidth = logoHeight * imgAspect;
      }
      
      const logoX = width - logoWidth - logoPadding;
      const logoY = timeY - logoHeight / 2;
      
      // Draw logo with slight shadow for visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8 * scale;
      ctx.shadowOffsetX = 2 * scale;
      ctx.shadowOffsetY = 2 * scale;
      ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      // Fallback: draw placeholder button if no logo
      const logoWidth = 120 * scale;
      const logoHeight = 40 * scale;
      const logoX = width - logoWidth - logoPadding;
      const logoY = timeY - 15 * scale;
      
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(logoX, logoY, logoWidth, logoHeight, 6 * scale);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.font = `bold ${12 * scale}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('NexaHRMS', logoX + logoWidth / 2, logoY + logoHeight / 2 + 4 * scale);
      ctx.textAlign = 'left';
    }
  };

  // Compress and resize image to reduce file size
  const compressImage = (canvas: HTMLCanvasElement, maxWidth: number = 800, quality: number = 0.7): string => {
    const width = canvas.width;
    const height = canvas.height;
    
    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = width;
    let newHeight = height;
    
    if (width > maxWidth) {
      newWidth = maxWidth;
      newHeight = Math.round((height / width) * maxWidth);
    }
    
    // Create a smaller canvas for compression
    const compressCanvas = document.createElement('canvas');
    compressCanvas.width = newWidth;
    compressCanvas.height = newHeight;
    const compressCtx = compressCanvas.getContext('2d');
    
    if (compressCtx) {
      // Use high-quality image smoothing for resize
      compressCtx.imageSmoothingEnabled = true;
      compressCtx.imageSmoothingQuality = 'high';
      compressCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
      return compressCanvas.toDataURL('image/jpeg', quality);
    }
    
    // Fallback to original if compression fails
    return canvas.toDataURL('image/jpeg', quality);
  };

  // Capture photo with overlay
  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw video frame
        ctx.drawImage(video, 0, 0);
        
        // Get current time and date
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
        
        // Draw overlay
        drawPhotoOverlay(
          ctx,
          canvas,
          true, // isClockIn
          time,
          dayName,
          dateStr,
          locationAddress || 'Fetching location...',
          userName,
          clockInLogoImage
        );
        
        // Compress the image to reduce file size (max 800px width, 70% quality)
        const photoDataUrl = compressImage(canvas, 800, 0.7);
        setPhotoData(photoDataUrl);
        
        // Stop camera and show preview
        stopCamera();
        setShowCamera(false);
        setShowPreview(true);
      }
    }
  };

  // Clock in mutation - uses already-fetched location from handleClockIn
  const clockInMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/attendance/clock-in", {
        photoUrl: photoData,
        latitude: location ? location.latitude.toString() : null,
        longitude: location ? location.longitude.toString() : null,
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
      setLocationAddress(null);
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
        setLocationAddress(null);
      }
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      let latitude: string | undefined;
      let longitude: string | undefined;
      
      try {
        const loc = await getLocation();
        latitude = loc.latitude.toString();
        longitude = loc.longitude.toString();
      } catch (error) {
        console.error("Could not get location for clock-out:", error);
      }
      
      return apiRequest("POST", "/api/attendance/clock-out", { latitude, longitude });
    },
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
    // Reset location ready state
    setIsLocationReady(false);
    setShowCamera(true);
    await startCamera();
    
    // Fetch location in background (camera is open while fetching)
    try {
      const loc = await getLocation();
      setLocation(loc);
      
      // Fetch address via reverse geocoding
      try {
        const response = await fetch(`/api/geocode/reverse?lat=${loc.latitude}&lon=${loc.longitude}`);
        const data = await response.json();
        setLocationAddress(data.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
      } catch {
        setLocationAddress(`${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error("Location error:", error);
      setLocationAddress("Location unavailable");
    }
    
    // Mark location as ready
    setIsLocationReady(true);
  };

  const handlePhotoCapture = () => {
    capturePhoto();
  };

  const handleConfirmPhoto = () => {
    setShowPreview(false);
    clockInMutation.mutate();
  };

  const handleRetakePhoto = async () => {
    setShowPreview(false);
    setPhotoData(null);
    setShowCamera(true);
    await startCamera();
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
    setLocation(null);
    setLocationAddress(null);
    setIsLocationReady(false);
    setOverride(false);
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPhotoData(null);
    setLocation(null);
    setLocationAddress(null);
    setIsLocationReady(false);
    setOverride(false);
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
              <div className="space-y-1" data-testid="text-daily-hours">
                {activeRecord ? (
                  <>
                    <p className="text-xs text-muted-foreground text-center">Current Time</p>
                    <LiveElapsedTime clockInTime={activeRecord.clockInTime} />
                    <p className="text-xs text-green-600 font-medium text-center mt-1">
                      Clocked in at {formatTime(activeRecord.clockInTime)}
                    </p>
                    {activeRecord.latitude && activeRecord.longitude && (
                      <div className="mt-2 pt-2 border-t">
                        <LocationDisplay lat={activeRecord.latitude} lon={activeRecord.longitude} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">Total Hours Today</p>
                    <p className="text-3xl font-bold text-primary">
                      {todayTotalHours.toFixed(1)} hrs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {todayRecords.length} clock-in{todayRecords.length !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
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
                          {!record.clockOutTime ? (
                            <>
                              <p className="text-sm font-semibold text-green-600">
                                {formatTime(record.clockInTime)}
                              </p>
                              <p className="text-xs text-green-600">Active</p>
                            </>
                          ) : (
                            <p className="text-sm font-semibold">
                              {calculateHours(record.clockInTime, record.clockOutTime).toFixed(1)} hrs
                            </p>
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

              {/* Status Message */}
              <div className="py-3 text-center">
                <p className="text-sm font-medium text-muted-foreground" data-testid="text-status-message">
                  {activeRecord 
                    ? "Ending your day?" 
                    : "Hi, are you ready to kickstart your day with good energy?"}
                </p>
              </div>

              {/* Clock In/Out Button - Only one visible at a time */}
              <div className="flex justify-center">
                {activeRecord ? (
                  <Button
                    onClick={handleClockOut}
                    disabled={clockOutMutation.isPending}
                    variant="destructive"
                    className="w-full max-w-xs"
                    data-testid="button-clock-out"
                  >
                    {clockOutMutation.isPending ? "Clocking Out..." : "Clock Out"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleClockIn}
                    disabled={clockInMutation.isPending || !isSessionReady}
                    className="w-full max-w-xs"
                    data-testid="button-clock-in"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {!isSessionReady 
                      ? "Loading..." 
                      : clockInMutation.isPending 
                        ? "Clocking In..." 
                        : "Clock In"}
                  </Button>
                )}
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
            {/* Location status indicator */}
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              {isLocationReady ? (
                <span className="text-green-600" data-testid="text-location-ready">
                  {locationAddress || "Location ready"}
                </span>
              ) : (
                <span className="text-muted-foreground animate-pulse" data-testid="text-location-loading">
                  Fetching your location...
                </span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCamera}>
              Cancel
            </Button>
            <Button 
              onClick={handlePhotoCapture} 
              disabled={!isLocationReady}
              data-testid="button-capture-photo"
            >
              <Camera className="mr-2 h-4 w-4" />
              {isLocationReady ? "Capture Photo" : "Waiting for location..."}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => {
        if (!open) handleCancelPreview();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Your Attendance Photo</DialogTitle>
            <DialogDescription>
              Review your photo with the attendance overlay before clocking in
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {photoData && (
              <img
                src={photoData}
                alt="Attendance preview"
                className="w-full rounded-md"
                data-testid="img-photo-preview"
              />
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleRetakePhoto} data-testid="button-retake-photo">
              Retake Photo
            </Button>
            <Button 
              onClick={handleConfirmPhoto} 
              disabled={clockInMutation.isPending}
              data-testid="button-confirm-photo"
            >
              <Check className="mr-2 h-4 w-4" />
              {clockInMutation.isPending ? "Clocking In..." : "Confirm & Clock In"}
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
