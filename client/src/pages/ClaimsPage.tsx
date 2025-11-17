import { useState } from "react";
import { FileText, Upload, Plus } from "lucide-react";
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

//todo: remove mock functionality
const mockClaims = [
  {
    type: "Travel",
    amount: "$120.50",
    date: "Jan 15, 2024",
    status: "pending",
    description: "Client meeting transportation",
  },
  {
    type: "Meal",
    amount: "$45.00",
    date: "Jan 12, 2024",
    status: "approved",
    description: "Business lunch with client",
  },
];

export default function ClaimsPage() {
  const [open, setOpen] = useState(false);
  const [claimType, setClaimType] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Claim submitted");
    setOpen(false);
    setFileName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
            Claims
          </h2>
          <p className="text-sm text-muted-foreground">
            Submit and track your expense claims
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-submit-claim">
              <Plus className="mr-2 h-4 w-4" />
              Submit Claim
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit New Claim</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="claim-type">Claim Type</Label>
                <Select value={claimType} onValueChange={setClaimType}>
                  <SelectTrigger id="claim-type" data-testid="select-claim-type">
                    <SelectValue placeholder="Select claim type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="meal">Meal</SelectItem>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  type="number"
                  id="amount"
                  placeholder="0.00"
                  step="0.01"
                  data-testid="input-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input type="date" id="date" data-testid="input-date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter description"
                  data-testid="textarea-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receipt">Upload Receipt</Label>
                <div className="border-2 border-dashed rounded-md p-4 text-center">
                  <Input
                    type="file"
                    id="receipt"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    data-testid="input-receipt"
                  />
                  <label
                    htmlFor="receipt"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {fileName || "Click to upload receipt"}
                    </span>
                  </label>
                </div>
              </div>
              <Button type="submit" className="w-full" data-testid="button-submit-claim-form">
                Submit Claim
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockClaims.map((claim, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-4 rounded-md bg-muted/50"
                data-testid={`row-claim-${index}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium" data-testid={`text-claim-type-${index}`}>
                      {claim.type}
                    </p>
                    <Badge
                      variant={claim.status === "approved" ? "default" : "secondary"}
                      data-testid={`badge-claim-status-${index}`}
                    >
                      {claim.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{claim.description}</p>
                  <p className="text-sm text-muted-foreground mt-1">{claim.date}</p>
                </div>
                <p className="text-lg font-semibold" data-testid={`text-claim-amount-${index}`}>
                  {claim.amount}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
