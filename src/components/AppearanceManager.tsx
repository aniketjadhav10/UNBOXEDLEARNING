import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

export function AppearanceManager() {
  const { user } = useAuth();
  const settings = useSettingsStore();

  // 1. Apply Dark Mode and Language
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  useEffect(() => {
    if (settings.language) {
      document.documentElement.lang = settings.language;
    }
  }, [settings.language]);

  // 2. Sync to DB on auth state change (Load initial)
  useEffect(() => {
    if (!user) return;

    async function loadSettings() {
      try {
         const { data, error } = await supabase
           .from('profiles')
           .select('preferences')
           .eq('id', user?.id)
           .single();
           
         if (error) throw error;
         
         const pref = data?.preferences as any;
         if (pref) {
            // Apply loaded settings to store, avoiding overriding if pref is empty
            if (pref.darkMode !== undefined) settings.setDarkMode(pref.darkMode);
            if (pref.pushNotifications !== undefined) settings.setPushNotifications(pref.pushNotifications);
            if (pref.emailDigests !== undefined) settings.setEmailDigests(pref.emailDigests);
            if (pref.achievementAlerts !== undefined) settings.setAchievementAlerts(pref.achievementAlerts);
            if (pref.language !== undefined) settings.setLanguage(pref.language);
         }
      } catch (err) {
         console.error('Failed to load settings from DB:', err);
      }
    }
    
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3. Sync to DB on settings change
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(async () => {
       try {
         await supabase.from('profiles').update({
            preferences: {
               darkMode: settings.darkMode,
               pushNotifications: settings.pushNotifications,
               emailDigests: settings.emailDigests,
               achievementAlerts: settings.achievementAlerts,
               language: settings.language,
            }
         }).eq('id', user.id);
       } catch (err) {
         console.error('Failed to save settings to DB:', err);
       }
    }, 1000); // Debounce to avoid spamming DB

    return () => clearTimeout(timeoutId);
  }, [
    user, 
    settings.darkMode, 
    settings.pushNotifications, 
    settings.emailDigests, 
    settings.achievementAlerts, 
    settings.language
  ]);

  return null;
}
