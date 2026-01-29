import { useState, useRef } from "react";
import { Receipt, Plus, Upload, X, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { queryClient } from "@/lib/queryClient";
import type { Claim } from "@shared/schema";
import { claimTypeLabels } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CLAIM_TYPES = [
  { value: "transport", label: "Transport" },
  { value: "material_purchase", label: "Material Purchase" },
  { value: "other", label: "Other" },
];

export default function ClaimsPage() {
  const [open, setOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [claimType, setClaimType] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { data: claimsData, isLoading } = useQuery<{ claims: Claim[] }>({
    queryKey: ["/api/claims"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("claimType", claimType);
      formData.append("amount", amount);
      formData.append("description", description);
      formData.append("claimMonth", currentMonth.toString());
      formData.append("claimYear", currentYear.toString());
      
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      const response = await fetch("/api/claims", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit claim");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Claim Submitted",
        description: "Your claim has been submitted for review.",
      });
      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setClaimType("");
    setAmount("");
    setDescription("");
    setReceiptFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setReceiptFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimType || !amount) {
      toast({
        title: "Missing Fields",
        description: "Please fill in claim type and amount",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate();
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

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Claims</h1>
            <p className="text-muted-foreground">Submit and track your expense claims</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-claim">
                <Plus className="h-4 w-4 mr-2" />
                New Claim
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Submit New Claim</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="claimType">Claim Type *</Label>
                  <Select value={claimType} onValueChange={setClaimType}>
                    <SelectTrigger data-testid="select-claim-type">
                      <SelectValue placeholder="Select claim type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLAIM_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    data-testid="input-amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the expense..."
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Receipt (Optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                    data-testid="input-receipt-file"
                  />
                  {receiptFile ? (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm flex-1 truncate">{receiptFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setReceiptFile(null)}
                        data-testid="button-remove-receipt"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-receipt"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Receipt
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, JPEG, PNG (max 10MB)
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-claim"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Claim"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              My Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : claims.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No claims submitted yet</p>
                <p className="text-sm">Click "New Claim" to submit your first expense claim</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`claim-item-${claim.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {claimTypeLabels[claim.claimType as keyof typeof claimTypeLabels] || claim.claimType}
                        </span>
                        {getStatusBadge(claim.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {claim.description || "No description"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {format(new Date(claim.submittedAt), "dd MMM yyyy")}
                        {" • "}
                        Period: {claim.claimMonth}/{claim.claimYear}
                      </p>
                      {claim.reviewComments && (
                        <p className="text-xs text-muted-foreground italic">
                          Comment: {claim.reviewComments}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        ${parseFloat(claim.amount).toFixed(2)}
                      </p>
                      {claim.receiptFileName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <FileText className="h-3 w-3" />
                          Receipt attached
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
