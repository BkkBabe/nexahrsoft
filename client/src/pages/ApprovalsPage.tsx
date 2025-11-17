import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

//todo: remove mock functionality
const mockLeaveRequests = [
  {
    id: 1,
    employeeName: "John Doe",
    type: "Annual Leave",
    dates: "Jan 25-27, 2024",
    days: 3,
    reason: "Family vacation",
    submittedDate: "Jan 15, 2024",
  },
  {
    id: 2,
    employeeName: "Jane Smith",
    type: "Sick Leave",
    dates: "Jan 20, 2024",
    days: 1,
    reason: "Medical appointment",
    submittedDate: "Jan 19, 2024",
  },
];

const mockClaimRequests = [
  {
    id: 1,
    employeeName: "Mike Johnson",
    type: "Travel",
    amount: "$85.50",
    date: "Jan 18, 2024",
    description: "Client meeting transportation",
  },
];

export default function ApprovalsPage() {
  const handleApprove = (type: string, id: number) => {
    console.log(`Approved ${type} request ${id}`);
  };

  const handleReject = (type: string, id: number) => {
    console.log(`Rejected ${type} request ${id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
          Approvals
        </h2>
        <p className="text-sm text-muted-foreground">
          Review and approve leave and claims requests
        </p>
      </div>

      <Tabs defaultValue="leave" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="leave" data-testid="tab-leave">
            Leave Requests
            <Badge variant="secondary" className="ml-2">
              {mockLeaveRequests.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="claims" data-testid="tab-claims">
            Claim Requests
            <Badge variant="secondary" className="ml-2">
              {mockClaimRequests.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="space-y-4 mt-6">
          {mockLeaveRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {request.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold" data-testid={`text-employee-${request.id}`}>
                          {request.employeeName}
                        </p>
                        <Badge variant="outline" data-testid={`badge-leave-type-${request.id}`}>
                          {request.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.dates} • {request.days}{" "}
                        {request.days === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">Reason:</span> {request.reason}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Submitted {request.submittedDate}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove("leave", request.id)}
                        data-testid={`button-approve-leave-${request.id}`}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject("leave", request.id)}
                        data-testid={`button-reject-leave-${request.id}`}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="claims" className="space-y-4 mt-6">
          {mockClaimRequests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {request.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold" data-testid={`text-employee-claim-${request.id}`}>
                            {request.employeeName}
                          </p>
                          <Badge variant="outline" data-testid={`badge-claim-type-${request.id}`}>
                            {request.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.date}</p>
                      </div>
                      <p className="text-xl font-semibold" data-testid={`text-claim-amount-${request.id}`}>
                        {request.amount}
                      </p>
                    </div>
                    <p className="text-sm">{request.description}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove("claim", request.id)}
                        data-testid={`button-approve-claim-${request.id}`}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject("claim", request.id)}
                        data-testid={`button-reject-claim-${request.id}`}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
