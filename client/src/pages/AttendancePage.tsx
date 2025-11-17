import { useState, useRef, useEffect } from "react";
import { Clock, MapPin, Camera, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

//todo: remove mock functionality
const mockAttendanceHistory = [
  { 
    date: "2024-01-15", 
    checkIn: "08:45 AM", 
    checkOut: "05:30 PM", 
    status: "present", 
    photo: null,
    location: {
      latitude: 1.3521,
      longitude: 103.8198,
      accuracy: 25,
      address: "Singapore Office, 1 Marina Boulevard, Singapore 018989"
    }
  },
  { 
    date: "2024-01-14", 
    checkIn: "09:00 AM", 
    checkOut: "05:45 PM", 
    status: "present", 
    photo: null,
    location: {
      latitude: 1.3521,
      longitude: 103.8198,
      accuracy: 30,
      address: "Singapore Office, 1 Marina Boulevard, Singapore 018989"
    }
  },
  { 
    date: "2024-01-13", 
    checkIn: "08:50 AM", 
    checkOut: "05:20 PM", 
    status: "present", 
    photo: null,
    location: {
      latitude: 1.3521,
      longitude: 103.8198,
      accuracy: 20,
      address: "Singapore Office, 1 Marina Boulevard, Singapore 018989"
    }
  },
];

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: string;
  photo: string | null;
  location: LocationData;
}

