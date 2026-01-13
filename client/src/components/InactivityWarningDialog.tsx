import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface InactivityWarningDialogProps {
  open: boolean;
  secondsRemaining: number;
  onContinue: () => void;
}

export function InactivityWarningDialog({
  open,
  secondsRemaining,
  onContinue,
}: InactivityWarningDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-testid="dialog-inactivity-warning">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>You will be automatically logged out due to inactivity.</p>
            <p className="text-lg font-semibold text-foreground">
              Time remaining: {secondsRemaining} seconds
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onContinue}
            data-testid="button-continue-session"
          >
            I'm still here - Continue Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
