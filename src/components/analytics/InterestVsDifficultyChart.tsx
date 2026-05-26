import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useData } from '../../context/DataContext';

export function InterestVsDifficultyChart() {
  const { tasks, taskProgress } = useData();

  const data = useMemo(() => {
    const points: Record<string, { x: number; y: number; z: number; name: string }> = {};

    taskProgress.forEach((p) => {
      const task = tasks.find(t => t.id === p.task_id);
      if (!task || !p.interest_level) return;

      const diff = task.difficulty.toLowerCase();
      let x = 1; // Beginner
      let diffName = 'Beginner';
      if (diff.includes('inter') || diff.includes('med')) { x = 2; diffName = 'Intermediate'; }
      if (diff.includes('adv') || diff.includes('hard')) { x = 3; diffName = 'Advanced'; }

      const y = p.interest_level;
      const key = `${x}-${y}`;

      if (!points[key]) {
        points[key] = { x, y, z: 0, name: diffName };
      }
      points[key].z += 1;
    });

    return Object.values(points);
  }, [tasks, taskProgress]);

  if (data.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-10">Not enough interest data available.</div>;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm">
          <p className="font-bold text-gray-800">{data.name} Difficulty</p>
          <p className="text-gray-600">Interest Level: {data.y} ★</p>
          <p className="text-violet-600 font-semibold mt-1">{data.z} Task{data.z !== 1 ? 's' : ''}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Difficulty" 
            domain={[0, 4]} 
            ticks={[1, 2, 3]} 
            tickFormatter={(val) => val === 1 ? 'Beginner' : val === 2 ? 'Intermediate' : val === 3 ? 'Advanced' : ''}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Interest" 
            domain={[0, 6]} 
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Count" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
          <Scatter name="Tasks" data={data} fill="#f59e0b" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
