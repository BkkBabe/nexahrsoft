import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

//todo: remove mock functionality
const mockLeaveBalances = [
  { type: "Annual Leave", used: 5, total: 14, color: "bg-blue-500" },
  { type: "Sick Leave", used: 2, total: 14, color: "bg-green-500" },
  { type: "Personal Leave", used: 1, total: 7, color: "bg-purple-500" },
];

const mockLeaveHistory = [
  { type: "Annual Leave", dates: "Jan 20-22, 2024", days: 3, status: "approved" },
  { type: "Sick Leave", dates: "Jan 10, 2024", days: 1, status: "approved" },
];

export default function LeavePage() {
  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Leave application submitted");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
            Leave Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Apply for leave and track your balances
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-apply-leave">
              <Plus className="mr-2 h-4 w-4" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger id="leave-type" data-testid="select-leave-type">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input type="date" id="start-date" data-testid="input-start-date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input type="date" id="end-date" data-testid="input-end-date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for leave"
                  data-testid="textarea-reason"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-leave">
                Submit Application
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {mockLeaveBalances.map((leave, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium" data-testid={`text-leave-type-${index}`}>
                    {leave.type}
                  </h3>
                  <Badge variant="outline" data-testid={`badge-leave-days-${index}`}>
                    {leave.total - leave.used} days left
                  </Badge>
                </div>
                <Progress
                  value={(leave.used / leave.total) * 100}
                  className="h-2"
                />
                <p className="text-sm text-muted-foreground" data-testid={`text-leave-balance-${index}`}>
                  Used {leave.used} of {leave.total} days
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockLeaveHistory.map((record, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                data-testid={`row-leave-${index}`}
              >
                <div className="flex-1">
                  <p className="font-medium" data-testid={`text-leave-dates-${index}`}>
                    {record.type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {record.dates} • {record.days} {record.days === 1 ? "day" : "days"}
                  </p>
                </div>
                <Badge variant="default" data-testid={`badge-leave-status-${index}`}>
                  Approved
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
