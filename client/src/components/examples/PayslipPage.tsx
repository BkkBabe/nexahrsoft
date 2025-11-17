import { ThemeProvider } from "../ThemeProvider";
import PayslipPage from "../../pages/PayslipPage";

export default function PayslipPageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-3xl">
        <PayslipPage />
      </div>
    </ThemeProvider>
  );
}
