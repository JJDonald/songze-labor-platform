import { EvalBar } from './EvalBar';

interface EvalCardProps {
  evalAverage: {
    attitude: number;
    skill: number;
    result: number;
  };
}

export const EvalCard = ({ evalAverage }: EvalCardProps) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-5">
      <h3 className="font-display text-xl mb-4">📊 综合评价</h3>
      <EvalBar label="劳动态度" value={evalAverage.attitude} max={5} />
      <EvalBar label="劳动技能" value={evalAverage.skill} max={5} />
      <EvalBar label="劳动成果" value={evalAverage.result} max={5} />
    </div>
  );
};