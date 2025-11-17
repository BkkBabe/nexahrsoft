import { Clock } from "lucide-react";
import { MenuCard as MenuCardComponent } from "../MenuCard";

export default function MenuCardExample() {
  return (
    <div className="p-4 max-w-xs">
      <MenuCardComponent
        title="Attendance"
        icon={Clock}
        onClick={() => console.log("Clicked")}
      />
    </div>
  );
}
