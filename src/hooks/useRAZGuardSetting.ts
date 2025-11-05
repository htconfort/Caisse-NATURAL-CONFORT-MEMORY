import { useEffect, useState } from "react";

export type ShowMode = "always" | "daily";
const LS_KEY = "raz_guard_show_mode";

// ✅ Adapte ici si tu as un service centralisé (ex: SystemSettings)
async function readSettingFromStore(): Promise<ShowMode | null> {
  try {
    const v = localStorage.getItem(LS_KEY);
    return (v === "always" || v === "daily") ? v : null;
  } catch { 
    return null; 
  }
}

async function writeSettingToStore(mode: ShowMode): Promise<void> {
  try { 
    localStorage.setItem(LS_KEY, mode); 
  } catch {
    console.warn('Failed to save RAZ Guard setting');
  }
}

export function useRAZGuardSetting(defaultMode: ShowMode = "daily") {
  const [mode, setMode] = useState<ShowMode>(defaultMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await readSettingFromStore();
      setMode(saved ?? defaultMode);
      setReady(true);
    })();
  }, [defaultMode]);

  const update = async (m: ShowMode) => {
    setMode(m);
    await writeSettingToStore(m);
  };

  return { mode, setMode: update, ready };
}
