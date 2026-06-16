export interface ActivityPlan {
  subject: string;
  topic: string;
  name: string;
  durationMins: number;
  learningGoal?: string;
}

export interface WeeklyPlannerData {
  childName: string;
  weekStart: string;
  weekEnd: string;
  activities: ActivityPlan[];
}

export function renderWeeklyPlannerEmail(data: WeeklyPlannerData) {
  // Group activities by Subject -> Topic
  const grouped: Record<string, Record<string, ActivityPlan[]>> = {};
  
  data.activities.forEach(activity => {
    if (!grouped[activity.subject]) grouped[activity.subject] = {};
    if (!grouped[activity.subject][activity.topic]) grouped[activity.subject][activity.topic] = [];
    grouped[activity.subject][activity.topic].push(activity);
  });

  const subjectHtml = Object.entries(grouped).map(([subject, topics]) => `
    <div style="page-break-inside: avoid; margin-bottom: 20px;">
      <h2 style="font-size: 16pt; margin-top: 8mm; margin-bottom: 4mm; border-bottom: 1px solid #000; padding-bottom: 2mm;">${subject}</h2>
      ${Object.entries(topics).map(([topic, activities]) => `
        <div style="margin-bottom: 15px;">
          <h3 style="font-size: 13pt; margin-top: 4mm; margin-bottom: 2mm; font-style: italic;">${topic}</h3>
          <div style="width: 100%; border-collapse: collapse; margin-bottom: 6mm; page-break-inside: avoid;">
            ${activities.map(activity => `
              <div style="display: flex; align-items: flex-start; padding: 3mm 0; border-bottom: 1px dashed #ccc;">
                <div style="width: 8mm; padding-top: 1mm;">
                  <div style="width: 5mm; height: 5mm; border: 1px solid #000; display: inline-block;"></div>
                </div>
                <div style="flex-grow: 1;">
                  <div style="font-weight: bold; font-size: 12pt;">${activity.name}</div>
                  <div style="font-size: 10pt; margin-top: 1mm;">
                    <span style="display: inline-block; font-weight: bold; margin-right: 4mm;">⏱ ${activity.durationMins} mins</span>
                    ${activity.learningGoal ? `<span style="display: inline-block;"><strong>Goal:</strong> ${activity.learningGoal}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Learning Plan</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #000000; background-color: #ffffff; }
            .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm; background: white; }
            h1 { font-size: 24pt; text-align: center; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5mm; border-bottom: 2px solid #000; padding-bottom: 5mm; }
            .header-info { display: flex; justify-content: space-between; margin-bottom: 10mm; font-size: 12pt; font-weight: bold; }
            .summary-section, .notes-section, .signature-section { page-break-inside: avoid; margin-top: 10mm; }
            .notes-box { width: 100%; height: 30mm; border: 1px solid #000; margin-top: 3mm; }
            .signature-line { width: 60mm; border-bottom: 1px solid #000; margin-top: 15mm; display: inline-block; }
            @media print {
                body { background: none; }
                .page { margin: 0; border: initial; width: initial; min-height: initial; padding: 0; }
                @page { size: A4 portrait; margin: 20mm; }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <h1>Weekly Learning Plan</h1>
            
            <div class="header-info">
                <div>Child Name: ${data.childName}</div>
                <div>Week: ${data.weekStart} to ${data.weekEnd}</div>
            </div>

            ${subjectHtml}

            <div class="summary-section">
                <h2 style="font-size: 16pt; margin-top: 8mm; margin-bottom: 4mm; border-bottom: 1px solid #000; padding-bottom: 2mm;">Completion Summary</h2>
                <p><strong>Total Activities Assigned:</strong> ${data.activities.length}</p>
                <p style="margin-top: 2mm;"><strong>Activities Completed:</strong> ______ / ${data.activities.length}</p>
            </div>

            <div class="notes-section">
                <h2 style="font-size: 16pt; margin-top: 8mm; margin-bottom: 4mm; border-bottom: 1px solid #000; padding-bottom: 2mm;">Teacher / Parent Notes</h2>
                <div class="notes-box"></div>
            </div>

            <div class="signature-section">
                <div class="signature-line"></div>
                <p style="margin-top: 2mm;">Parent / Guardian Signature</p>
                <div class="signature-line" style="margin-left: 20mm; width: 40mm;"></div>
                <p style="margin-top: 2mm; margin-left: 20mm; display: inline-block;">Date</p>
            </div>
        </div>
    </body>
    </html>
  `;
}
