import { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useData } from '../../context/DataContext';

export function SubjectMasteryChart() {
  const { subjects, taskProgress, rawTasks, rawTopics } = useData();

  const data = useMemo(() => {
    return subjects.map((subject) => {
      // Find all topics for this subject
      const topicIds = rawTopics.filter(t => t.subject_id === subject.id).map(t => t.id);
      // Find all tasks for those topics
      const taskIds = rawTasks.filter(t => topicIds.includes(t.topic_id)).map(t => t.id);
      // Find all progress for those tasks
      const progresses = taskProgress.filter(p => taskIds.includes(p.task_id));

      if (progresses.length === 0) {
        return { subject: subject.name, mastery: 0 };
      }

      const mastered = progresses.filter(p => 
        p.learning_stage === 'Confident' || p.learning_stage === 'Comfortable'
      ).length;

      const masteryPercent = Math.round((mastered / progresses.length) * 100);

      return {
        subject: subject.name,
        mastery: masteryPercent,
      };
    });
  }, [subjects, taskProgress, rawTasks, rawTopics]);

  if (data.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-10">No subject data available.</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Mastery %"
            dataKey="mastery"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.5}
          />
          <Tooltip 
            formatter={(value: any) => [`${value}%`, 'Mastery']}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
