// ============================================================
// Breadcrumbs — Hierarchical navigation indicator
// ============================================================
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-1 text-xs font-medium text-gray-400 mb-6" aria-label="Breadcrumb">
      <Link
        to="/subjects"
        className="flex items-center hover:text-violet-600 transition-colors"
      >
        <Home size={14} className="mr-1" />
        Curriculum
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-1 text-gray-300" />
          {item.path ? (
            <Link
              to={item.path}
              className="hover:text-violet-600 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-bold">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
