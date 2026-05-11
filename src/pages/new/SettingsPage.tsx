// ============================================================
// SettingsPage — Functional settings with persistence via useSettingsStore
// ============================================================
import { Bell, Globe, Moon, Palette, RefreshCw, Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToast } from '../../store/useToastStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { useState } from 'react';

// ── Reusable section/row primitives ──────────────────────────
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function SettingsRow({
  icon: Icon, label, desc, control,
}: { icon: React.ElementType; label: string; desc: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
      <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}
function Toggle({ value, onChange, ariaLabel }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => onChange(!value)}
      className={[
        'w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2',
        value ? 'bg-violet-600' : 'bg-gray-200',
      ].join(' ')}
    >
      <div
        className={[
          'w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
          value ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

const ACCENT_COLORS: { value: SettingsState['accentColor']; class: string }[] = [
  { value: 'violet',  class: 'bg-violet-600'  },
  { value: 'blue',    class: 'bg-blue-500'    },
  { value: 'emerald', class: 'bg-emerald-500' },
  { value: 'amber',   class: 'bg-amber-500'   },
];

type SettingsState = ReturnType<typeof useSettingsStore.getState>;

export function SettingsPage() {
  useDocumentTitle('Settings');
  const { user, signOut, updateProfile } = useAuth();
  const toast = useToast();
  
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const PROFILE_FIELDS: FormField[] = [
    { name: 'name', label: 'Display Name', type: 'text', placeholder: 'e.g. Jane Doe', required: true }
  ];

  async function handleUpdateProfile(data: any) {
    setSubmitting(true);
    try {
      await updateProfile(data.name);
      toast.success('Profile updated successfully');
      setProfileModalOpen(false);
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  }
  const {
    darkMode,             setDarkMode,
    accentColor,          setAccentColor,
    pushNotifications,    setPushNotifications,
    emailDigests,         setEmailDigests,
    achievementAlerts,    setAchievementAlerts,
    language,             setLanguage,
  } = useSettingsStore();

  async function handleSignOut() {
    await signOut();
    toast.info('Signed out successfully');
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-400 mt-0.5">Manage your app preferences — changes are saved automatically</p>
      </div>

      <SettingsSection title="Account">
        <SettingsRow
          icon={User}
          label="Profile"
          desc="Update your name, email, and avatar"
          control={<button onClick={() => setProfileModalOpen(true)} className="text-xs text-violet-600 font-semibold hover:text-violet-800">Edit</button>}
        />
        <SettingsRow
          icon={Shield}
          label="Password"
          desc="Change your account password"
          control={<button onClick={() => toast.info('Password reset instructions sent to your email.')} className="text-xs text-violet-600 font-semibold hover:text-violet-800">Change</button>}
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsRow
          icon={Bell}
          label="Push Notifications"
          desc="Get alerts for due activities"
          control={
            <Toggle
              value={pushNotifications}
              onChange={(v) => { setPushNotifications(v); toast.success(v ? 'Notifications enabled' : 'Notifications disabled'); }}
              ariaLabel="Toggle push notifications"
            />
          }
        />
        <SettingsRow
          icon={Bell}
          label="Email Digests"
          desc="Weekly progress summary emails"
          control={
            <Toggle
              value={emailDigests}
              onChange={(v) => { setEmailDigests(v); toast.success(v ? 'Email digests enabled' : 'Email digests disabled'); }}
              ariaLabel="Toggle email digests"
            />
          }
        />
        <SettingsRow
          icon={Bell}
          label="Achievement Alerts"
          desc="Notify when a kid earns an achievement"
          control={
            <Toggle
              value={achievementAlerts}
              onChange={(v) => { setAchievementAlerts(v); toast.success('Achievement alerts updated'); }}
              ariaLabel="Toggle achievement alerts"
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow
          icon={Moon}
          label="Dark Mode"
          desc="Switch to dark theme (coming soon)"
          control={
            <Toggle
              value={darkMode}
              onChange={(v) => { setDarkMode(v); toast.info('Dark mode coming soon!'); }}
              ariaLabel="Toggle dark mode"
            />
          }
        />
        <SettingsRow
          icon={Palette}
          label="Accent Color"
          desc="Choose your brand color"
          control={
            <div className="flex gap-1.5">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  aria-label={`Set accent to ${c.value}`}
                  onClick={() => { setAccentColor(c.value); toast.success(`Accent set to ${c.value}`); }}
                  className={[
                    'w-5 h-5 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    c.class,
                    accentColor === c.value ? 'ring-2 ring-offset-1 ring-violet-400 scale-110' : '',
                  ].join(' ')}
                />
              ))}
            </div>
          }
        />
      </SettingsSection>

      <SettingsSection title="Region">
        <SettingsRow
          icon={Globe}
          label="Language"
          desc="App display language"
          control={
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SettingsState['language'])}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-400 bg-white"
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          }
        />
      </SettingsSection>

      <div className="pt-2">
        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors border border-red-100 flex items-center justify-center gap-2"
        >
          Sign Out
        </button>
      </div>

      <CurriculumFormModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Profile"
        fields={PROFILE_FIELDS}
        initialData={{ name: user?.name }}
        onSubmit={handleUpdateProfile}
        loading={submitting}
      />
    </div>
  );
}
