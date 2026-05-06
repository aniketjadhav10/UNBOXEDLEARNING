import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectDropdownProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

export function SelectDropdown({ label, options, placeholder = 'Select', className = '', ...props }: SelectDropdownProps) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        className={[
          'mt-1 w-full rounded-md border border-black/15 bg-white px-3 py-2 text-ink outline-none focus:border-moss focus:ring-2 focus:ring-moss/20',
          className,
        ].join(' ')}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
