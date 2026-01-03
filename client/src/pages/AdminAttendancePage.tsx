import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Clock, Users, ArrowLeft, Grid3X3, ChevronLeft, ChevronRight, Search, Plus, CalendarCheck, Trash2, History, FileText, MapPin, ExternalLink, AlertTriangle, CheckCircle2, MoreVertical, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import type { AttendanceRecord, User } from "@shared/schema";

// Address cache to avoid repeated API calls
const addressCache: Record<string, string> = {};

// Rate limiting for geocoding - track last request time  
let lastGeocodeTime = 0;
const GEOCODE_DELAY_MS = 1500; // 1.5 second delay between requests

// Delay helper for rate limiting
const geocodeDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Reverse geocode coordinates to address using OpenStreetMap Nominatim (with rate limiting)
// This function is called on-demand when user hovers over a location link - NOT automatically
async function reverseGeocode(lat: string, lng: string): Promise<string> {
  const cacheKey = `${lat},${lng}`;
  if (addressCache[cacheKey]) {
    return addressCache[cacheKey];
  }
  
  // Rate limiting - wait if needed
  const now = Date.now();
  const timeSinceLastRequest = now - lastGeocodeTime;
  if (timeSinceLastRequest < GEOCODE_DELAY_MS) {
    await geocodeDelay(GEOCODE_DELAY_MS - timeSinceLastRequest);
  }
  lastGeocodeTime = Date.now();
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'NexaHR-HRMS/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    
    // Build a short address from components
    const address = data.address || {};
    const parts: string[] = [];
    
    // Add building/road info
    if (address.road || address.street) {
      parts.push(address.road || address.street);
    }
    if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood);
    }
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    
    const shortAddress = parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 3).join(',') || 'Unknown location';
    addressCache[cacheKey] = shortAddress;
    return shortAddress;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    const fallback = `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
    addressCache[cacheKey] = fallback;
    return fallback;
  }
}

// Helper function to calculate hours worked (to nearest 0.5 hour)
function calculateHours(clockInTime: Date | string, clockOutTime: Date | string | null): number {
  if (!clockOutTime) return 0;
  
  const clockIn = new Date(clockInTime);
  const clockOut = new Date(clockOutTime);
  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  // Round to nearest 0.5 hour
  return Math.round(diffHours * 2) / 2;
}

// Helper function to format time in Singapore timezone
function formatTime(date: Date | string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Singapore' // Always display in Singapore timezone
  });
}

// Helper function to format date
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Helper to get date range for period (using local dates, not UTC)
function getDateRange(period: 'daily' | 'weekly' | 'monthly'): { startDate: string; endDate: string } {
  const now = new Date();
  // Use local date format YYYY-MM-DD
  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const endDate = formatLocalDate(now);
  let startDate: string;

  if (period === 'daily') {
    startDate = endDate;
  } else if (period === 'weekly') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    startDate = formatLocalDate(weekAgo);
  } else {
    // monthly
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = formatLocalDate(monthStart);
  }

  return { startDate, endDate };
}

// Get all days in a month
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

// Locale-safe date key formatter (YYYY-MM-DD) avoiding timezone shifts
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get date key from a date string or Date object (handles API dates)
// IMPORTANT: Date strings like "2025-12-25" are parsed as UTC by JavaScript
// but we need to treat them as local dates for display purposes
function normalizeRecordDateKey(dateValue: Date | string): string {
  if (typeof dateValue === 'string') {
    // If it's already in YYYY-MM-DD format, return it directly
    // This avoids timezone conversion issues
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }
  // For Date objects or other formats, extract local date components
  const d = new Date(dateValue);
  return getDateKey(d);
}

// Get color class based on hours worked and open sessions
function getHeatmapColor(hours: number, hasOpenSession?: boolean): string {
  if (hasOpenSession) return "bg-blue-500 dark:bg-blue-400"; // Blue for in-progress
  if (hours >= 8) return "bg-green-600 dark:bg-green-500";
  if (hours >= 6) return "bg-green-400 dark:bg-green-400";
  if (hours >= 4) return "bg-yellow-400 dark:bg-yellow-500";
  if (hours > 0) return "bg-orange-400 dark:bg-orange-500";
  return "bg-muted";
}

// Get text color based on background
function getHeatmapTextColor(hours: number): string {
  if (hours > 0) return "text-white";
  return "text-muted-foreground";
}

export default function AdminAttendancePage() {
  // Default to heatmap view to prevent geocoding on initial page load
  const [viewMode, setViewMode] = useState<'today' | 'orphaned' | 'heatmap' | 'details'>('heatmap');
  const [heatmapViewType, setHeatmapViewType] = useState<'week' | 'month'>('week');
  const [heatmapMonth, setHeatmapMonth] = useState(() => {
    // Initialize to previous month if we're in the first week of the month
    // This provides better UX as most attendance data is in the previous month
    const now = new Date();
    const dayOfMonth = now.getDate();
    if (dayOfMonth <= 7) {
      // First week - default to previous month
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return { year: prevYear, month: prevMonth };
    }
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  // For week view - track the start of the current week
  const [heatmapWeekStart, setHeatmapWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  // Selected date for clock-ins view (defaults to today)
  const [clockInsDate, setClockInsDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  
  // Add attendance dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [clockInTime, setClockInTime] = useState("09:00");
  const [clockOutTime, setClockOutTime] = useState("");
  
  // End clock-in dialog state
  const [showEndClockInDialog, setShowEndClockInDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [endClockOutTime, setEndClockOutTime] = useState("18:00");
  
  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  
  // Address state for reverse geocoding
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  // Fetch session to check if user is nexaadmin (master admin) or view-only admin
  const { data: sessionData } = useQuery<{ authenticated: boolean; isAdmin: boolean; isViewOnlyAdmin?: boolean; user?: { id: string; name: string; email: string } }>({
    queryKey: ['/api/auth/session'],
  });
  
  // Check if current user is nexaadmin (master admin has user.id === "admin")
  const isNexaAdmin = sessionData?.user?.id === "admin";
  const isViewOnlyAdmin = sessionData?.isViewOnlyAdmin === true;

  // Fetch all users
  const { data: usersData } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  // Fetch attendance records for selected clock-ins date (only when viewing Clock-ins tab)
  const { data: clockInsRecordsData, isLoading: clockInsLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/admin/attendance/records', { startDate: clockInsDate, endDate: clockInsDate }],
    enabled: viewMode === 'today', // Only fetch when viewing Clock-ins tab
  });

  // Fetch attendance records for heatmap (week or month) - use local dates
  const heatmapStartDate = heatmapViewType === 'week' 
    ? getDateKey(heatmapWeekStart)
    : getDateKey(new Date(heatmapMonth.year, heatmapMonth.month, 1));
  const heatmapEndDate = heatmapViewType === 'week'
    ? getDateKey(new Date(heatmapWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000)) // 6 days after start
    : getDateKey(new Date(heatmapMonth.year, heatmapMonth.month + 1, 0));
  
  const { data: heatmapRecordsData, isLoading: heatmapLoading, refetch: refetchHeatmapRecords } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/admin/attendance/records', { startDate: heatmapStartDate, endDate: heatmapEndDate }],
    staleTime: 0, // Always consider stale to ensure fresh data
  });
  
  // Sync month with week when switching from week to month view
  // This ensures the month view shows the same period the user was viewing in week view
  useEffect(() => {
    if (heatmapViewType === 'month') {
      // When switching to month view, use the month of the week start date
      const weekMonth = heatmapWeekStart.getMonth();
      const weekYear = heatmapWeekStart.getFullYear();
      setHeatmapMonth(prev => {
        // Only update if different to avoid unnecessary re-renders
        if (prev.month !== weekMonth || prev.year !== weekYear) {
          return { year: weekYear, month: weekMonth };
        }
        return prev;
      });
    }
  }, [heatmapViewType, heatmapWeekStart]);
  
  // Refetch when switching between week/month view
  useEffect(() => {
    if (viewMode === 'heatmap') {
      refetchHeatmapRecords();
    }
  }, [heatmapViewType, heatmapStartDate, heatmapEndDate, viewMode]);

  // Fetch audit logs for attendance changes (for details and audit views)
  type AuditLogEntry = {
    id: number;
    action: string;
    tableName: string;
    recordId: string | null;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    changedBy: string | null;
    changedAt: Date;
    userName: string | null;
    employeeCode: string | null;
  };
  const { data: auditLogsData, isLoading: auditLoading } = useQuery<{ logs: AuditLogEntry[] }>({
    queryKey: ['/api/admin/attendance/audit-logs'],
    enabled: viewMode === 'details',
  });
  const auditLogs = auditLogsData?.logs || [];

  // Fetch orphaned attendance sessions (older than 24 hours without clock-out)
  const { data: orphanedSessionsData, isLoading: orphanedLoading } = useQuery<{ records: AttendanceRecord[] }>({
    queryKey: ['/api/admin/attendance/orphaned'],
    enabled: viewMode === 'orphaned',
  });
  const orphanedSessions = orphanedSessionsData?.records || [];
  
  // State for selected orphaned records
  const [selectedOrphanedIds, setSelectedOrphanedIds] = useState<Set<string>>(new Set());
  const [bulkClockOutTime, setBulkClockOutTime] = useState("18:00");

  const users = usersData || [];
  const heatmapRecords = heatmapRecordsData?.records || [];
  const clockInsRecords = clockInsRecordsData?.records || [];
  
  // REMOVED: Automatic geocoding - addresses are now fetched on-demand when clicking location links
  // This prevents API overload and allows heatmap views to load without geocoding interference
  
  // On-demand address fetching function - called when user clicks a location link
  const fetchAddressOnDemand = async (recordId: string, type: 'in' | 'out', lat: string, lng: string) => {
    const key = `${recordId}-${type}`;
    if (addresses[key]) return; // Already have it
    
    try {
      const address = await reverseGeocode(lat, lng);
      setAddresses(prev => ({ ...prev, [key]: address }));
    } catch (error) {
      // Silently fail - coordinate display is still available
    }
  };
  
  // Check if selected date is today
  const todayDate = getDateKey(new Date());
  const isViewingToday = clockInsDate === todayDate;

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(users.map(u => u.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [users]);

  // Filter users for heatmap
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => !u.id.includes('admin'))
      .filter(u => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            u.name?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query) ||
            u.employeeCode?.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .filter(u => {
        if (departmentFilter !== "all") {
          return u.department === departmentFilter;
        }
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [users, searchQuery, departmentFilter]);

  // Days in selected period for heatmap (week or month)
  const heatmapDays = useMemo(() => {
    if (heatmapViewType === 'week') {
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(heatmapWeekStart);
        day.setDate(heatmapWeekStart.getDate() + i);
        days.push(day);
      }
      return days;
    } else {
      return getDaysInMonth(heatmapMonth.year, heatmapMonth.month);
    }
  }, [heatmapViewType, heatmapWeekStart, heatmapMonth]);

  // Aggregated data type for heatmap cells
  type AggregatedAttendance = {
    totalHours: number;
    recordCount: number;
    records: AttendanceRecord[];
    hasOpenSession: boolean; // true if any record is missing clock-out
  };

  // Create a map of userId -> date -> aggregated attendance data for heatmap
  const heatmapDataMap = useMemo(() => {
    const map: Record<string, Record<string, AggregatedAttendance>> = {};
    
    heatmapRecords.forEach(record => {
      if (!map[record.userId]) {
        map[record.userId] = {};
      }
      const dateKey = normalizeRecordDateKey(record.date);
      
      if (!map[record.userId][dateKey]) {
        map[record.userId][dateKey] = {
          totalHours: 0,
          recordCount: 0,
          records: [],
          hasOpenSession: false,
        };
      }
      
      const hours = calculateHours(record.clockInTime, record.clockOutTime);
      map[record.userId][dateKey].totalHours += hours;
      map[record.userId][dateKey].recordCount += 1;
      map[record.userId][dateKey].records.push(record);
      
      // Track if any record is missing clock-out
      if (!record.clockOutTime) {
        map[record.userId][dateKey].hasOpenSession = true;
      }
    });
    
    return map;
  }, [heatmapRecords]);


  // Filter employees for add attendance dialog (exclude admins)
  const addDialogFilteredEmployees = useMemo(() => {
    if (!addSearchQuery.trim()) return [];
    const query = addSearchQuery.toLowerCase();
    return users
      .filter(u => u.role !== "admin")
      .filter(u => 
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.employeeCode?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [users, addSearchQuery]);

  // Get today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Check if employee already has attendance today
  const employeeHasAttendanceToday = (userId: string) => {
    return heatmapRecords.some(r => r.userId === userId && normalizeRecordDateKey(r.date) === todayStr);
  };

  // Check if employee already has attendance on selected date
  const employeeHasAttendanceOnDate = (userId: string, date: string) => {
    return heatmapRecords.some(r => r.userId === userId && normalizeRecordDateKey(r.date) === date);
  };

  // Add attendance mutation
  const addAttendanceMutation = useMutation({
    mutationFn: async (data: { userId: string; date: string; clockInTime: string; clockOutTime?: string }) => {
      const response = await apiRequest("POST", "/api/admin/attendance/add", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Attendance Added",
        description: data.message || "Attendance record created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/records'] });
      setShowAddDialog(false);
      setSelectedEmployee(null);
      setAddSearchQuery("");
      setClockInTime("09:00");
      setClockOutTime("");
      // Reset date to today
      const now = new Date();
      setSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add attendance",
        variant: "destructive",
      });
    },
  });

  const handleAddAttendance = () => {
    if (!selectedEmployee || !selectedDate) return;
    
    addAttendanceMutation.mutate({
      userId: selectedEmployee.id,
      date: selectedDate,
      clockInTime,
      clockOutTime: clockOutTime || undefined,
    });
  };

  // End clock-in mutation (nexaadmin only)
  const endClockInMutation = useMutation({
    mutationFn: async (data: { recordId: string; clockOutTime: string }) => {
      const response = await apiRequest("POST", "/api/admin/attendance/end-clockin", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Clock-out Set",
        description: data.message || "Clock-out time has been recorded",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/orphaned'] });
      setShowEndClockInDialog(false);
      setSelectedRecord(null);
      setEndClockOutTime("18:00");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end clock-in",
        variant: "destructive",
      });
    },
  });

  const handleEndClockIn = () => {
    if (!selectedRecord) return;
    
    endClockInMutation.mutate({
      recordId: selectedRecord.id,
      clockOutTime: endClockOutTime,
    });
  };

  // Delete attendance mutation (nexaadmin only)
  const deleteAttendanceMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/attendance/${recordId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Attendance Deleted",
        description: data.message || "Attendance record has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/orphaned'] });
      setShowDeleteDialog(false);
      setRecordToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attendance record",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAttendance = () => {
    if (!recordToDelete || !isNexaAdmin) return;
    deleteAttendanceMutation.mutate(recordToDelete.id);
  };

  // Bulk close orphaned sessions mutation
  const bulkCloseOrphanedMutation = useMutation({
    mutationFn: async (data: { recordIds: string[]; clockOutTime?: string }) => {
      const response = await apiRequest("POST", "/api/admin/attendance/bulk-close-orphaned", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sessions Closed",
        description: data.message || "Orphaned sessions have been closed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/orphaned'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/attendance/records'] });
      setSelectedOrphanedIds(new Set());
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close orphaned sessions",
        variant: "destructive",
      });
    },
  });

  const handleBulkCloseOrphaned = () => {
    if (selectedOrphanedIds.size === 0) return;
    bulkCloseOrphanedMutation.mutate({
      recordIds: Array.from(selectedOrphanedIds),
      clockOutTime: bulkClockOutTime || undefined,
    });
  };

  const toggleOrphanedSelection = (recordId: string) => {
    setSelectedOrphanedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  };

  const selectAllOrphaned = () => {
    if (selectedOrphanedIds.size === orphanedSessions.length) {
      setSelectedOrphanedIds(new Set());
    } else {
      setSelectedOrphanedIds(new Set(orphanedSessions.map(r => r.id)));
    }
  };

  // Week navigation
  const goToPreviousWeek = () => {
    setHeatmapWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setHeatmapWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // Month navigation
  const goToPreviousMonth = () => {
    setHeatmapMonth(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setHeatmapMonth(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const monthName = new Date(heatmapMonth.year, heatmapMonth.month).toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  // Format week range
  const weekEndDate = new Date(heatmapWeekStart);
  weekEndDate.setDate(heatmapWeekStart.getDate() + 6);
  const weekRangeName = `${heatmapWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Navigate heatmap based on view type
  const goToPrevious = heatmapViewType === 'week' ? goToPreviousWeek : goToPreviousMonth;
  const goToNext = heatmapViewType === 'week' ? goToNextWeek : goToNextMonth;
  const periodLabel = heatmapViewType === 'week' ? weekRangeName : monthName;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="text-admin-attendance-title">
            Attendance Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage employee attendance records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAddDialog(true)}
            disabled={isViewOnlyAdmin}
            data-testid="button-add-attendance"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Attendance
          </Button>
          <Button
            variant={viewMode === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('today')}
            data-testid="button-view-today"
          >
            <CalendarCheck className="h-4 w-4 mr-1" />
            Clock-ins
          </Button>
          <Button
            variant={viewMode === 'orphaned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('orphaned')}
            data-testid="button-view-orphaned"
            className={orphanedSessions.length > 0 ? "relative" : ""}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Orphaned
            {orphanedSessions.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {orphanedSessions.length}
              </span>
            )}
          </Button>
          <Button
            variant={viewMode === 'heatmap' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('heatmap')}
            data-testid="button-view-heatmap"
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Heatmap
          </Button>
          <Button
            variant={viewMode === 'details' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('details')}
            data-testid="button-view-details"
          >
            <History className="h-4 w-4 mr-1" />
            Attendance Details
          </Button>
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {viewMode === 'today' ? (
        <>
          {/* Clock-ins View with Date Selection */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5" />
                    {isViewingToday ? "Today's Clock-ins" : "Clock-ins"}
                  </CardTitle>
                  <CardDescription>
                    {new Date(clockInsDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={clockInsDate}
                    onChange={(e) => setClockInsDate(e.target.value)}
                    className="w-[160px]"
                    data-testid="input-clockins-date"
                  />
                  {!isViewingToday && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClockInsDate(todayDate)}
                      data-testid="button-clockins-today"
                    >
                      Today
                    </Button>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground" data-testid="text-today-clocked-in-count">{clockInsRecords.length}</span> clock-ins
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-400"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-600 dark:bg-green-500"></div>
                  <span>Completed (8+ hrs)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-400"></div>
                  <span>Completed (6-8 hrs)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-yellow-400 dark:bg-yellow-500"></div>
                  <span>Completed (4-6 hrs)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-500"></div>
                  <span>Completed (1-4 hrs)</span>
                </div>
              </div>

              {/* Clock-ins Grid */}
              {clockInsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading records...</div>
              ) : clockInsRecords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No clock-ins on this date</p>
                  <p className="text-sm">No attendance records found for the selected date</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clockInsRecords
                    .sort((a, b) => new Date(a.clockInTime).getTime() - new Date(b.clockInTime).getTime())
                    .map((record) => {
                      const user = users.find(u => u.id === record.userId);
                      const hours = calculateHours(record.clockInTime, record.clockOutTime);
                      const isInProgress = !record.clockOutTime;
                      const statusColor = isInProgress 
                        ? "border-l-blue-500" 
                        : hours >= 8 ? "border-l-green-600" : hours >= 6 ? "border-l-green-400" : hours >= 4 ? "border-l-yellow-400" : "border-l-orange-400";
                      
                      return (
                        <Card 
                          key={record.id} 
                          className={`border-l-4 ${statusColor}`}
                          data-testid={`card-today-${record.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <div className="font-semibold text-sm">
                                  {user?.name || 'Unknown'}
                                </div>
                                {user?.employeeCode && (
                                  <div className="text-xs text-muted-foreground">{user.employeeCode}</div>
                                )}
                              </div>
                              <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                                isInProgress 
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" 
                                  : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              }`}>
                                {isInProgress ? "In Progress" : `${hours.toFixed(1)} hrs`}
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-xs">
                              {/* Clock In */}
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground w-8 shrink-0">In:</span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{formatTime(record.clockInTime)}</div>
                                  {record.latitude && record.longitude ? (
                                    <a 
                                      href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-start gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                                      onMouseEnter={() => fetchAddressOnDemand(record.id, 'in', record.latitude!, record.longitude!)}
                                    >
                                      <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                                      <span className="break-words">
                                        {addresses[`${record.id}-in`] || `${parseFloat(record.latitude).toFixed(4)}, ${parseFloat(record.longitude).toFixed(4)}`}
                                      </span>
                                      <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" />
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">No location</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Clock Out */}
                              <div className="flex items-start gap-2">
                                <span className="font-medium text-muted-foreground w-8 shrink-0">Out:</span>
                                <div className="min-w-0 flex-1">
                                  {record.clockOutTime ? (
                                    <>
                                      <div className="font-medium">{formatTime(record.clockOutTime)}</div>
                                      {record.clockOutLatitude && record.clockOutLongitude ? (
                                        <a 
                                          href={`https://www.google.com/maps?q=${record.clockOutLatitude},${record.clockOutLongitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-start gap-1 text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                                          onMouseEnter={() => fetchAddressOnDemand(record.id, 'out', record.clockOutLatitude!, record.clockOutLongitude!)}
                                        >
                                          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                                          <span className="break-words">
                                            {addresses[`${record.id}-out`] || `${parseFloat(record.clockOutLatitude).toFixed(4)}, ${parseFloat(record.clockOutLongitude).toFixed(4)}`}
                                          </span>
                                          <ExternalLink className="h-3 w-3 shrink-0 mt-0.5" />
                                        </a>
                                      ) : (
                                        <span className="text-muted-foreground">No location</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">Not clocked out</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-3 pt-3 border-t">
                              {isInProgress && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs flex-1"
                                  onClick={() => {
                                    setSelectedRecord(record);
                                    setShowEndClockInDialog(true);
                                  }}
                                  disabled={isViewOnlyAdmin}
                                  data-testid={`button-end-clockin-today-${record.id}`}
                                >
                                  End Clock-in
                                </Button>
                              )}
                              {isNexaAdmin && !isViewOnlyAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setRecordToDelete(record);
                                    setShowDeleteDialog(true);
                                  }}
                                  data-testid={`button-delete-attendance-today-${record.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Total Clock-ins</p>
                  <p className="text-xl font-bold" data-testid="text-today-total-clockins">
                    {clockInsRecords.length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">In Progress</p>
                  <p className="text-xl font-bold text-blue-500" data-testid="text-today-in-progress">
                    {clockInsRecords.filter(r => !r.clockOutTime).length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Completed</p>
                  <p className="text-xl font-bold text-green-600" data-testid="text-today-completed">
                    {clockInsRecords.filter(r => r.clockOutTime).length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Avg Hours</p>
                  <p className="text-xl font-bold" data-testid="text-today-avg-hours">
                    {clockInsRecords.filter(r => r.clockOutTime).length > 0
                      ? (clockInsRecords
                          .filter(r => r.clockOutTime)
                          .reduce((sum, r) => sum + calculateHours(r.clockInTime, r.clockOutTime), 0) / 
                         clockInsRecords.filter(r => r.clockOutTime).length
                        ).toFixed(1)
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : viewMode === 'orphaned' ? (
        <>
          {/* Orphaned Sessions View */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Orphaned Sessions
                  </CardTitle>
                  <CardDescription>
                    Clock-ins without clock-out for more than 24 hours. These need to be closed to allow employees to clock in again.
                  </CardDescription>
                </div>
                {orphanedSessions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewMode('details')}
                      data-testid="button-audit-trail"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Audit Trail
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkCloseOrphaned}
                      disabled={selectedOrphanedIds.size === 0 || isViewOnlyAdmin || bulkCloseOrphanedMutation.isPending}
                      data-testid="button-bulk-close-orphaned"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Close Selected ({selectedOrphanedIds.size})
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {orphanedLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading orphaned sessions...</div>
              ) : orphanedSessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p className="text-lg font-medium text-green-600">No Orphaned Sessions</p>
                  <p className="text-sm">All attendance sessions are properly closed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <input
                      type="checkbox"
                      checked={selectedOrphanedIds.size === orphanedSessions.length && orphanedSessions.length > 0}
                      onChange={selectAllOrphaned}
                      className="h-4 w-4 rounded border-gray-300"
                      data-testid="checkbox-select-all-orphaned"
                    />
                    <span className="text-sm font-medium">
                      Select All ({orphanedSessions.length} orphaned session{orphanedSessions.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  
                  {/* Orphaned Sessions List */}
                  <div className="space-y-3">
                    {orphanedSessions.map((record) => {
                      const user = users.find(u => u.id === record.userId);
                      const clockInDate = new Date(record.clockInTime);
                      const daysAgo = Math.floor((Date.now() - clockInDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div 
                          key={record.id}
                          className="flex items-center gap-4 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                          data-testid={`orphaned-record-${record.id}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrphanedIds.has(record.id)}
                            onChange={() => toggleOrphanedSelection(record.id)}
                            className="h-4 w-4 rounded border-gray-300"
                            data-testid={`checkbox-orphaned-${record.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{user?.name || 'Unknown'}</span>
                              {user?.employeeCode && (
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {user.employeeCode}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              <span className="font-medium">Clocked in:</span>{' '}
                              {clockInDate.toLocaleString('en-US', { 
                                timeZone: 'Asia/Singapore',
                                weekday: 'short',
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {user?.department && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {user.department}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                              {daysAgo} day{daysAgo !== 1 ? 's' : ''} ago
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.date}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isViewOnlyAdmin}
                                data-testid={`button-actions-orphaned-${record.id}`}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  // Cancel - just remove selection
                                  setSelectedOrphanedIds(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(record.id);
                                    return newSet;
                                  });
                                }}
                                data-testid={`action-cancel-${record.id}`}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setShowEndClockInDialog(true);
                                }}
                                data-testid={`action-set-clockout-${record.id}`}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Set Clock-out
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setRecordToDelete(record);
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600 focus:text-red-600"
                                data-testid={`action-delete-${record.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : viewMode === 'heatmap' ? (
        <>
          {/* Heatmap View */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Attendance Heatmap
                  </CardTitle>
                  <CardDescription>Visual overview of attendance for all employees</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {/* Week/Month Toggle */}
                  <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                    <Button
                      variant={heatmapViewType === 'week' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-3"
                      onClick={() => setHeatmapViewType('week')}
                      data-testid="button-heatmap-week"
                    >
                      Week
                    </Button>
                    <Button
                      variant={heatmapViewType === 'month' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-7 px-3"
                      onClick={() => setHeatmapViewType('month')}
                      data-testid="button-heatmap-month"
                    >
                      Month
                    </Button>
                  </div>
                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPrevious} data-testid="button-prev-period">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[180px] text-center" data-testid="text-current-period">
                      {periodLabel}
                    </span>
                    <Button variant="outline" size="icon" onClick={goToNext} data-testid="button-next-period">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-employee"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-department">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <span className="text-muted-foreground">Hours:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-600 dark:bg-green-500"></div>
                  <span>8+</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-green-400"></div>
                  <span>6-8</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-yellow-400 dark:bg-yellow-500"></div>
                  <span>4-6</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-orange-400 dark:bg-orange-500"></div>
                  <span>1-4</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-400"></div>
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-muted border"></div>
                  <span>Absent</span>
                </div>
              </div>

              {/* Heatmap Grid */}
              {heatmapLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading heatmap data...</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Header row with dates */}
                    <div className="flex border-b sticky top-0 bg-background z-10">
                      <div className="w-48 flex-shrink-0 p-2 font-medium text-sm border-r">
                        Employee
                      </div>
                      <div className="flex flex-1">
                        {heatmapDays.map((day, idx) => {
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          return (
                            <div
                              key={idx}
                              className={`flex-1 ${heatmapViewType === 'week' ? 'min-w-[80px]' : 'min-w-[28px]'} p-1 text-center text-xs border-r ${isWeekend ? 'bg-muted/50' : ''}`}
                            >
                              <div className="font-medium">{day.getDate()}</div>
                              <div className="text-muted-foreground text-[10px]">
                                {heatmapViewType === 'week' 
                                  ? day.toLocaleDateString('en-US', { weekday: 'short' })
                                  : day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Total column header */}
                      <div className="w-20 flex-shrink-0 p-1 text-center text-xs border-l bg-primary/10">
                        <div className="font-bold">Total</div>
                        <div className="text-muted-foreground text-[10px]">Hours</div>
                      </div>
                    </div>

                    {/* Employee rows */}
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No employees found matching your filters
                      </div>
                    ) : (
                      <div className="max-h-[60vh] overflow-y-auto">
                        {filteredUsers.map((user) => (
                          <div key={user.id} className="flex border-b hover:bg-muted/30" data-testid={`heatmap-row-${user.id}`}>
                            <div className="w-48 flex-shrink-0 p-2 border-r">
                              <div className="text-sm font-medium truncate" title={user.name || ''}>
                                {user.name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {user.department || 'No dept'}
                              </div>
                            </div>
                            <div className="flex flex-1">
                              {heatmapDays.map((day, idx) => {
                                const dateKey = getDateKey(day);
                                const aggData = heatmapDataMap[user.id]?.[dateKey];
                                const hours = aggData?.totalHours || 0;
                                const recordCount = aggData?.recordCount || 0;
                                const hasOpenSession = aggData?.hasOpenSession || false;
                                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isFuture = day > today;
                                const hasRecord = aggData && recordCount > 0;

                                return (
                                  <Tooltip key={idx}>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`flex-1 ${heatmapViewType === 'week' ? 'min-w-[80px]' : 'min-w-[28px]'} min-h-[36px] flex items-center justify-center text-xs border-r last:border-r-0 cursor-pointer transition-opacity hover:opacity-80 ${
                                          isFuture 
                                            ? 'bg-muted/30' 
                                            : isWeekend && !hasRecord 
                                              ? 'bg-muted/50'
                                              : getHeatmapColor(hours, hasOpenSession)
                                        } ${(hours > 0 || hasOpenSession) ? 'text-white' : ''}`}
                                        data-testid={`cell-${user.id}-${dateKey}`}
                                      >
                                        {!isFuture && hasOpenSession && hours === 0 && (
                                          <Clock className="h-3 w-3" />
                                        )}
                                        {hours > 0 && !isFuture && (
                                          <span className="font-medium">{Number.isInteger(hours) ? hours : hours.toFixed(1)}</span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs max-w-xs">
                                      <div className="font-medium">{user.name}</div>
                                      <div className="text-muted-foreground">{formatDate(day)}</div>
                                      {aggData ? (
                                        <div className="mt-1 space-y-1">
                                          {recordCount > 1 && (
                                            <div className="text-yellow-600 dark:text-yellow-400 font-medium">
                                              {recordCount} entries
                                            </div>
                                          )}
                                          {aggData.records.map((record, rIdx) => (
                                            <div key={record.id} className="border-t pt-1 first:border-t-0 first:pt-0">
                                              {recordCount > 1 && <div className="text-muted-foreground">Entry {rIdx + 1}:</div>}
                                              <div>In: {formatTime(record.clockInTime)}</div>
                                              <div>Out: {record.clockOutTime ? formatTime(record.clockOutTime) : <span className="text-blue-500">In Progress</span>}</div>
                                              <div>{record.clockOutTime ? `${calculateHours(record.clockInTime, record.clockOutTime).toFixed(1)} hrs` : '-'}</div>
                                              <div className="flex flex-col gap-1 mt-1">
                                                {!record.clockOutTime && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 text-xs"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedRecord(record);
                                                      setShowEndClockInDialog(true);
                                                    }}
                                                    disabled={isViewOnlyAdmin}
                                                    data-testid={`button-end-clockin-${record.id}`}
                                                  >
                                                    End Clock-in
                                                  </Button>
                                                )}
                                                {isNexaAdmin && !isViewOnlyAdmin && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-6 text-xs text-destructive hover:text-destructive"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setRecordToDelete(record);
                                                      setShowDeleteDialog(true);
                                                    }}
                                                    data-testid={`button-delete-attendance-${record.id}`}
                                                  >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Delete
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                          <div className="border-t pt-1 font-medium">
                                            Total: {hours.toFixed(1)} hours
                                          </div>
                                        </div>
                                      ) : isFuture ? (
                                        <div className="text-muted-foreground">Future date</div>
                                      ) : (
                                        <div className="text-muted-foreground">No record</div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                            {/* Total hours column for this employee */}
                            {(() => {
                              const userTotalHours = heatmapDays.reduce((sum, day) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                if (day > today) return sum;
                                const dateKey = getDateKey(day);
                                const aggData = heatmapDataMap[user.id]?.[dateKey];
                                return sum + (aggData?.totalHours || 0);
                              }, 0);
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className="w-20 flex-shrink-0 min-h-[36px] flex items-center justify-center text-sm font-bold border-l bg-primary/10 cursor-pointer hover:bg-primary/20"
                                      data-testid={`total-hours-${user.id}`}
                                    >
                                      {userTotalHours > 0 ? userTotalHours.toFixed(1) : '-'}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    <div className="font-medium">{user.name}</div>
                                    <div>Total hours this {heatmapViewType === 'week' ? 'week' : 'month'}: {userTotalHours.toFixed(1)} hrs</div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Total Employees</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-total-employees">
                    {filteredUsers.length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Total Records</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-total-records">
                    {heatmapRecords.filter(r => filteredUsers.some(u => u.id === r.userId)).length}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Active This {heatmapViewType === 'week' ? 'Week' : 'Month'}</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-active">
                    {new Set(heatmapRecords.filter(r => filteredUsers.some(u => u.id === r.userId)).map(r => r.userId)).size}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Working Days</p>
                  <p className="text-xl font-bold" data-testid="text-heatmap-working-days">
                    {heatmapDays.filter(d => {
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      return d.getDay() !== 0 && d.getDay() !== 6 && d <= today;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : viewMode === 'details' ? (
        <>
          {/* Attendance Details View */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attendance Details
              </CardTitle>
              <CardDescription>
                View detailed attendance record information and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading attendance details...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No attendance details yet</p>
                  <p className="text-sm">Attendance record changes will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const actionColor = log.action === 'create' 
                      ? 'text-green-600 dark:text-green-400' 
                      : log.action === 'delete' 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-yellow-600 dark:text-yellow-400';
                    const actionIcon = log.action === 'create' 
                      ? <Plus className="h-4 w-4" /> 
                      : log.action === 'delete' 
                        ? <Trash2 className="h-4 w-4" /> 
                        : <FileText className="h-4 w-4" />;
                    
                    return (
                      <div
                        key={log.id}
                        className="border rounded-lg p-3 space-y-2"
                        data-testid={`details-log-${log.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`${actionColor}`}>{actionIcon}</span>
                            <span className={`font-medium capitalize ${actionColor}`}>{log.action}</span>
                            <span className="text-muted-foreground">attendance record</span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.changedAt).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          {log.userName && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Employee:</span>
                              <span className="font-medium">{log.userName}</span>
                              {log.employeeCode && (
                                <span className="text-xs text-muted-foreground">({log.employeeCode})</span>
                              )}
                            </div>
                          )}
                          
                          {log.changedBy && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Changed by:</span>
                              <span className="font-medium">{log.changedBy === 'admin' ? 'nexaadmin' : log.changedBy}</span>
                            </div>
                          )}
                          
                          {log.fieldName && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Field:</span>
                              <span>{log.fieldName}</span>
                            </div>
                          )}
                          
                          {(log.oldValue || log.newValue) && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {log.oldValue && (
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">
                                  Old: {log.oldValue}
                                </span>
                              )}
                              {log.newValue && (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                                  New: {log.newValue}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Add Attendance Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setSelectedEmployee(null);
          setAddSearchQuery("");
          setClockInTime("09:00");
          setClockOutTime("");
          // Reset date to today
          const now = new Date();
          setSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Attendance Record</DialogTitle>
            <DialogDescription>
              Add attendance for an employee for any date
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="attendanceDate">Date</Label>
              <Input
                id="attendanceDate"
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedEmployee(null);
                }}
                data-testid="input-attendance-date"
              />
            </div>

            {/* Employee Search */}
            <div className="space-y-2">
              <Label>Search Employee</Label>
              <Input
                placeholder="Type name, email, or employee code..."
                value={addSearchQuery}
                onChange={(e) => {
                  setAddSearchQuery(e.target.value);
                  setSelectedEmployee(null);
                }}
                data-testid="input-search-add-attendance"
              />
            </div>

            {/* Search Results */}
            {addSearchQuery.trim() !== "" && !selectedEmployee && (
              <div className="border rounded-lg max-h-48 overflow-auto">
                {addDialogFilteredEmployees.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    No matching employees found
                  </div>
                ) : (
                  <div className="divide-y">
                    {addDialogFilteredEmployees.map((emp) => {
                      const hasAttendance = employeeHasAttendanceOnDate(emp.id, selectedDate);
                      return (
                        <div
                          key={emp.id}
                          className={`p-3 cursor-pointer hover-elevate ${hasAttendance ? 'opacity-50' : ''}`}
                          onClick={() => {
                            if (!hasAttendance) {
                              setSelectedEmployee(emp);
                            }
                          }}
                          data-testid={`option-employee-${emp.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {emp.email} {emp.employeeCode && `· ${emp.employeeCode}`}
                              </div>
                            </div>
                            {hasAttendance && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                Already has attendance
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Employee */}
            {selectedEmployee && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm text-muted-foreground">Selected Employee:</div>
                <div className="font-medium">{selectedEmployee.name}</div>
                <div className="text-sm text-muted-foreground">{selectedEmployee.email}</div>
              </div>
            )}

            {/* Time Inputs */}
            {selectedEmployee && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clockIn">Clock In Time</Label>
                  <Input
                    id="clockIn"
                    type="time"
                    value={clockInTime}
                    onChange={(e) => setClockInTime(e.target.value)}
                    data-testid="input-clock-in-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clockOut">Clock Out Time (Optional)</Label>
                  <Input
                    id="clockOut"
                    type="time"
                    value={clockOutTime}
                    onChange={(e) => setClockOutTime(e.target.value)}
                    data-testid="input-clock-out-time"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Note: This action will be recorded in the audit log.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAttendance}
              disabled={!selectedEmployee || !clockInTime || addAttendanceMutation.isPending}
              data-testid="button-confirm-add-attendance"
            >
              {addAttendanceMutation.isPending ? "Adding..." : "Add Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End Clock-in Dialog (nexaadmin only) */}
      <Dialog open={showEndClockInDialog} onOpenChange={(open) => {
        setShowEndClockInDialog(open);
        if (!open) {
          setSelectedRecord(null);
          setEndClockOutTime("18:00");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>End Clock-in</DialogTitle>
            <DialogDescription>
              Set the clock-out time for this attendance record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRecord && (
              <>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Record Details:</div>
                  <div className="font-medium">
                    {users.find(u => u.id === selectedRecord.userId)?.name || 'Unknown Employee'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Date: {formatDate(selectedRecord.date)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Clock In: {formatTime(selectedRecord.clockInTime)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endClockOut">Clock Out Time</Label>
                  <Input
                    id="endClockOut"
                    type="time"
                    value={endClockOutTime}
                    onChange={(e) => setEndClockOutTime(e.target.value)}
                    data-testid="input-end-clock-out-time"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Note: Only master admin (nexaadmin) can end clock-ins. This action will be recorded in the audit log.
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndClockInDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEndClockIn}
              disabled={!selectedRecord || !endClockOutTime || endClockInMutation.isPending}
              data-testid="button-confirm-end-clockin"
            >
              {endClockInMutation.isPending ? "Saving..." : "Set Clock-out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog (nexaadmin only) */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setRecordToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance record? This action cannot be undone and will be recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {recordToDelete && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="font-medium">
                {users.find(u => u.id === recordToDelete.userId)?.name || 'Unknown Employee'}
              </div>
              <div className="text-muted-foreground">
                Date: {formatDate(recordToDelete.date)}
              </div>
              <div className="text-muted-foreground">
                Clock In: {formatTime(recordToDelete.clockInTime)}
              </div>
              {recordToDelete.clockOutTime && (
                <div className="text-muted-foreground">
                  Clock Out: {formatTime(recordToDelete.clockOutTime)}
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAttendance}
              disabled={deleteAttendanceMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAttendanceMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
