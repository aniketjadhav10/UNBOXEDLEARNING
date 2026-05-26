import { useMemo } from 'react';
import { useData } from '../../context/DataContext';

export function ConsistencyHeatmap() {
  const { taskProgress } = useData();

  const { days, streak } = useMemo(() => {
    // Generate the last 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));
      return d;
    });

    // Map practice dates
    const practiceMap = new Map<string, number>();
    taskProgress.forEach(p => {
      if (p.last_practiced_at) {
        const d = new Date(p.last_practiced_at);
        const dateStr = d.toISOString().split('T')[0];
        practiceMap.set(dateStr, (practiceMap.get(dateStr) || 0) + 1);
      }
    });

    const dayData = dates.map(d => {
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        count: practiceMap.get(dateStr) || 0,
      };
    });

    // Calculate current streak
    let currentStreak = 0;
    for (let i = dayData.length - 1; i >= 0; i--) {
      if (dayData[i].count > 0) {
        currentStreak++;
      } else {
        // If today is 0, check yesterday. If yesterday is 0, streak broken.
        if (i === dayData.length - 1) continue; // Allow today to be 0 without breaking yesterday's streak
        break;
      }
    }

    return { days: dayData, streak: currentStreak };
  }, [taskProgress]);

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-gray-100 border-gray-200/50';
    if (count <= 2) return 'bg-emerald-200 border-emerald-300';
    if (count <= 5) return 'bg-emerald-400 border-emerald-500';
    return 'bg-emerald-600 border-emerald-700';
  };

  return (
    <div className="w-full h-full flex flex-col justify-between pt-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-500">Last 30 Days</p>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-lg text-orange-600 font-bold text-xs border border-orange-100">
          <span>🔥</span> {streak} Day Streak
        </div>
      </div>
      
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5 sm:gap-2 justify-items-center">
        {days.map((day, i) => (
          <div
            key={day.date}
            title={`${day.count} tasks on ${day.date}`}
            className={`w-full aspect-square rounded-sm border ${getIntensityClass(day.count)} transition-all hover:scale-110 cursor-help ${i < 15 ? 'hidden sm:block' : ''}`}
          />
        ))}
      </div>
      
      <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-gray-400 font-medium">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-gray-100"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-200"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></div>
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></div>
        <span>More</span>
      </div>
    </div>
  );
}
