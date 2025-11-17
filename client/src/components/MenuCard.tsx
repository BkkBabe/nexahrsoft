import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MenuCardProps {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  iconColor?: string;
}

export function MenuCard({ title, icon: Icon, onClick, iconColor }: MenuCardProps) {
  return (
    <Card
      className="cursor-pointer hover-elevate active-elevate-2 transition-all"
      onClick={onClick}
      data-testid={`card-menu-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconColor || 'bg-primary/10'}`}>
          <Icon className={`h-8 w-8 ${iconColor ? 'text-primary' : 'text-primary'}`} />
        </div>
        <h3 className="text-base font-medium text-center" data-testid={`text-menu-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h3>
      </CardContent>
    </Card>
  );
}
