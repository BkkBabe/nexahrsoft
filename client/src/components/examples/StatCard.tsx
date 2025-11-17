import { Users } from "lucide-react";
import { StatCard as StatCardComponent } from "../StatCard";

export default function StatCardExample() {
  return (
    <div className="p-4 max-w-sm">
      <StatCardComponent
        title="Total Employees"
        value="156"
        icon={Users}
        trend={{ value: "+12 from last month", isPositive: true }}
      />
    </div>
  );
}
