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
      <CardContent className="flex flex-col items-center justify-center p-3 md:p-6 gap-2 md:gap-3">
        <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center ${iconColor || 'bg-primary/10'}`}>
          <Icon className={`h-5 w-5 md:h-8 md:w-8 ${iconColor ? 'text-primary' : 'text-primary'}`} />
        </div>
        <h3 className="text-xs md:text-base font-medium text-center leading-tight" data-testid={`text-menu-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h3>
      </CardContent>
    </Card>
  );
}
