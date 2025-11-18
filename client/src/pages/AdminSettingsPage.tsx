import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Building2, Image as ImageIcon, Clock } from "lucide-react";
import type { CompanySettings } from "@shared/schema";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [attendanceBufferMinutes, setAttendanceBufferMinutes] = useState<number>(15);

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
  });

  // Update state when settings change
  useEffect(() => {
    if (settings?.attendanceBufferMinutes !== undefined) {
      setAttendanceBufferMinutes(settings.attendanceBufferMinutes);
    }
  }, [settings]);

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadUrlRes = await apiRequest("POST", "/api/company/upload-logo", {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      const { uploadURL } = await uploadUrlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload logo");
      }

      await apiRequest("PUT", "/api/company/settings", {
        logoUrl: uploadURL.split("?")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      setLogoFile(null);
      setLogoPreview(null);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadFaviconMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploadUrlRes = await apiRequest("POST", "/api/company/upload-favicon", {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });
      const { uploadURL } = await uploadUrlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload favicon");
      }

      await apiRequest("PUT", "/api/company/settings", {
        faviconUrl: uploadURL.split("?")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      setFaviconFile(null);
      setFaviconPreview(null);
      toast({
        title: "Success",
        description: "Favicon uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Logo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 1 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Favicon must be less than 1MB",
          variant: "destructive",
        });
        return;
      }

      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      uploadLogoMutation.mutate(logoFile);
    }
  };

  const handleFaviconUpload = () => {
    if (faviconFile) {
      uploadFaviconMutation.mutate(faviconFile);
    }
  };

  const updateAttendanceBufferMutation = useMutation({
    mutationFn: async (minutes: number) => {
      await apiRequest("PUT", "/api/admin/attendance/buffer", {
        attendanceBufferMinutes: minutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      toast({
        title: "Success",
        description: "Attendance buffer updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateAttendanceBuffer = () => {
    updateAttendanceBufferMutation.mutate(attendanceBufferMinutes);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company branding and appearance</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Logo
            </CardTitle>
            <CardDescription>
              Upload your company logo (max 5MB, recommended: 200x200px)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-2">
                <Label htmlFor="logo-upload">Current Logo</Label>
                <div className="border rounded-md p-4 bg-muted/20">
                  {settings?.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt="Company Logo"
                      className="h-32 w-32 object-contain mx-auto"
                      data-testid="img-current-logo"
                    />
                  ) : (
                    <div className="h-32 w-32 flex items-center justify-center mx-auto text-muted-foreground">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
              </div>

              {logoPreview && (
                <div className="flex-1 space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-muted/20">
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      className="h-32 w-32 object-contain mx-auto"
                      data-testid="img-logo-preview"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo-upload">Upload New Logo</Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                data-testid="input-logo-upload"
              />
            </div>

            <Button
              onClick={handleLogoUpload}
              disabled={!logoFile || uploadLogoMutation.isPending}
              data-testid="button-upload-logo"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadLogoMutation.isPending ? "Uploading..." : "Upload Logo"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Favicon
            </CardTitle>
            <CardDescription>
              Upload your favicon (max 1MB, recommended: 32x32px or 64x64px .ico or .png)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-2">
                <Label htmlFor="favicon-upload">Current Favicon</Label>
                <div className="border rounded-md p-4 bg-muted/20">
                  {settings?.faviconUrl ? (
                    <img
                      src={settings.faviconUrl}
                      alt="Favicon"
                      className="h-16 w-16 object-contain mx-auto"
                      data-testid="img-current-favicon"
                    />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center mx-auto text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>

              {faviconPreview && (
                <div className="flex-1 space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-md p-4 bg-muted/20">
                    <img
                      src={faviconPreview}
                      alt="Favicon Preview"
                      className="h-16 w-16 object-contain mx-auto"
                      data-testid="img-favicon-preview"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon-upload">Upload New Favicon</Label>
              <Input
                id="favicon-upload"
                type="file"
                accept="image/*"
                onChange={handleFaviconChange}
                data-testid="input-favicon-upload"
              />
            </div>

            <Button
              onClick={handleFaviconUpload}
              disabled={!faviconFile || uploadFaviconMutation.isPending}
              data-testid="button-upload-favicon"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadFaviconMutation.isPending ? "Uploading..." : "Upload Favicon"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Settings
            </CardTitle>
            <CardDescription>
              Configure attendance tracking settings for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attendance-buffer">
                Clock In/Out Buffer (minutes)
              </Label>
              <p className="text-sm text-muted-foreground">
                Maximum minutes allowance before/after scheduled time
              </p>
              <Input
                id="attendance-buffer"
                type="number"
                min="0"
                max="120"
                value={attendanceBufferMinutes}
                onChange={(e) => setAttendanceBufferMinutes(parseInt(e.target.value) || 0)}
                data-testid="input-attendance-buffer"
              />
              <p className="text-xs text-muted-foreground">
                Current buffer: {attendanceBufferMinutes} minutes (Range: 0-120)
              </p>
            </div>

            <Button
              onClick={handleUpdateAttendanceBuffer}
              disabled={updateAttendanceBufferMutation.isPending}
              data-testid="button-update-buffer"
            >
              {updateAttendanceBufferMutation.isPending ? "Updating..." : "Update Buffer"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
