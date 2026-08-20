import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertCircle, CalendarClock, CheckCircle2,
  Mail, RefreshCw, Save, SendHorizonal, ServerCrash, X, Loader2,
} from 'lucide-react';
import { CronExpressionParser } from 'cron-parser';
import { fetchEmailLogs } from '../../services/emailLogService';
import { fetchSystemSetting, upsertSystemSetting } from '../../services/settingsService';
import type { DbEmailLog } from '../../types/database';

// ── Types ────────────────────────────────────────────────────────
interface EmailTemplate {
  id: string;
  label: string;
  endpoint: string;
  color: string;
  gradient: string;
  iconColor: string;
  description: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'daily-agenda',
    label: 'Daily Agenda',
    endpoint: '/api/cron/daily-agenda',
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-600',
    description: '☀️ Sends today\'s scheduled activities to your inbox.',
  },
  {
    id: 'evening-report',
    label: 'Evening Report',
    endpoint: '/api/cron/evening-report',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    iconColor: 'text-violet-600',
    description: '📚 Sends learned vs pending task progress for today.',
  },
  {
    id: 'weekly-report',
    label: 'Weekly Report',
    endpoint: '/api/cron/weekly-report',
    color: 'pink',
    gradient: 'from-pink-500 to-rose-500',
    iconColor: 'text-pink-600',
    description: '🎉 Sends a weekly summary of activities and achievements.',
  },
  {
    id: 'weekly-planner',
    label: 'Weekly Planner',
    endpoint: '/api/cron/weekly-planner',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-600',
    description: '📅 Sends a print-ready weekly activity plan for each child.',
  },
];

// ── Toast ─────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' }

