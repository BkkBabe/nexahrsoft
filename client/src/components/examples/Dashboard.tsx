import { ThemeProvider } from "../ThemeProvider";
import Dashboard from "../../pages/Dashboard";

export default function DashboardExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-5xl">
        <Dashboard />
      </div>
    </ThemeProvider>
  );
}
