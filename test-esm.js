import { CronExpressionParser } from 'cron-parser';
try {
  const nextDate = CronExpressionParser.parse('* * * * *', { tz: 'UTC' }).next().toDate();
  console.log('Success:', nextDate.toLocaleString());
} catch (e) {
  console.error('Error:', e.message);
}
