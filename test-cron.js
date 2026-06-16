import * as parser from 'cron-parser';
try {
  console.log(Object.keys(parser));
  const nextDate = parser.parseExpression('* * * * *', { tz: 'UTC' }).next().toDate();
  console.log('Success:', nextDate.toLocaleString());
} catch (e) {
  console.error('Error:', e.message);
}
