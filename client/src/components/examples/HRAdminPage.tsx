import { ThemeProvider } from "../ThemeProvider";
import HRAdminPage from "../../pages/HRAdminPage";

export default function HRAdminPageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-6xl">
        <HRAdminPage />
      </div>
    </ThemeProvider>
  );
}
