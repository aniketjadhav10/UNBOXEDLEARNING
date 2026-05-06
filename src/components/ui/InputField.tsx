import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: string;
  error?: string;
}

interface InputFieldProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  multiline?: false;
}

interface TextAreaFieldProps extends BaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline: true;
}

export function InputField(props: InputFieldProps | TextAreaFieldProps) {
  const { label, error, className = '', multiline, ...fieldProps } = props;
  const fieldClass =
    'mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-ink outline-none focus:border-moss focus:ring-2 focus:ring-moss/20';

  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      {multiline ? (
        <textarea className={[fieldClass, 'min-h-24 resize-y', className].join(' ')} {...(fieldProps as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input className={[fieldClass, className].join(' ')} {...(fieldProps as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && <span className="mt-1 block text-sm text-red-700">{error}</span>}
    </label>
  );
}
