import { useState } from "react";
import { Receipt, Clock, CheckCircle, XCircle, Eye, Filter, ArrowLeft, FileText, ExternalLink, Trash2, History, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import type { Claim } from "@shared/schema";
import { claimTypeLabels } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// Generate period options for the last 2 years
function generatePeriodOptions() {
  const options: { value: string; label: string; month: number; year: number }[] = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  
  // Generate periods from current month going back 24 months
  for (let i = 0; i < 24; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    
    while (month < 0) {
      month += 12;
      year -= 1;
    }
    
    options.push({
      value: `${month + 1}-${year}`,
      label: `${MONTH_NAMES[month]} ${year}`,
      month: month + 1,
      year: year,
    });
  }
  
  return options;
}

interface ClaimsAuditLog {
  id: string;
  claimId: string;
  userId: string;
  employeeCode: string | null;
  employeeName: string | null;
  claimType: string;
  amount: string;
  description: string | null;
  claimMonth: number;
  claimYear: number;
  action: string;
  previousStatus: string | null;
  performedBy: string;
  performedByName: string | null;
  comments: string | null;
  performedAt: string;
}

export default function AdminClaimsPage() {
  const [, setLocation] = useLocation();
  const currentDate = new Date();
  const periodOptions = generatePeriodOptions();
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[0]?.value || "1-2026");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState<Claim | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [activeTab, setActiveTab] = useState("claims");
  const { toast } = useToast();

  // Parse selected period
  const [selectedMonth, selectedYear] = selectedPeriod.split("-").map(Number);
  const selectedMonthStr = String(selectedMonth);
  const selectedYearStr = String(selectedYear);

  const { data: claimsData, isLoading } = useQuery<{ claims: Claim[] }>({
    queryKey: ["/api/admin/claims", selectedYearStr, selectedMonthStr],
    queryFn: async () => {
      const res = await fetch(`/api/admin/claims?year=${selectedYearStr}&month=${selectedMonthStr}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch claims");
      return res.json();
    },
  });

  const { data: pendingCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/claims/pending-count"],
  });

  const { data: auditLogsData, isLoading: auditLogsLoading } = useQuery<ClaimsAuditLog[]>({
    queryKey: ["/api/admin/claims/audit-log", selectedYearStr, selectedMonthStr],
    queryFn: async () => {
      const res = await fetch(`/api/admin/claims/audit-log?year=${selectedYearStr}&month=${selectedMonthStr}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
    enabled: activeTab === "audit",
  });

  const deleteClaimMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("DELETE", `/api/admin/claims/${id}`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Claim Deleted",
        description: "The claim has been permanently deleted.",
      });
      setDeleteConfirmOpen(false);
      setClaimToDelete(null);
      setDeleteReason("");
      setSelectedClaim(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims/pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims/audit-log"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (claim: Claim) => {
    setClaimToDelete(claim);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (claimToDelete) {
      deleteClaimMutation.mutate({ id: claimToDelete.id, reason: deleteReason });
    }
  };

  const updateClaimMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/admin/claims/${id}`, {
        status,
        reviewComments: reviewComments || null,
      });
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === "approved" ? "Claim Approved" : "Claim Rejected",
        description: `The claim has been ${status}.`,
      });
      setSelectedClaim(null);
      setReviewComments("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/claims/pending-count"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewReceipt = (claimId: string) => {
    window.open(`/api/claims/${claimId}/receipt`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const claims = claimsData?.claims || [];
  const pendingCount = pendingCountData?.count || 0;

  const pendingClaims = claims.filter(c => c.status === "pending");
  const processedClaims = claims.filter(c => c.status !== "pending");

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">All Claims</h1>
              <p className="text-muted-foreground">Review and manage employee expense claims</p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {pendingCount} Pending
              </Badge>
            )}
          </div>
          <Button 
            variant="outline"
            onClick={() => setLocation("/admin/dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="claims" data-testid="tab-claims">
              <Receipt className="h-4 w-4 mr-2" />
              Claims
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <History className="h-4 w-4 mr-2" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="claims" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filter by Period
                  </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-40" data-testid="select-period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/claims"] });
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/claims/pending-count"] });
                  }}
                  data-testid="button-refresh-claims"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {pendingClaims.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Pending Claims ({pendingClaims.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingClaims.map((claim) => (
                  <ClaimRow
                    key={claim.id}
                    claim={claim}
                    onView={() => setSelectedClaim(claim)}
                    onViewReceipt={() => handleViewReceipt(claim.id)}
                    onDelete={() => handleDeleteClick(claim)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {pendingClaims.length > 0 ? "Processed Claims" : "All Claims"} ({processedClaims.length > 0 ? processedClaims.length : claims.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (pendingClaims.length > 0 ? processedClaims : claims).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No claims for this period</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(pendingClaims.length > 0 ? processedClaims : claims).map((claim) => (
                  <ClaimRow
                    key={claim.id}
                    claim={claim}
                    onView={() => setSelectedClaim(claim)}
                    onViewReceipt={() => handleViewReceipt(claim.id)}
                    onDelete={() => handleDeleteClick(claim)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Claim Details</DialogTitle>
            </DialogHeader>
            {selectedClaim && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Employee</Label>
                    <p className="font-medium">{selectedClaim.employeeName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Employee Code</Label>
                    <p className="font-medium">{selectedClaim.employeeCode || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Claim Type</Label>
                    <p className="font-medium">
                      {claimTypeLabels[selectedClaim.claimType as keyof typeof claimTypeLabels] || selectedClaim.claimType}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Amount</Label>
                    <p className="font-medium text-lg">${parseFloat(selectedClaim.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Period</Label>
                    <p className="font-medium">{MONTH_NAMES[selectedClaim.claimMonth - 1]} {selectedClaim.claimYear}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Submitted</Label>
                    <p className="font-medium">{format(new Date(selectedClaim.submittedAt), "dd MMM yyyy HH:mm")}</p>
                  </div>
                </div>
                
                {selectedClaim.description && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Description</Label>
                    <p className="text-sm bg-muted p-3 rounded-md">{selectedClaim.description}</p>
                  </div>
                )}
                
                {selectedClaim.receiptFileName && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Receipt</Label>
                    <Button
                      variant="outline"
                      className="w-full mt-1"
                      onClick={() => handleViewReceipt(selectedClaim.id)}
                      data-testid="button-view-receipt"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {selectedClaim.receiptFileName}
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  {getStatusBadge(selectedClaim.status)}
                </div>

                {selectedClaim.status === "pending" && (
                  <>
                    <div>
                      <Label htmlFor="comments">Review Comments (Optional)</Label>
                      <Textarea
                        id="comments"
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Add any comments about this claim..."
                        rows={3}
                        data-testid="input-review-comments"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => updateClaimMutation.mutate({ id: selectedClaim.id, status: "rejected" })}
                        disabled={updateClaimMutation.isPending}
                        data-testid="button-reject-claim"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={() => updateClaimMutation.mutate({ id: selectedClaim.id, status: "approved" })}
                        disabled={updateClaimMutation.isPending}
                        data-testid="button-approve-claim"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </>
                )}

                {(selectedClaim.status === "approved" || selectedClaim.status === "rejected") && (
                  <>
                    <div>
                      <Label htmlFor="reverse-comments">Reason for Reversal (Optional)</Label>
                      <Textarea
                        id="reverse-comments"
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Add reason for reversing this claim decision..."
                        rows={3}
                        data-testid="input-reverse-comments"
                      />
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => updateClaimMutation.mutate({ id: selectedClaim.id, status: "pending" })}
                        disabled={updateClaimMutation.isPending}
                        data-testid="button-reverse-claim"
                      >
                        <History className="h-4 w-4 mr-2" />
                        Reverse to Pending
                      </Button>
                    </div>
                  </>
                )}
                
                {/* Delete Button - hidden */}
                <div className="border-t pt-4 mt-4 hidden">
                  <Button
                    variant="ghost"
                    className="w-full text-destructive"
                    onClick={() => handleDeleteClick(selectedClaim)}
                    data-testid="button-delete-claim"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Claim
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Claim
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the claim
                {claimToDelete && ` from ${claimToDelete.employeeName} for $${parseFloat(claimToDelete.amount).toFixed(2)}`}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
              <Input
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Enter reason for deleting this claim..."
                className="mt-2"
                data-testid="input-delete-reason"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground"
                disabled={deleteClaimMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteClaimMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Claims Activity Log
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-40" data-testid="select-audit-period">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodOptions.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {auditLogsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : !auditLogsData || auditLogsData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs for this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLogsData.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 border rounded-lg"
                        data-testid={`audit-log-${log.id}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {log.action === "approved" && (
                              <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
                            )}
                            {log.action === "rejected" && (
                              <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
                            )}
                            {log.action === "deleted" && (
                              <Badge variant="outline" className="text-destructive border-destructive"><Trash2 className="h-3 w-3 mr-1" /> Deleted</Badge>
                            )}
                            {log.action === "reversed" && (
                              <Badge variant="outline" className="text-orange-500 border-orange-500"><History className="h-3 w-3 mr-1" /> Reversed</Badge>
                            )}
                            <span className="font-medium">{log.employeeName}</span>
                            {log.employeeCode && (
                              <span className="text-sm text-muted-foreground">({log.employeeCode})</span>
                            )}
                          </div>
                          <span className="text-lg font-semibold">${parseFloat(log.amount).toFixed(2)}</span>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span>{claimTypeLabels[log.claimType as keyof typeof claimTypeLabels] || log.claimType}</span>
                          {log.description && <span> - {log.description}</span>}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>By: {log.performedByName || "Admin"}</span>
                          <span>{format(new Date(log.performedAt), "dd MMM yyyy HH:mm")}</span>
                        </div>
                        {log.comments && (
                          <div className="mt-2 text-sm bg-muted p-2 rounded">
                            <span className="font-medium">Comments:</span> {log.comments}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface ClaimRowProps {
  claim: Claim;
  onView: () => void;
  onViewReceipt: () => void;
  onDelete: () => void;
  getStatusBadge: (status: string) => JSX.Element;
}

function ClaimRow({ claim, onView, onViewReceipt, onDelete, getStatusBadge }: ClaimRowProps) {
  return (
    <div
      className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
      data-testid={`claim-row-${claim.id}`}
    >
      <div className="space-y-1 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{claim.employeeName}</span>
          {claim.employeeCode && (
            <span className="text-sm text-muted-foreground">({claim.employeeCode})</span>
          )}
          {getStatusBadge(claim.status)}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">
            {claimTypeLabels[claim.claimType as keyof typeof claimTypeLabels] || claim.claimType}
          </Badge>
          {claim.description && (
            <span className="text-muted-foreground truncate max-w-xs">{claim.description}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Submitted: {format(new Date(claim.submittedAt), "dd MMM yyyy")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p className="text-lg font-semibold mr-4">
          ${parseFloat(claim.amount).toFixed(2)}
        </p>
        {claim.receiptFileName && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewReceipt();
            }}
            data-testid={`button-receipt-${claim.id}`}
          >
            <FileText className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hidden"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          data-testid={`button-delete-row-${claim.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          data-testid={`button-view-${claim.id}`}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
}
