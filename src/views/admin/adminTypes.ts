import type { FieldConfig } from '../../components/Form/AdminForm';
import type { TableName } from '../../services/supabaseService';

export interface AdminResourceConfig {
  table: TableName;
  title: string;
  description: string;
  fields: FieldConfig[];
  searchFields: string[];
  filters?: {
    name: string;
    label: string;
    options: { label: string; value: string }[];
  }[];
  renderCard: (item: Record<string, unknown>, lookups: AdminLookups) => {
    title: string;
    subtitle?: string;
    badges: string[];
    meta?: string;
  };
}

export interface AdminLookups {
  children: Record<string, string>;
  subjects: Record<string, string>;
  topics: Record<string, string>;
  tasks: Record<string, string>;
}
