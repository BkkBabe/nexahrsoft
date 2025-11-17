import { ThemeProvider } from "../ThemeProvider";
import ApprovalsPage from "../../pages/ApprovalsPage";

export default function ApprovalsPageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-4xl">
        <ApprovalsPage />
      </div>
    </ThemeProvider>
  );
}
