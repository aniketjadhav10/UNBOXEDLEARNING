import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../../context/DataContext';

const STAGE_COLORS: Record<string, string> = {
  Not_Started: '#9ca3af', // gray-400
  Introduced: '#0891b2', // cyan-600
  Practicing: '#4f46e5', // indigo-600
  Needs_Practice: '#d97706', // amber-600
  Comfortable: '#2563eb', // blue-600
  Confident: '#059669', // emerald-600
};

const STAGE_LABELS: Record<string, string> = {
  Not_Started: 'Not Started',
  Introduced: 'Introduced',
  Practicing: 'Practicing',
  Needs_Practice: 'Needs Practice',
  Comfortable: 'Comfortable',
  Confident: 'Confident',
};

export function LearningStageChart() {
  const { taskProgress } = useData();

  const data = useMemo(() => {
    const counts: Record<string, number> = {
      Not_Started: 0,
      Introduced: 0,
      Practicing: 0,
      Needs_Practice: 0,
      Comfortable: 0,
      Confident: 0,
    };

    taskProgress.forEach((p) => {
      if (counts[p.learning_stage] !== undefined) {
        counts[p.learning_stage]++;
      }
    });

    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        name: STAGE_LABELS[key],
        value: count,
        color: STAGE_COLORS[key],
      }));
  }, [taskProgress]);

  if (data.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-10">No task progress data available.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
