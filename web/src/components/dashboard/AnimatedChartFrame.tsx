import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnimatedChartFrameProps {
  pageKey: string;
  direction: 1 | -1 | 0;
  children: ReactNode;
}

const AnimatedChartFrame: React.FC<AnimatedChartFrameProps> = ({
  pageKey,
  direction,
  children,
}) => {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={direction === 0 ? false : { x: direction * 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: direction * -60, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedChartFrame;
