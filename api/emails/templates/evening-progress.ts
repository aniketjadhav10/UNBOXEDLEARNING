export interface TaskData {
  name: string;
  isOverdue?: boolean;
  progress?: { learning_stage?: string };
}

export function renderEveningProgressEmail(learnedToday: TaskData[], pending: TaskData[], overdue: TaskData[]) {
  return `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
        <h1 style="color: #6d28d9; text-align: center;">Daily Learning Progress 📚</h1>
        <p style="text-align: center; color: #666;">Here's the summary of today's homeschool tasks.</p>
        
        <div style="display: flex; justify-content: space-between; margin: 30px 0;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 10px; width: 30%; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #10b981;">${learnedToday.length}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Learned Today</div>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 10px; width: 30%; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${pending.length}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Pending</div>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 10px; width: 30%; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${overdue.length}</div>
            <div style="font-size: 12px; color: #666; text-transform: uppercase;">Overdue</div>
          </div>
        </div>

        ${learnedToday.length > 0 ? `
          <h3 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 5px;">✅ Mastered / Learned Today</h3>
          <ul style="list-style: none; padding-left: 0;">
            ${learnedToday.map(t => `
              <li style="padding: 10px; border-radius: 8px; background: #ecfdf5; margin-bottom: 8px; border-left: 4px solid #10b981;">
                <strong>${t.name}</strong> 
                <span style="font-size: 12px; color: #059669; float: right;">Stage: ${t.progress?.learning_stage?.replace('_', ' ') || 'Unknown'}</span>
              </li>
            `).join('')}
          </ul>
        ` : ''}

        ${pending.length > 0 ? `
          <h3 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">⏳ Pending Tasks</h3>
          <ul style="list-style: none; padding-left: 0;">
            ${pending.map(t => `
              <li style="padding: 10px; border-radius: 8px; background: ${t.isOverdue ? '#fef2f2' : '#fffbeb'}; margin-bottom: 8px; border-left: 4px solid ${t.isOverdue ? '#ef4444' : '#f59e0b'};">
                <strong>${t.name}</strong>
                ${t.isOverdue ? '<span style="font-size: 12px; color: #ef4444; float: right; font-weight: bold;">OVERDUE</span>' : ''}
              </li>
            `).join('')}
          </ul>
        ` : ''}

        <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af;">
          Sent by UnBoxed Learning App • Powered by Vercel Cron
        </p>
      </div>
  `;
}
