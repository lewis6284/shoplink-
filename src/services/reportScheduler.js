const ReportService = require('./report.service');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_HOUR = 0;
const SCHEDULE_MINUTE = 5;
const SCHEDULE_SECOND = 0;

const getScheduledTime = (reference = new Date()) => {
  const next = new Date(reference);
  next.setHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, SCHEDULE_SECOND, 0);
  return next;
};

const getNextRunTime = (now = new Date()) => {
  const next = getScheduledTime(now);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const getPreviousDayDate = () => {
  const previous = new Date();
  previous.setDate(previous.getDate() - 1);
  return previous.toISOString().split('T')[0];
};

const runDailyReportJob = async () => {
  const targetDate = getPreviousDayDate();
  console.log(`[Report Scheduler] Generating daily reports for ${targetDate}`);

  try {
    await ReportService.generateDailyReportsForDate(targetDate);
    console.log(`[Report Scheduler] Completed daily reports for ${targetDate}`);
  } catch (error) {
    console.error('[Report Scheduler] Daily report generation failed:', error);
  }
};

const initializeDailyReportScheduler = async () => {
  const now = new Date();
  const nextRun = getNextRunTime(now);
  const delayMs = nextRun.getTime() - now.getTime();

  console.log(`[Report Scheduler] Next daily report run scheduled at ${nextRun.toISOString()}`);

  const todayScheduledTime = getScheduledTime(now);
  if (now >= todayScheduledTime) {
    console.log('[Report Scheduler] Running backfill check for yesterday before scheduling future jobs.');
    await runDailyReportJob();
  }

  setTimeout(async () => {
    await runDailyReportJob();
    setInterval(async () => {
      await runDailyReportJob();
    }, ONE_DAY_MS);
  }, delayMs);
};

module.exports = { initializeDailyReportScheduler };
