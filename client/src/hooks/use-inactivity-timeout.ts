import { useEffect, useRef, useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface UseInactivityTimeoutOptions {
  timeoutMs?: number;
  warningMs?: number;
}

export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}) {
  const { 
    timeoutMs = 5 * 60 * 1000,
    warningMs = 4 * 60 * 1000
  } = options;
  
  const warningDurationSeconds = Math.floor((timeoutMs - warningMs) / 1000);
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingOutRef = useRef(false);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningDurationSeconds);

  const { data: session } = useQuery<{ authenticated: boolean; user?: { id: string } }>({
    queryKey: ["/api/auth/session"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      setLocation("/");
    },
  });

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    
    clearAllTimers();
    setShowWarning(false);
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });
    logoutMutation.mutate();
  }, [clearAllTimers, logoutMutation, toast]);

  const startCountdown = useCallback(() => {
    setShowWarning(true);
    setSecondsRemaining(warningDurationSeconds);
    
    countdownRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningDurationSeconds]);

  const resetTimers = useCallback(() => {
    if (!session?.authenticated) return;
    
    isLoggingOutRef.current = false;
    clearAllTimers();
    setShowWarning(false);
    setSecondsRemaining(warningDurationSeconds);

    warningRef.current = setTimeout(() => {
      startCountdown();
    }, warningMs);

    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);
  }, [session?.authenticated, clearAllTimers, warningMs, timeoutMs, warningDurationSeconds, startCountdown, handleLogout]);

  const dismissWarning = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!session?.authenticated) {
      clearAllTimers();
      setShowWarning(false);
      isLoggingOutRef.current = false;
      return;
    }

    const activityEvents = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    
    const handleActivity = () => {
      resetTimers();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimers();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [session?.authenticated, resetTimers, clearAllTimers]);

  return {
    showWarning,
    secondsRemaining,
    dismissWarning,
  };
}
