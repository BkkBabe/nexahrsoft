import { ThemeProvider } from "../ThemeProvider";
import RewardsPage from "../../pages/RewardsPage";

export default function RewardsPageExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-5xl">
        <RewardsPage />
      </div>
    </ThemeProvider>
  );
}
