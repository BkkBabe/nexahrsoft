import { useState } from "react";
import { Clock, MapPin, Camera, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";

//todo: remove mock functionality
const mockAttendanceHistory = [
  { date: "2024-01-15", checkIn: "08:45 AM", checkOut: "05:30 PM", status: "present" },
  { date: "2024-01-14", checkIn: "09:00 AM", checkOut: "05:45 PM", status: "present" },
  { date: "2024-01-13", checkIn: "08:50 AM", checkOut: "05:20 PM", status: "present" },
];

export default function AttendancePage() {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [currentTime] = useState(new Date());

  const handleClockAction = () => {
    if (!isClockedIn) {
      setShowCamera(true);
    } else {
      setIsClockedIn(false);
      console.log("Clocked out");
    }
  };

  const handlePhotoCapture = () => {
    setShowCamera(false);
    setIsClockedIn(true);
    console.log("Photo captured and clocked in");
  };

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

            {isClockedIn && (
              <Badge variant="default" className="text-sm px-4 py-1" data-testid="badge-status">
                Clocked In
              </Badge>
            )}

            {showCamera ? (
              <div className="w-full max-w-sm space-y-4">
                <div className="bg-muted rounded-lg p-8 flex flex-col items-center justify-center gap-4">
                  <Camera className="h-16 w-16 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Camera Preview</p>
                  <Avatar className="h-32 w-32">
                    <AvatarFallback className="text-4xl">📸</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handlePhotoCapture}
                    className="flex-1"
                    data-testid="button-capture"
                  >
                    Capture & Clock In
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCamera(false)}
                    data-testid="button-cancel-camera"
                  >
                    Cancel
                  </Button>
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

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span data-testid="text-location">Location: Office, Singapore</span>
            </div>
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
            {mockAttendanceHistory.map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                data-testid={`row-attendance-${index}`}
              >
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-date-${index}`}>
                    {format(new Date(record.date), "EEE, MMM dd, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {record.checkIn} - {record.checkOut}
                  </p>
                </div>
                <Badge variant="default" data-testid={`badge-status-${index}`}>
                  Present
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
