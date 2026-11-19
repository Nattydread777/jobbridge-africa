import { useEffect, useState } from "react";

const STORAGE_KEY = "jobbridge-cookie-preferences";
const defaultPreferences = { essential: true, analytics: false, marketing: false };

const readPreferences = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaultPreferences, ...JSON.parse(stored), essential: true } : null;
  } catch {
    return null;
  }
};

const CookieConsentBanner = () => {
  const [preferences, setPreferences] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    setPreferences(readPreferences());
    const openPreferences = () => {
      setPreferences(readPreferences() || defaultPreferences);
      setShowPreferences(true);
    };
    window.addEventListener("cookie-preferences-open", openPreferences);
    return () => window.removeEventListener("cookie-preferences-open", openPreferences);
  }, []);

  const savePreferences = (nextPreferences) => {
    const normalized = { ...defaultPreferences, ...nextPreferences, essential: true };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      setPreferences(normalized);
      setShowPreferences(false);
    } catch {
      setPreferences(normalized);
      setShowPreferences(false);
    }
  };

  if (preferences && !showPreferences) return null;
  const selectedPreferences = preferences || defaultPreferences;

  return (
    <aside role="dialog" aria-label="Cookie preferences" className="fixed inset-x-0 bottom-0 z-[80] border-t border-slate-300 bg-white p-4 shadow-2xl sm:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <h2 className="font-bold text-slate-900">Cookie preferences</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Essential storage supports sign-in and security. Optional analytics and marketing cookies are off unless you choose them. See our <a href="/cookies" className="font-semibold underline">Cookie Notice</a>.</p>
          {showPreferences && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked disabled /> Essential (always on)</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={selectedPreferences.analytics} onChange={(event) => setPreferences({ ...selectedPreferences, analytics: event.target.checked })} /> Analytics</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={selectedPreferences.marketing} onChange={(event) => setPreferences({ ...selectedPreferences, marketing: event.target.checked })} /> Marketing</label>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => savePreferences(defaultPreferences)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Only necessary</button>
          {!showPreferences ? (
            <button type="button" onClick={() => setShowPreferences(true)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Preferences</button>
          ) : (
            <button type="button" onClick={() => savePreferences(selectedPreferences)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Save choices</button>
          )}
          <button type="button" onClick={() => savePreferences({ essential: true, analytics: true, marketing: true })} className="rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-white hover:bg-terracotta-dark">Accept all</button>
        </div>
      </div>
    </aside>
  );
};

export default CookieConsentBanner;
