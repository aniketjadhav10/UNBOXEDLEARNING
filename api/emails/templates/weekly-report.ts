export interface WeeklyReportData {
  activitiesCompleted: number;
  subjectsPracticed: number;
  mostLovedTopic: string;
  suggestedNextWeekFocus: string;
}

export function renderWeeklyReportEmail(data: WeeklyReportData) {
  return `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #db2777; text-align: center;">🎉 Weekly Wrap-Up!</h1>
      <p style="text-align: center; color: #666; font-size: 16px;">What a fantastic week of learning. Here's a quick summary.</p>
      
      <div style="display: flex; justify-content: space-between; margin: 30px 0; gap: 15px;">
        <div style="background: #fdf2f8; padding: 20px 10px; border-radius: 12px; width: 48%; text-align: center; border: 1px solid #fbcfe8;">
          <div style="font-size: 32px; font-weight: bold; color: #db2777;">${data.activitiesCompleted}</div>
          <div style="font-size: 13px; color: #831843; text-transform: uppercase; font-weight: 600; margin-top: 5px;">Activities<br/>Completed</div>
        </div>
        <div style="background: #fdf2f8; padding: 20px 10px; border-radius: 12px; width: 48%; text-align: center; border: 1px solid #fbcfe8;">
          <div style="font-size: 32px; font-weight: bold; color: #db2777;">${data.subjectsPracticed}</div>
          <div style="font-size: 13px; color: #831843; text-transform: uppercase; font-weight: 600; margin-top: 5px;">Subjects<br/>Practiced</div>
        </div>
      </div>

      <div style="background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
        <h3 style="color: #111827; margin-top: 0; font-size: 18px;">Highlights</h3>
        <div style="margin-top: 15px;">
          <div style="margin-bottom: 12px;">
            <span style="font-size: 20px; margin-right: 10px;">⭐</span>
            <strong style="color: #4b5563;">Most Loved Topic:</strong> 
            <span style="color: #111827; font-weight: 500;">${data.mostLovedTopic}</span>
          </div>
          <div>
            <span style="font-size: 20px; margin-right: 10px;">🎯</span>
            <strong style="color: #4b5563;">Suggested Next Focus:</strong> 
            <span style="color: #111827; font-weight: 500;">${data.suggestedNextWeekFocus}</span>
          </div>
        </div>
      </div>

      <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af;">
        Sent by UnBoxed Learning App • Have a great weekend!
      </p>
    </div>
  `;
}
