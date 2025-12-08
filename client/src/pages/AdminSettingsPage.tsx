import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Building2, Image as ImageIcon, Clock, Mail, QrCode } from "lucide-react";
import type { CompanySettings } from "@shared/schema";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [attendanceBufferMinutes, setAttendanceBufferMinutes] = useState<number>(15);
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [appUrl, setAppUrl] = useState<string>("https://app.nexahrms.com");

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/company/settings"],
  });

  // Update state when settings change
  useEffect(() => {
    if (settings?.attendanceBufferMinutes !== undefined) {
      setAttendanceBufferMinutes(settings.attendanceBufferMinutes);
    }
    if (settings?.senderEmail) {
      setSenderEmail(settings.senderEmail);
    }
    if (settings?.senderName) {
      setSenderName(settings.senderName);
    }
    if (settings?.appUrl) {
      setAppUrl(settings.appUrl);
    }
  }, [settings]);

  const { data: qrCodeData, isLoading: qrLoading, error: qrError } = useQuery<{ qrCode: string; appUrl: string }>({
    queryKey: ["/api/admin/qr-code"],
  });

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

  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (data: { senderEmail?: string; senderName?: string; appUrl?: string }) => {
      await apiRequest("PUT", "/api/company/email-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/qr-code"] });
      toast({
        title: "Success",
        description: "Email settings updated successfully",
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

  const handleUpdateEmailSettings = () => {
    updateEmailSettingsMutation.mutate({
      senderEmail: senderEmail || undefined,
      senderName: senderName || undefined,
      appUrl: appUrl || undefined,
    });
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
            <CardDescription>
              Configure sender information for welcome emails to employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sender-email">Sender Email</Label>
                <Input
                  id="sender-email"
                  type="email"
                  placeholder="hr@company.com"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  data-testid="input-sender-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender-name">Sender Name</Label>
                <Input
                  id="sender-name"
                  type="text"
                  placeholder="HR Department"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  data-testid="input-sender-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-url">App URL (for QR Code)</Label>
              <Input
                id="app-url"
                type="url"
                placeholder="https://app.nexahrms.com"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                data-testid="input-app-url"
              />
              <p className="text-xs text-muted-foreground">
                This URL will be embedded in the QR code sent to employees
              </p>
            </div>
            <Button
              onClick={handleUpdateEmailSettings}
              disabled={updateEmailSettingsMutation.isPending}
              data-testid="button-update-email-settings"
            >
              {updateEmailSettingsMutation.isPending ? "Updating..." : "Update Email Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              App QR Code Preview
            </CardTitle>
            <CardDescription>
              This QR code will be included in welcome emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {qrLoading ? (
                <div className="w-48 h-48 flex items-center justify-center border rounded-lg bg-muted/20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : qrError ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center border rounded-lg bg-destructive/10 text-destructive">
                  <QrCode className="h-12 w-12 mb-2" />
                  <p className="text-sm">Failed to load QR code</p>
                </div>
              ) : qrCodeData?.qrCode ? (
                <>
                  <img
                    src={qrCodeData.qrCode}
                    alt="App QR Code"
                    className="w-48 h-48"
                    data-testid="img-qr-code"
                  />
                  <p className="text-sm text-muted-foreground">
                    Scans to: {qrCodeData.appUrl}
                  </p>
                </>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center border rounded-lg bg-muted/20">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
