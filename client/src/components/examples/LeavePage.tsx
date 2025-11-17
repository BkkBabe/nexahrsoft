import { ThemeProvider } from "../ThemeProvider";
import LeavePage from "../../pages/LeavePage";

export default function LeavePageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-4xl">
        <LeavePage />
      </div>
    </ThemeProvider>
  );
}
