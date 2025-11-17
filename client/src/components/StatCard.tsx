import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground" data-testid={`text-stat-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {title}
            </p>
            <p className="text-3xl font-bold mt-2" data-testid={`text-stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {trend && (
              <p
                className={`text-xs mt-2 ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
                data-testid={`text-stat-trend-${title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {trend.value}
              </p>
            )}
          </div>
          <div className="bg-primary/10 p-3 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
