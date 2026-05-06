// Settings Page — App configuration options
import { Bell, Globe, Moon, Palette, Shield, User } from 'lucide-react';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, desc, control }: { icon: React.ElementType; label: string; desc: string; control: React.ReactNode }) {
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

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  return (
    <div className={`w-11 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${defaultOn ? 'bg-violet-600' : 'bg-gray-200'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${defaultOn ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-400 mt-0.5">Manage your app preferences</p>
      </div>

      <SettingsSection title="Account">
        <SettingsRow icon={User} label="Profile" desc="Update your name, email, and avatar" control={<button className="text-xs text-violet-600 font-semibold">Edit</button>} />
        <SettingsRow icon={Shield} label="Password" desc="Change your account password" control={<button className="text-xs text-violet-600 font-semibold">Change</button>} />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <SettingsRow icon={Bell} label="Push Notifications" desc="Get alerts for due activities" control={<Toggle defaultOn />} />
        <SettingsRow icon={Bell} label="Email Digests" desc="Weekly progress summary emails" control={<Toggle />} />
        <SettingsRow icon={Bell} label="Achievement Alerts" desc="Notify when a kid earns an achievement" control={<Toggle defaultOn />} />
      </SettingsSection>

      <SettingsSection title="Appearance">
        <SettingsRow icon={Moon} label="Dark Mode" desc="Switch to dark theme" control={<Toggle />} />
        <SettingsRow icon={Palette} label="Accent Color" desc="Choose your brand color" control={
          <div className="flex gap-1.5">
            {['bg-violet-600', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'].map((c) => (
              <div key={c} className={`w-5 h-5 rounded-full ${c} cursor-pointer ring-2 ${c === 'bg-violet-600' ? 'ring-offset-1 ring-violet-400' : 'ring-transparent'}`} />
            ))}
          </div>
        } />
      </SettingsSection>

      <SettingsSection title="Region">
        <SettingsRow icon={Globe} label="Language" desc="App display language" control={
          <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-400 bg-white">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
        } />
      </SettingsSection>

      <div className="pt-2">
        <button className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors border border-red-100">
          Sign Out
        </button>
      </div>
    </div>
  );
}
