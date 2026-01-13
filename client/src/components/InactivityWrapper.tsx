import { useInactivityTimeout } from "@/hooks/use-inactivity-timeout";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";

interface InactivityWrapperProps {
  children: React.ReactNode;
}

export function InactivityWrapper({ children }: InactivityWrapperProps) {
  const { showWarning, secondsRemaining, dismissWarning } = useInactivityTimeout({
    timeoutMs: 5 * 60 * 1000,
    warningMs: 4 * 60 * 1000,
  });

  return (
    <>
      {children}
      <InactivityWarningDialog
        open={showWarning}
        secondsRemaining={secondsRemaining}
        onContinue={dismissWarning}
      />
    </>
  );
}
