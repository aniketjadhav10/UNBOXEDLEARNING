// ============================================================
// PageTransition — Animated route transitions using Framer Motion
// Wrap <Outlet /> in MainLayout with this for smooth page changes
// ============================================================
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import { useRef } from 'react';

export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

  // Freeze the outlet for AnimatePresence exit animations
  const outletRef = useRef(outlet);
  if (outlet) outletRef.current = outlet;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          type: 'tween',
          ease: [0.25, 0.1, 0.25, 1.0],
          duration: 0.25,
        }}
        className="h-full"
      >
        {outletRef.current}
      </motion.div>
    </AnimatePresence>
  );
}
