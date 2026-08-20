// Reports Page — real data from DataContext
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

// Analytics Components
import { LearningStageChart } from '../../components/analytics/LearningStageChart';
import { SubjectMasteryChart } from '../../components/analytics/SubjectMasteryChart';
import { InterestVsDifficultyChart } from '../../components/analytics/InterestVsDifficultyChart';
import { WeeklyWorkloadChart } from '../../components/analytics/WeeklyWorkloadChart';
import { SubjectEngagementChart } from '../../components/analytics/SubjectEngagementChart';
import { ConsistencyHeatmap } from '../../components/analytics/ConsistencyHeatmap';
import { TaskBottlenecksTable } from '../../components/analytics/TaskBottlenecksTable';
import { FadeInUp, StaggerContainer, StaggerItem, ScaleOnHover } from '../../components/motion/MotionWrappers';

export function ReportsPage() {
  const { kids, subjects, topics, loading, error, refresh } = useData();

  const avgOverall = kids.length > 0
    ? Math.round(kids.reduce((a, k) => a + k.progress.overall, 0) / kids.length)
    : 0;
  const topKid = [...kids].sort((a, b) => b.progress.overall - a.progress.overall)[0];
  const completedTopics = topics.filter((t) => t.completed).length;

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      {[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-32" />)}
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={refresh} className="px-4 py-2 bg-violet-600 text-white text-sm rounded-xl">Retry</button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">Comprehensive overview of family progress and engagement</p>
        </div>
        <button onClick={refresh} className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Summary cards */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Family Average',   value: `${avgOverall}%`,                      icon: TrendingUp, bg: 'bg-violet-600', desc: 'Overall progress'  },
          { label: 'Top Performer',    value: topKid?.name.split(' ')[0] ?? '—',      icon: BarChart3,  bg: 'bg-emerald-500', desc: 'Highest progress' },
          { label: 'Topics Completed', value: `${completedTopics}/${topics.length}`,  icon: BarChart3,  bg: 'bg-amber-500',   desc: 'Across curriculum'},
        ].map(({ label, value, icon: Icon, bg, desc }) => (
          <StaggerItem key={label}>
            <ScaleOnHover>
              <div className={`${bg} rounded-2xl p-5 text-white shadow-sm`}>
                <Icon size={20} className="mb-3 opacity-80" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm font-semibold mt-0.5">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">{desc}</p>
              </div>
            </ScaleOnHover>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {kids.length > 0 ? (
        <>
          {/* Row 1: Heatmap & Workload */}
          <FadeInUp delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5 lg:col-span-1 hover:shadow-card-hover transition-shadow duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-2">Practice Consistency</h3>
              <ConsistencyHeatmap />
            </div>
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5 lg:col-span-2 hover:shadow-card-hover transition-shadow duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-2">Weekly Scheduled Workload</h3>
              <WeeklyWorkloadChart />
            </div>
          </div>
          </FadeInUp>

          {/* Row 2: Doughnut & Radar */}
          <FadeInUp delay={0.2}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5 hover:shadow-card-hover transition-shadow duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-2">Learning Stage Distribution</h3>
              <LearningStageChart />
            </div>
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5 hover:shadow-card-hover transition-shadow duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-2">Subject Mastery Profile</h3>
              <SubjectMasteryChart />
            </div>
          </div>
          </FadeInUp>

          {/* Row 3: Engagement & Scatter */}
          <FadeInUp delay={0.3}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5 hover:shadow-card-hover transition-shadow duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-2">Subject Engagement Ranking</h3>
              <SubjectEngagementChart />
            </div>
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5 hover:shadow-card-hover transition-shadow duration-300">
              <h3 className="text-base font-bold text-gray-900 mb-2">Interest vs Difficulty Analysis</h3>
              <InterestVsDifficultyChart />
            </div>
          </div>
          </FadeInUp>

          {/* Row 4: Bottlenecks & Legacy Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Task Bottlenecks (Needs Practice)</h3>
              <TaskBottlenecksTable />
            </div>
            <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">Kids Progress Overview</h3>
              <div className="space-y-5">
                {[...kids].sort((a, b) => b.progress.overall - a.progress.overall).map((kid) => (
                  <div key={kid.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kid.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                          {kid.avatarInitials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{kid.name}</p>
                          <p className="text-xs text-gray-400">{kid.grade}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-violet-600">{kid.progress.overall}%</span>
                    </div>
                    <ProgressBar value={kid.progress.overall} size="md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Empty state */}
      {kids.length === 0 && subjects.length === 0 && (
        <div className="text-center py-16">
          <BarChart3 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No data to report yet. Add kids and subjects first.</p>
        </div>
      )}
    </div>
  );
}

