export function renderDailyAgendaEmail(activities: string[]) {
  return `
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #4f46e5; text-align: center;">☀️ Good Morning!</h1>
      <p style="text-align: center; color: #666; font-size: 16px;">Here's the plan for today's learning adventures.</p>
      
      <div style="background: #e0e7ff; padding: 20px; border-radius: 12px; margin: 30px 0;">
        <h3 style="color: #3730a3; margin-top: 0; border-bottom: 2px solid #c7d2fe; padding-bottom: 10px;">Today's Activities</h3>
        <ul style="list-style: none; padding-left: 0; margin-bottom: 0;">
          ${activities.map((activity, index) => `
            <li style="padding: 12px; border-radius: 8px; background: #ffffff; margin-bottom: ${index === activities.length - 1 ? '0' : '10px'}; border-left: 4px solid #4f46e5; font-size: 16px;">
              • ${activity}
            </li>
          `).join('')}
        </ul>
      </div>

      <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #9ca3af;">
        Sent by UnBoxed Learning App • Have a great day!
      </p>
    </div>
  `;
}
