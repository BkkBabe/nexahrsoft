import { ThemeProvider } from "../ThemeProvider";
import IncomeTaxPage from "../../pages/IncomeTaxPage";

export default function IncomeTaxPageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-3xl">
        <IncomeTaxPage />
      </div>
    </ThemeProvider>
  );
}
