import { useState } from "react";
import { Calendar, Plus, Clock } from "lucide-react";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { LeaveBalance, LeaveApplication } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const leaveApplicationSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
});

type LeaveApplicationForm = z.infer<typeof leaveApplicationSchema>;

export default function LeavePage() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: balancesData, isLoading: balancesLoading } = useQuery<{ balances: LeaveBalance[] }>({
    queryKey: ["/api/leave/balances"],
  });

  const { data: applicationsData, isLoading: applicationsLoading } = useQuery<{ applications: LeaveApplication[] }>({
    queryKey: ["/api/leave/applications"],
  });

  const form = useForm<LeaveApplicationForm>({
    resolver: zodResolver(leaveApplicationSchema),
    defaultValues: {
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: LeaveApplicationForm) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      return apiRequest("POST", "/api/leave/applications", {
        ...data,
        totalDays: daysDiff,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave application submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave/applications"] });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave application",
        variant: "destructive",
      });
    },
  });

  const balances = balancesData?.balances || [];
  const applications = applicationsData?.applications || [];

  const handleSubmit = (data: LeaveApplicationForm) => {
    submitMutation.mutate(data);
  };

  if (balancesLoading || applicationsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Leave Management</h2>
          <p className="text-sm text-muted-foreground">
            Apply for leave and track your balances
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
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
            <Button data-testid="button-apply-leave" disabled={balances.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leave-type">Leave Type</Label>
                <Select
                  value={form.watch("leaveType")}
                  onValueChange={(value) => form.setValue("leaveType", value)}
                >
                  <SelectTrigger id="leave-type" data-testid="select-leave-type">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {balances.map((balance) => (
                      <SelectItem key={balance.id} value={balance.leaveType}>
                        {balance.leaveType} ({balance.balance} days left)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.leaveType && (
                  <p className="text-sm text-destructive">{form.formState.errors.leaveType.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  type="date"
                  id="start-date"
                  data-testid="input-start-date"
                  {...form.register("startDate")}
                />
                {form.formState.errors.startDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.startDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  type="date"
                  id="end-date"
                  data-testid="input-end-date"
                  {...form.register("endDate")}
                />
                {form.formState.errors.endDate && (
                  <p className="text-sm text-destructive">{form.formState.errors.endDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for leave"
                  data-testid="textarea-reason"
                  {...form.register("reason")}
                />
                {form.formState.errors.reason && (
                  <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                data-testid="button-submit-leave"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {balances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Leave Balances</h3>
            <p className="text-sm text-muted-foreground">
              Your leave entitlements will appear here once configured by the admin.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {balances.map((leave) => {
            const remainingDays = parseFloat(leave.balance || '0');
            const eligible = parseFloat(leave.eligible || '0');
            const taken = parseFloat(leave.taken || '0');
            const usedPercentage = eligible > 0 ? (taken / eligible) * 100 : 0;

            return (
              <Card key={leave.id} data-testid={`card-leave-balance-${leave.id}`}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium" data-testid={`text-leave-type-${leave.id}`}>
                        {leave.leaveType}
                      </h3>
                      <Badge variant="outline" data-testid={`badge-leave-days-${leave.id}`}>
                        {remainingDays} days left
                      </Badge>
                    </div>
                    <Progress
                      value={usedPercentage}
                      className="h-2"
                    />
                    <p className="text-sm text-muted-foreground" data-testid={`text-leave-balance-${leave.id}`}>
                      Taken {leave.taken} of {leave.eligible} days
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No leave applications yet
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`row-leave-${record.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium" data-testid={`text-leave-type-app-${record.id}`}>
                      {record.leaveType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Clock className="inline h-3 w-3 mr-1" />
                      {new Date(record.startDate).toLocaleDateString()} - {new Date(record.endDate).toLocaleDateString()} • {record.totalDays} {parseFloat(String(record.totalDays)) === 1 ? "day" : "days"}
                    </p>
                    {record.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {record.reason}
                      </p>
                    )}
                    {record.reviewComments && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Admin comment: {record.reviewComments}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStatusBadgeVariant(record.status)} data-testid={`badge-leave-status-${record.id}`}>
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
