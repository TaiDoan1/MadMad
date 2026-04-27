import { useEffect, useState } from "react";
import { Save, Upload } from "lucide-react";
import { Link } from "react-router";

import { brandLogo } from "@/assets/images";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";

export function AdminSettingsPage() {
  const { settings, updateSettings } = useStorefrontSettings();
  const [currentLogo, setCurrentLogo] = useState(settings.logo || brandLogo);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeEmail, setStoreEmail] = useState(settings.storeEmail);
  const [storePhone, setStorePhone] = useState(settings.storePhone);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);

  useEffect(() => {
    setCurrentLogo(settings.logo || brandLogo);
    setStoreName(settings.storeName);
    setStoreEmail(settings.storeEmail);
    setStorePhone(settings.storePhone);
    setStoreAddress(settings.storeAddress);
  }, [settings]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreviewLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="mb-2 text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your store settings and branding</p>
      </div>

      <div className="space-y-6 rounded-lg border border-border bg-white p-6">
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">
            Banner + Best Sellers đã được chuyển sang trang riêng.{" "}
            <Link to="/admin/storefront" className="text-primary hover:underline">
              Mở Storefront Settings
            </Link>
            .
          </p>
        </div>

        <div>
          <h3 className="mb-4">Store Logo</h3>
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="flex-1">
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <img src={previewLogo || currentLogo} alt="Store Logo" className="mx-auto mb-4 max-h-32" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-muted p-3">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm">Click to upload new logo</p>
                  </div>
                </label>
                <p className="mt-3 text-xs text-muted-foreground">Khuyến nghị logo: 512x512 hoặc 1024x1024, nền trong suốt (PNG/WebP).</p>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <input value={storeName} onChange={(event) => setStoreName(event.target.value)} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              <input value={storeEmail} onChange={(event) => setStoreEmail(event.target.value)} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              <input value={storePhone} onChange={(event) => setStorePhone(event.target.value)} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              <input value={storeAddress} onChange={(event) => setStoreAddress(event.target.value)} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-6">
          <button
            onClick={() => {
              const nextLogo = previewLogo || currentLogo;
              if (previewLogo) {
                setCurrentLogo(previewLogo);
                setPreviewLogo(null);
              }
              updateSettings({
                logo: nextLogo,
                storeName,
                storeEmail,
                storePhone,
                storeAddress,
              });
              window.alert("Settings saved successfully!");
            }}
            className="flex items-center gap-2 rounded bg-primary px-6 py-2 text-white transition-colors hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
