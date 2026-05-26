// ============================================================
// Motion Wrappers — Reusable Framer Motion animation primitives
// ============================================================
import { motion, type Variants } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

// ── FadeInUp — Spring-powered fade + slide up ────────────────
interface FadeInUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  y?: number;
}

export function FadeInUp({
  children,
  delay = 0,
  duration = 0.5,
  className = '',
  y = 20,
}: FadeInUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay,
        duration,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── StaggerContainer — Staggers children entry ───────────────
const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
}

export function StaggerContainer({ children, className = '' }: StaggerContainerProps) {
  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: StaggerContainerProps) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ── ScaleOnHover — Hover scale + shadow lift, tap press ──────
interface ScaleOnHoverProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function ScaleOnHover({ children, className = '', scale = 1.02 }: ScaleOnHoverProps) {
  return (
    <motion.div
      whileHover={{
        scale,
        transition: { type: 'spring', stiffness: 400, damping: 17 },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── SlideIn — Horizontal slide from left ─────────────────────
interface SlideInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: 'left' | 'right';
}

export function SlideIn({
  children,
  delay = 0,
  className = '',
  direction = 'left',
}: SlideInProps) {
  const x = direction === 'left' ? -24 : 24;
  return (
    <motion.div
      initial={{ opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── AnimatedCounter — Count-up from 0 to target value ────────
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1.2,
  suffix = '',
  prefix = '',
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      // Ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(easedProgress * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
