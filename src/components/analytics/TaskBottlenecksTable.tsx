import { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AlertTriangle, Clock } from 'lucide-react';

export function TaskBottlenecksTable() {
  const { taskProgress, rawTasks, rawTopics, subjects, kids } = useData();

  const bottlenecks = useMemo(() => {
    // A bottleneck is a task in Needs_Practice OR where learned_count > target_count + 3
    const problematic = taskProgress.filter(p => 
      p.learning_stage === 'Needs_Practice' || 
      (p.learning_stage !== 'Confident' && p.learned_count > p.target_count + 2)
    );

    return problematic.map(p => {
      const task = rawTasks.find(t => t.id === p.task_id);
      const topic = rawTopics.find(t => t.id === task?.topic_id);
      const subject = subjects.find(s => s.id === topic?.subject_id);
      const kid = kids.find(k => k.id === p.child_id);

      return {
        id: p.id,
        taskName: task?.name || 'Unknown',
        subjectName: subject?.name || 'Unknown',
        kidName: kid?.name || 'Unknown',
        stage: p.learning_stage,
        count: p.learned_count,
        target: p.target_count,
      };
    }).sort((a, b) => b.count - a.count).slice(0, 5); // Top 5 worst bottlenecks
  }, [taskProgress, rawTasks, rawTopics, subjects, kids]);

  if (bottlenecks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <p className="text-sm font-semibold">No Bottlenecks!</p>
        <p className="text-xs">Everyone is progressing perfectly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {bottlenecks.map((b) => (
        <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
            <AlertTriangle size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-0.5">
              <p className="text-sm font-bold text-gray-900 truncate pr-2">{b.taskName}</p>
              <span className="text-xs font-bold text-red-600 flex-shrink-0">{b.count} / {b.target} tries</span>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {b.kidName} · {b.subjectName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
