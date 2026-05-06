import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90',
  secondary: 'border border-black/10 bg-white text-ink hover:bg-skywash',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  ghost: 'text-ink/70 hover:bg-black/5',
};

export function Button({ children, icon, className = '', variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      ].join(' ')}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
