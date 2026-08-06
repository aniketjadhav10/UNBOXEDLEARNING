import type { VercelRequest, VercelResponse } from '@vercel/node';

// AI handlers
import chatHandler from '../server/ai/chat';
import generateSyllabusHandler from '../server/ai/generateSyllabus';
import generateTasksHandler from '../server/ai/generateTasks';
import generateTopicsHandler from '../server/ai/generateTopics';

// Cron handlers
import dailyAgendaHandler from '../server/cron/daily-agenda';
import eveningReportHandler from '../server/cron/evening-report';
import weeklyPlannerHandler from '../server/cron/weekly-planner';
import weeklyReportHandler from '../server/cron/weekly-report';

// Family handlers
import inviteHandler from '../server/family/invite';

// Sync handlers
import pushHandler from '../server/sync/push';

// Tasks handlers
import completeTaskHandler from '../server/tasks/complete';
import createTaskHandler from '../server/tasks/create';
import updateTaskHandler from '../server/tasks/update';

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
    if (path.endsWith('/api/ai/chat')) return await chatHandler(req, res);
    if (path.endsWith('/api/ai/generateSyllabus')) return await generateSyllabusHandler(req, res);
    if (path.endsWith('/api/ai/generateTasks')) return await generateTasksHandler(req, res);
    if (path.endsWith('/api/ai/generateTopics')) return await generateTopicsHandler(req, res);
    
    if (path.endsWith('/api/cron/daily-agenda')) return await dailyAgendaHandler(req, res);
    if (path.endsWith('/api/cron/evening-report')) return await eveningReportHandler(req, res);
    if (path.endsWith('/api/cron/weekly-planner')) return await weeklyPlannerHandler(req, res);
    if (path.endsWith('/api/cron/weekly-report')) return await weeklyReportHandler(req, res);
    
    if (path.endsWith('/api/family/invite')) return await inviteHandler(req, res);
    
    if (path.endsWith('/api/sync/push')) return await pushHandler(req, res);
    
    if (path.endsWith('/api/tasks/complete')) return await completeTaskHandler(req, res);
    if (path.endsWith('/api/tasks/create')) return await createTaskHandler(req, res);
    if (path.endsWith('/api/tasks/update')) return await updateTaskHandler(req, res);
    
    return res.status(404).json({ error: 'API route not found: ' + path });
  } catch (error) {
    console.error('API Router Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
