import React from 'react';
import { motion } from 'motion/react';

export const VoiceWave: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-0.5 h-4 px-2 w-16">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            height: [4, 16, 4, 8, 4],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
          className="w-0.5 bg-[#a78bfa] rounded-full"
        />
      ))}
    </div>
  );
};