// ── Secret Modal ──────────────────────────────────────────────────
function SecretModal({
  template,
  onClose,
  onSuccess,
}: {
  template: EmailTemplate;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    if (!secret.trim()) {
      setError('Please enter your CRON_SECRET.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${template.endpoint}?force=true&secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (res.ok) {
        onSuccess(data.message || 'Email sent successfully!');
        onClose();
      } else {
        setError(data.error || 'An unexpected error occurred.');
      }
    } catch (e: any) {
      setError(e.message || 'Network error. Is the dev server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${template.gradient} flex items-center justify-center shadow-md`}>
              <SendHorizonal size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Send {template.label}</h3>
              <p className="text-xs text-gray-400">{template.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-xl hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Input */}
        <label className="block mb-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
          CRON_SECRET
        </label>
        <input
          ref={inputRef}
          type="password"
          value={secret}
          onChange={(e) => { setSecret(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Enter your secret key..."
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-gray-50 mb-3 font-mono"
        />
        <p className="text-xs text-gray-400 mb-4">
          Set as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">CRON_SECRET</code> in your <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">.env.local</code> file.
        </p>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-sm mb-4">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r ${template.gradient} hover:opacity-90 transition-opacity disabled:opacity-60 shadow-md`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <SendHorizonal size={15} />}
            {loading ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export function EmailLogsPage() {
  const [logs, setLogs] = useState<DbEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [cronExpression, setCronExpression] = useState('0 17 * * *');
  const [isSavingCron, setIsSavingCron] = useState(false);
  const [cronSavedMsg, setCronSavedMsg] = useState('');

  const [activeModal, setActiveModal] = useState<EmailTemplate | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  // ── Helpers ───────────────────────────────────────────────────
  function addToast(message: string, type: 'success' | 'error') {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [logsData, cronSetting] = await Promise.all([
        fetchEmailLogs(),
        fetchSystemSetting('daily_email_cron'),
      ]);
      setLogs(logsData);
      if (cronSetting) setCronExpression(cronSetting);
    } catch (err: any) {
      setError(err.message || 'Failed to load email logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSaveCron() {
    setIsSavingCron(true);
    setCronSavedMsg('');
    try {
      await upsertSystemSetting('daily_email_cron', cronExpression);
      setCronSavedMsg('Saved!');
      addToast('Cron schedule saved successfully!', 'success');
      setTimeout(() => setCronSavedMsg(''), 3000);
    } catch (err: any) {
      addToast(`Failed to save: ${err.message}`, 'error');
    } finally {
      setIsSavingCron(false);
    }
  }

  const lastRun = logs[0];
  const isHealthy = lastRun?.status === 'success';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Toast Stack ── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium pointer-events-auto animate-fade-in max-w-sm ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── Secret Modal ── */}
      {activeModal && (
        <SecretModal
          template={activeModal}
          onClose={() => setActiveModal(null)}
          onSuccess={(msg) => {
            addToast(msg, 'success');
            setTimeout(() => loadData(true), 1500);
          }}
        />
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Mail size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email & System Logs</h1>
          <p className="text-gray-500 text-sm">Monitor and manually trigger automated email reports.</p>
        </div>
      </div>

      {/* ── Status Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Cron Schedule */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-md">
              <CalendarClock size={18} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Evening Report Schedule (UTC)</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="0 17 * * *"
            />
            <button
              onClick={handleSaveCron}
              disabled={isSavingCron}
              className="flex-shrink-0 bg-gradient-to-r from-violet-500 to-indigo-600 hover:opacity-90 text-white p-2 rounded-lg transition-opacity disabled:opacity-50 shadow-sm"
              title="Save Cron Schedule"
            >
              {isSavingCron ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${
              (() => { try { CronExpressionParser.parse(cronExpression); return 'text-gray-400'; } catch { return 'text-red-500'; } })()
            }`}>
              {(() => { try { return `Next: ${CronExpressionParser.parse(cronExpression, { tz: 'UTC' }).next().toDate().toLocaleString()}`; } catch { return 'Invalid cron expression'; } })()}
            </p>
            {cronSavedMsg && <p className="text-xs text-emerald-600 font-semibold">{cronSavedMsg}</p>}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${isHealthy ? 'from-emerald-400 to-teal-500' : 'from-red-400 to-rose-500'}`}>
            {isHealthy ? <CheckCircle2 size={18} className="text-white" /> : <ServerCrash size={18} className="text-white" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Last Run Status</p>
            <p className={`text-lg font-bold mt-0.5 ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>
              {lastRun ? (isHealthy ? '✅ Healthy' : '❌ Failed') : '⏳ No Runs Yet'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {lastRun ? new Date(lastRun.sent_at).toLocaleString() : 'Run a test to get started'}
            </p>
          </div>
        </div>

        {/* Total Runs */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-md">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Total Recorded Runs</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{logs.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">In database history</p>
          </div>
        </div>
      </div>

      {/* ── Email Template Trigger Cards ── */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">Manual Email Triggers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {EMAIL_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setActiveModal(tpl)}
              className="group relative bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 text-left overflow-hidden"
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tpl.gradient} rounded-t-2xl`} />
              <div className="flex items-start gap-3 mt-1">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tpl.gradient} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <SendHorizonal size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 group-hover:text-gray-900">{tpl.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug">{tpl.description}</p>
                </div>
              </div>
              <div className={`mt-3 text-xs font-semibold bg-gradient-to-r ${tpl.gradient} bg-clip-text text-transparent`}>
                Click to Send →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Execution History Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <h2 className="font-bold text-gray-900">Execution History</h2>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors border border-violet-100"
          >
            {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 skeleton-shimmer rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} className="text-red-400" />
            </div>
            <p className="text-red-600 font-semibold">{error}</p>
            <p className="text-sm text-gray-400 mt-1">Did you run the SQL to create the <code>email_logs</code> table?</p>
            <button
              onClick={() => loadData()}
              className="mt-4 px-5 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md"
            >
              Try Again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail size={26} className="text-violet-300" />
            </div>
            <p className="text-gray-600 font-semibold">No email logs yet</p>
            <p className="text-sm text-gray-400 mt-1">Trigger an email above to see logs appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wide">
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date & Time</th>
                  <th className="px-6 py-3">Recipient</th>
                  <th className="px-6 py-3">Tasks (Sent / Pending)</th>
                  <th className="px-6 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-violet-50/30 transition-colors">
                    <td className="px-6 py-3.5">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                          <CheckCircle2 size={11} /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-red-50 to-rose-50 text-red-700 text-xs font-semibold border border-red-100">
                          <AlertCircle size={11} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-gray-700 font-medium text-xs">
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 text-gray-500 text-xs">{log.recipient || '—'}</td>
                    <td className="px-6 py-3.5 text-xs">
                      <span className="text-emerald-600 font-bold">{log.tasks_learned_count ?? 0}</span>
                      <span className="text-gray-300 mx-1.5">/</span>
                      <span className="text-amber-500 font-bold">{log.tasks_pending_count ?? 0}</span>
                    </td>
                    <td className="px-6 py-3.5 text-red-400 text-xs max-w-[180px] truncate" title={log.error_message || ''}>
                      {log.error_message || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
