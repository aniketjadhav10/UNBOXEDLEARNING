// ============================================================
// store/useSettingsStore.ts — Persistent app settings via localStorage
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Appearance
  darkMode: boolean;
  accentColor: 'violet' | 'blue' | 'emerald' | 'amber';
  // Notifications
  pushNotifications: boolean;
  emailDigests: boolean;
  achievementAlerts: boolean;
  // Region
  language: 'en' | 'es' | 'fr';
  // Homeschool
  selectedChildId: string | null;
  // Actions
  setDarkMode:          (v: boolean) => void;
  setAccentColor:       (v: SettingsState['accentColor']) => void;
  setPushNotifications: (v: boolean) => void;
  setEmailDigests:      (v: boolean) => void;
  setAchievementAlerts: (v: boolean) => void;
  setLanguage:          (v: SettingsState['language']) => void;
  setSelectedChildId:   (id: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode:             false,
      accentColor:          'violet',
      pushNotifications:    true,
      emailDigests:         false,
      achievementAlerts:    true,
      language:             'en',
      selectedChildId:      null,
      setDarkMode:          (darkMode) => set({ darkMode }),
      setAccentColor:       (accentColor) => set({ accentColor }),
      setPushNotifications: (pushNotifications) => set({ pushNotifications }),
      setEmailDigests:      (emailDigests) => set({ emailDigests }),
      setAchievementAlerts: (achievementAlerts) => set({ achievementAlerts }),
      setLanguage:          (language) => set({ language }),
      setSelectedChildId:   (selectedChildId) => set({ selectedChildId }),
    }),
    {
      name: 'unboxed-settings', // localStorage key
    }
  )
);
