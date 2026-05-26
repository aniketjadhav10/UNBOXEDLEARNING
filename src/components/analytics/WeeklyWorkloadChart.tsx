import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useData } from '../../context/DataContext';

export function WeeklyWorkloadChart() {
  const { kids, taskProgress, rawTasks, rawTopics, subjects } = useData();

  const { data, activeSubjects } = useMemo(() => {
    const scheduled = taskProgress.filter(p => p.is_scheduled_this_week);
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    
    // Track which subjects actually have scheduled tasks so we can render Bars dynamically
    const subjectNames = new Set<string>();

    const chartData = kids.map((kid) => {
      const kidScheduled = scheduled.filter(p => p.child_id === kid.id);
      
      const row: any = { name: kid.name };
      
      kidScheduled.forEach(p => {
        const task = rawTasks.find(t => t.id === p.task_id);
        const topic = rawTopics.find(t => t.id === task?.topic_id);
        const subject = subjectMap.get(topic?.subject_id || '');
        
        if (subject) {
          subjectNames.add(subject.name);
          row[subject.name] = (row[subject.name] || 0) + 1;
        }
      });
      
      return row;
    });

    // Map active subject names to their colors
    const activeSubjects = Array.from(subjectNames).map(name => {
      const s = subjects.find(sub => sub.name === name);
      return { name, color: s?.color || '#8b5cf6' };
    });

    return { data: chartData, activeSubjects };
  }, [kids, taskProgress, rawTasks, rawTopics, subjects]);

  if (data.length === 0 || activeSubjects.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-10">No tasks scheduled for this week.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            cursor={{ fill: '#f3f4f6' }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
          {activeSubjects.map((subject, index) => (
            <Bar 
              key={subject.name} 
              dataKey={subject.name} 
              stackId="a" 
              fill={subject.color} 
              radius={
                // Add rounded corners only to the top bar (recharts doesn't handle stacked radii perfectly, but we can try)
                index === activeSubjects.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
