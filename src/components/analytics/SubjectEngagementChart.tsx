import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useData } from '../../context/DataContext';

export function SubjectEngagementChart() {
  const { subjects, taskProgress, rawTasks, rawTopics } = useData();

  const data = useMemo(() => {
    const chartData = subjects.map((subject) => {
      const topicIds = rawTopics.filter(t => t.subject_id === subject.id).map(t => t.id);
      const taskIds = rawTasks.filter(t => topicIds.includes(t.topic_id)).map(t => t.id);
      
      const progresses = taskProgress.filter(
        p => taskIds.includes(p.task_id) && typeof p.interest_level === 'number'
      );

      const avgInterest = progresses.length > 0
        ? progresses.reduce((acc, p) => acc + (p.interest_level || 3), 0) / progresses.length
        : 0;

      return {
        name: subject.name,
        interest: Number(avgInterest.toFixed(1)),
        color: subject.color || '#8b5cf6',
      };
    });

    // Sort descending by interest
    return chartData.sort((a, b) => b.interest - a.interest).filter(d => d.interest > 0);
  }, [subjects, taskProgress, rawTasks, rawTopics]);

  if (data.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-10">No engagement data available.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 10, right: 20, bottom: 0, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
          <XAxis type="number" domain={[0, 5]} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
          <Tooltip 
            formatter={(value: any) => [`${value} ★`, 'Avg Interest']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Bar dataKey="interest" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
