import type { VercelRequest, VercelResponse } from '@vercel/node';

// AI handlers
import chatHandler from '../server/ai/chat.js';
import generateSyllabusHandler from '../server/ai/generateSyllabus.js';
import generateTasksHandler from '../server/ai/generateTasks.js';
import generateTopicsHandler from '../server/ai/generateTopics.js';

// Cron handlers
import dailyAgendaHandler from '../server/cron/daily-agenda.js';
import eveningReportHandler from '../server/cron/evening-report.js';
import weeklyPlannerHandler from '../server/cron/weekly-planner.js';
import weeklyReportHandler from '../server/cron/weekly-report.js';

// Family handlers
import inviteHandler from '../server/family/invite.js';

// Sync handlers
import pushHandler from '../server/sync/push.js';

// Tasks handlers
import completeTaskHandler from '../server/tasks/complete.js';
import createTaskHandler from '../server/tasks/create.js';
import updateTaskHandler from '../server/tasks/update.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract path without query strings
  let path = '';
  try {
    const fullUrl = req.url?.startsWith('http') ? req.url : `http://${req.headers.host || 'localhost'}${req.url}`;
    path = new URL(fullUrl).pathname;
  } catch (err) {
    path = req.url || '';
  }
  
  // Also strip off any potential query parameters if we fell back to req.url
  if (path.includes('?')) {
    path = path.split('?')[0];
  }

  try {
    const handle = (fn: any) => typeof fn === 'function' ? fn : fn.default;

    if (path.endsWith('/api/ai/chat')) return await handle(chatHandler)(req, res);
    if (path.endsWith('/api/ai/generateSyllabus')) return await handle(generateSyllabusHandler)(req, res);
    if (path.endsWith('/api/ai/generateTasks')) return await handle(generateTasksHandler)(req, res);
    if (path.endsWith('/api/ai/generateTopics')) return await handle(generateTopicsHandler)(req, res);
    
    if (path.endsWith('/api/cron/daily-agenda')) return await handle(dailyAgendaHandler)(req, res);
    if (path.endsWith('/api/cron/evening-report')) return await handle(eveningReportHandler)(req, res);
    if (path.endsWith('/api/cron/weekly-planner')) return await handle(weeklyPlannerHandler)(req, res);
    if (path.endsWith('/api/cron/weekly-report')) return await handle(weeklyReportHandler)(req, res);
    
    if (path.endsWith('/api/family/invite')) return await handle(inviteHandler)(req, res);
    
    if (path.endsWith('/api/sync/push')) return await handle(pushHandler)(req, res);
    
    if (path.endsWith('/api/tasks/complete')) return await handle(completeTaskHandler)(req, res);
    if (path.endsWith('/api/tasks/create')) return await handle(createTaskHandler)(req, res);
    if (path.endsWith('/api/tasks/update')) return await handle(updateTaskHandler)(req, res);
    
    return res.status(404).json({ error: 'API route not found: ' + path });
  } catch (error) {
    console.error('API Router Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
