// ============================================================
// CurriculumFormModal — Generic modal for Add/Edit operations
// ============================================================
import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface CurriculumFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  loading?: boolean;
}

export function CurriculumFormModal({
  isOpen,
  onClose,
  title,
  fields,
  initialData,
  onSubmit,
  loading: externalLoading,
}: CurriculumFormModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({});
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error('Form submission error:', err);
    } finally {
      setLoading(false);
    }
  }

  const isLoading = loading || externalLoading;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <form
          onSubmit={handleSubmit}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl pointer-events-auto overflow-hidden animate-slide-in"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Fields */}
          <div className="p-6 space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                
                {field.type === 'textarea' ? (
                  <textarea
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all resize-none"
                  />
                ) : field.type === 'select' ? (
                  <select
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all appearance-none"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50 transition-all"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Save size={16} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