export default function AttendancePage() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [clockInData, setClockInData] = useState<{
    photo: string;
    location: LocationData;
    time: Date;
  } | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>(mockAttendanceHistory);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get user location
  const getUserLocation = async (): Promise<LocationData | null> => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by your browser"));
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      // Try to get address from reverse geocoding (using a free API)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}`
        );
        const data = await response.json();
        locationData.address = data.display_name || "Unknown location";
      } catch (error) {
        console.error("Failed to get address:", error);
        locationData.address = `${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`;
      }

      setLocation(locationData);
      setIsLoadingLocation(false);
      return locationData;
    } catch (error) {
      console.error("Error getting location:", error);
      setIsLoadingLocation(false);
      toast({
        title: "Location Error",
        description: error instanceof Error ? error.message : "Failed to get your location. Please enable location permissions.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please allow camera permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Handle clock in button
  const handleClockAction = async () => {
    if (!isClockedIn) {
      setShowCamera(true);
      await startCamera();
      await getUserLocation();
    } else {
      // Clock out
      setIsClockedIn(false);
      setClockInData(null);
      toast({
        title: "Clocked Out",
        description: `You clocked out at ${format(new Date(), "hh:mm a")}`,
      });
    }
  };

  // Capture photo from video
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL("image/jpeg");
        setCapturedPhoto(photoData);
      }
    }
  };

  // Confirm clock in with photo and location
  const handleConfirmClockIn = () => {
    if (capturedPhoto && location) {
      const now = new Date();
      const newClockInData = {
        photo: capturedPhoto,
        location: location,
        time: now,
      };
      
      setClockInData(newClockInData);
      setIsClockedIn(true);
      setShowCamera(false);
      stopCamera();
      setCapturedPhoto(null);
      
      // Add to attendance history
      const newRecord: AttendanceRecord = {
        date: format(now, "yyyy-MM-dd"),
        checkIn: format(now, "hh:mm a"),
        checkOut: null,
        status: "present",
        photo: capturedPhoto,
        location: location,
      };
      
      setAttendanceHistory(prev => [newRecord, ...prev]);
      
      toast({
        title: "Clocked In Successfully",
        description: `You clocked in at ${format(now, "hh:mm a")}`,
      });
    } else if (!capturedPhoto) {
      toast({
        title: "Photo Required",
        description: "Please capture your photo to clock in",
        variant: "destructive",
      });
    } else if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable location to clock in",
        variant: "destructive",
      });
    }
  };

  // Handle retake photo
  const handleRetake = async () => {
    setCapturedPhoto(null);
    // Restart camera if it's not running
    if (!stream) {
      await startCamera();
    }
  };

  // Cancel and close camera
  const handleCancel = () => {
    setShowCamera(false);
    stopCamera();
    setCapturedPhoto(null);
    setLocation(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
          Attendance
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your daily attendance and view history
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="text-4xl font-bold font-mono" data-testid="text-current-time">
              {format(currentTime, "hh:mm:ss a")}
            </div>
            <div className="text-sm text-muted-foreground" data-testid="text-current-date">
              {format(currentTime, "EEEE, MMMM dd, yyyy")}
            </div>

            {isClockedIn && clockInData && (
              <div className="space-y-4 w-full max-w-md">
                <Badge variant="default" className="text-sm px-4 py-1" data-testid="badge-status">
                  Clocked In at {format(clockInData.time, "hh:mm a")}
                </Badge>
                <div className="flex items-center justify-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={clockInData.photo} alt="Clock-in photo" />
                    <AvatarFallback>Photo</AvatarFallback>
                  </Avatar>
                  <div className="text-left text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {clockInData.location.address || 
                          `${clockInData.location.latitude.toFixed(6)}, ${clockInData.location.longitude.toFixed(6)}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      Accuracy: ±{Math.round(clockInData.location.accuracy)}m
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showCamera ? (
              <div className="w-full max-w-md space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  {!capturedPhoto ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-auto"
                        data-testid="video-camera"
                      />
                      <div className="absolute top-2 right-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={handleCancel}
                          data-testid="button-close-camera"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="relative">
                      <img src={capturedPhoto} alt="Captured" className="w-full h-auto" />
                      <div className="absolute top-2 right-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={handleRetake}
                          data-testid="button-retake"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {location && (
                  <div className="bg-muted/50 p-3 rounded-lg text-left">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium" data-testid="text-captured-location">
                          {location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Accuracy: ±{Math.round(location.accuracy)}m
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isLoadingLocation && (
                  <div className="text-sm text-muted-foreground">
                    Getting your location...
                  </div>
                )}

                <div className="flex gap-2">
                  {!capturedPhoto ? (
                    <>
                      <Button
                        onClick={capturePhoto}
                        className="flex-1"
                        disabled={!stream}
                        data-testid="button-capture"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Capture Photo
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        data-testid="button-cancel-camera"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleConfirmClockIn}
                        className="flex-1"
                        disabled={!location}
                        data-testid="button-confirm-clock-in"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Confirm & Clock In
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRetake}
                        data-testid="button-retake-photo"
                      >
                        Retake
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleClockAction}
                className="w-full max-w-xs h-14 text-lg"
                variant={isClockedIn ? "destructive" : "default"}
                data-testid="button-clock-action"
              >
                <Clock className="mr-2 h-5 w-5" />
                {isClockedIn ? "Clock Out" : "Clock In"}
              </Button>
            )}

            {/* Show current location when not clocked in and not showing camera */}
            {!isClockedIn && !showCamera && location && (
              <div className="w-full max-w-md bg-muted/50 p-3 rounded-lg">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="font-medium" data-testid="text-current-location">
                      {location.address || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendanceHistory.map((record, index) => (
              <div
                key={index}
                className="p-4 rounded-md bg-muted/50 space-y-2"
                data-testid={`row-attendance-${index}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {record.photo && (
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={record.photo} alt="Check-in photo" />
                        <AvatarFallback>📸</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <p className="font-medium" data-testid={`text-date-${index}`}>
                        {format(new Date(record.date), "EEE, MMM dd, yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.checkIn} {record.checkOut ? `- ${record.checkOut}` : '(In Progress)'}
                      </p>
                      {record.location && (
                        <div className="flex items-start gap-1 mt-2 text-sm">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                          <div className="flex-1">
                            <p className="text-muted-foreground text-xs" data-testid={`text-location-${index}`}>
                              {record.location.address || 
                                `${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Accuracy: ±{Math.round(record.location.accuracy)}m
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="default" data-testid={`badge-status-${index}`}>
                    {record.status === "present" ? "Present" : record.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
