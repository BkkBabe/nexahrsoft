import { ThemeProvider } from "../ThemeProvider";
import { AppHeader as AppHeaderComponent } from "../AppHeader";

export default function AppHeaderExample() {
  return (
    <ThemeProvider>
      <AppHeaderComponent
        userName="Faith Jr. Negapatan"
        userRole="employee"
        companyName="3SI PTE. LTD."
        notificationCount={3}
      />
    </ThemeProvider>
  );
}
