import { motion } from 'framer-motion';

interface EvalBarProps {
  label: string;
  value: number;
  max: number;
}

export const EvalBar = ({ label, value, max }: EvalBarProps) => {
  const percentage = (value / max) * 100;

  return (
    <div className="mb-3.5">
      <div className="flex justify-between text-sm mb-1.5">
        <span>{label}</span>
        <span className="font-semibold text-brand-green">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="h-2.5 bg-brand-sand rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-brand-green rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};