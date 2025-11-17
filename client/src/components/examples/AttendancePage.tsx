import { ThemeProvider } from "../ThemeProvider";
import AttendancePage from "../../pages/AttendancePage";

export default function AttendancePageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-3xl">
        <AttendancePage />
      </div>
    </ThemeProvider>
  );
}
