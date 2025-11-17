import { ThemeProvider } from "../ThemeProvider";
import ClaimsPage from "../../pages/ClaimsPage";

export default function ClaimsPageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-3xl">
        <ClaimsPage />
      </div>
    </ThemeProvider>
  );
}
