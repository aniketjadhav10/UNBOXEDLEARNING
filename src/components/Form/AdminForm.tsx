import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '../UI/Button';
import { InputField } from '../UI/InputField';
import { SelectDropdown, type SelectOption } from '../UI/SelectDropdown';

export type FieldConfig = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'boolean' | 'json';
  required?: boolean;
  options?: SelectOption[];
};

interface AdminFormProps {
  fields: FieldConfig[];
  initialValues?: Record<string, unknown> | null;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
  submitLabel: string;
}

export function AdminForm({ fields, initialValues, onCancel, onSubmit, submitLabel }: AdminFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const nextValues = fields.reduce<Record<string, unknown>>((acc, field) => {
      acc[field.name] = initialValues?.[field.name] ?? (field.type === 'boolean' ? false : '');
      return acc;
    }, {});
    setValues(nextValues);
  }, [fields, initialValues]);

  function handleChange(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = fields.reduce<Record<string, unknown>>((acc, field) => {
      const value = values[field.name];
      if (field.type === 'number') {
        acc[field.name] = value === '' ? null : Number(value);
      } else if (field.type === 'json' && typeof value === 'string') {
        acc[field.name] = value ? JSON.parse(value) : {};
      } else {
        acc[field.name] = value;
      }
      return acc;
    }, {});
    onSubmit(normalized);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {fields.map((field) => {
        const value = values[field.name];

        if (field.type === 'select') {
          return (
            <SelectDropdown
              key={field.name}
              label={field.label}
              onChange={(event) => handleChange(field.name, event.target.value)}
              options={field.options ?? []}
              required={field.required}
              value={String(value ?? '')}
            />
          );
        }

        if (field.type === 'boolean') {
          return (
            <label key={field.name} className="flex items-center justify-between gap-4 rounded-md border border-black/10 p-3">
              <span className="text-sm font-medium text-ink">{field.label}</span>
              <input
                checked={Boolean(value)}
                className="h-5 w-5 accent-moss"
                onChange={(event) => handleChange(field.name, event.target.checked)}
                type="checkbox"
              />
            </label>
          );
        }

        return (
          <InputField
            key={field.name}
            label={field.label}
            multiline={field.type === 'textarea' || field.type === 'json'}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              handleChange(field.name, event.target.value)
            }
            required={field.required}
            type={field.type === 'number' ? 'number' : 'text'}
            value={
              field.type === 'json' && typeof value !== 'string'
                ? JSON.stringify(value ?? {}, null, 2)
                : String(value ?? '')
            }
          />
        );
      })}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
