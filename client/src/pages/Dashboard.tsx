import { Clock, Calendar, FileText, Mail, Calculator, Gift } from "lucide-react";
import { MenuCard } from "@/components/MenuCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const menuItems = [
    { title: "Attendance", icon: Clock, path: "/attendance" },
    { title: "Leave", icon: Calendar, path: "/leave" },
    { title: "Claims", icon: FileText, path: "/claims" },
    { title: "Payslip", icon: Mail, path: "/payslip" },
    { title: "Income Tax", icon: Calculator, path: "/income-tax" },
    { title: "Rewards", icon: Gift, path: "/rewards" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold mb-3 md:mb-6" data-testid="text-dashboard-title">
          What do you want to do today?
        </h2>
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          {menuItems.map((item) => (
            <MenuCard
              key={item.title}
              title={item.title}
              icon={item.icon}
              onClick={() => setLocation(item.path)}
            />
          ))}
        </div>
      </div>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Refer & Earn!</h3>
              <p className="text-sm opacity-90">
                Spread the word and we'll reward you.
              </p>
            </div>
            <Button
              variant="secondary"
              className="bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
              data-testid="button-refer-share"
            >
              Click to Share Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
