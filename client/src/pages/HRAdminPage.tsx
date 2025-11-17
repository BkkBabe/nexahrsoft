import { Users, DollarSign, Download } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

//todo: remove mock functionality
const mockEmployees = [
  { id: "EMP001", name: "Faith Jr. Negapatan", department: "Engineering", role: "Developer", status: "active" },
  { id: "EMP002", name: "John Doe", department: "Sales", role: "Manager", status: "active" },
  { id: "EMP003", name: "Jane Smith", department: "Marketing", role: "Executive", status: "active" },
];

export default function HRAdminPage() {
  const handleExportPayroll = () => {
    console.log("Exporting payroll data");
  };

  const handleProcessPayroll = () => {
    console.log("Processing payroll");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2" data-testid="text-page-title">
          HR Administration
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage employees and process payroll
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Total Employees"
          value="156"
          icon={Users}
        />
        <StatCard
          title="Monthly Payroll"
          value="$487,250"
          icon={DollarSign}
        />
        <StatCard
          title="Pending Approvals"
          value="12"
          icon={Users}
          trend={{ value: "+3 from last week", isPositive: false }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Directory
              </span>
              <Button size="sm" variant="outline" data-testid="button-add-employee">
                Add Employee
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`row-employee-${employee.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {employee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                        {employee.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.role} • {employee.department}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" data-testid={`badge-employee-status-${employee.id}`}>
                    {employee.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payroll Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Period</p>
              <p className="text-lg font-semibold">January 2024</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Payroll Status</p>
              <Badge variant="secondary">Not Processed</Badge>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={handleProcessPayroll}
                data-testid="button-process-payroll"
              >
                Process Payroll
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPayroll}
                data-testid="button-export-payroll"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Payroll Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
