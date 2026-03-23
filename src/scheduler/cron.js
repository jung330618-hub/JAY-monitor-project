// ===================================================
// ⑤ 排程模組 - 定期自動執行
// ===================================================
const cron = require('node-cron');
const { searchMultipleSources } = require('../search/collector');
const { analyzeArticles, generateDailySummary } = require('../analysis/analyzer');
const { sendDailyReportToLine } = require('../notify/line');
const { sendDailyReportToTelegram } = require('../notify/telegram');
const db = require('../database/db');

let scheduledTask = null;

/**
 * 執行完整的監控流程
 * ① 搜集 → ② 分析 → ③ 儲存報告 → ④ 通知
 */
async function runFullPipeline() {
  const startTime = Date.now();
  console.log('\n' + '='.repeat(50));
  console.log('🎤 周杰倫輿情監控系統 - 開始執行完整流程');
  console.log('='.repeat(50));

  try {
    // ① 搜集
    console.log('\n📡 步驟 1/4: 搜集資訊...');
    const articles = await searchMultipleSources();
    const newCount = db.insertArticles(articles);
    console.log(`✅ 搜集完成: ${articles.length} 篇文章 (${newCount} 篇新文章)`);

    // ② 分析
    console.log('\n🧠 步驟 2/4: AI 分析...');
    const unanalyzed = db.getUnanalyzedArticles(30);
    if (unanalyzed.length > 0) {
      const analysisResults = await analyzeArticles(unanalyzed);
      for (const result of analysisResults) {
        db.updateArticleAnalysis(result.id, result);
      }
      console.log(`✅ 分析完成: ${analysisResults.length} 篇文章`);
    } else {
      console.log('ℹ️  沒有需要分析的新文章');
    }

    // ③ 生成報告
    console.log('\n📊 步驟 3/4: 生成報告...');
    const todayArticles = db.getRecentArticles(50);
    const todayStats = db.getTodayStats();
    const dailySummary = await generateDailySummary(todayArticles);

    const today = new Date().toISOString().split('T')[0];
    const report = {
      report_date: today,
      total_articles: todayStats.total || 0,
      positive_count: todayStats.positive || 0,
      negative_count: todayStats.negative || 0,
      neutral_count: todayStats.neutral || 0,
      daily_summary: dailySummary.summary || '無摘要',
      key_events: dailySummary.events || '無'
    };
    db.insertReport(report);
    console.log('✅ 報告已生成並儲存');

    // ④ 通知
    console.log('\n📨 步驟 4/4: 發送通知...');
    const lineResult = await sendDailyReportToLine(report);
    db.logNotification('Line', '每日報告', lineResult.success ? '成功' : `失敗: ${lineResult.reason}`);

    const telegramResult = await sendDailyReportToTelegram(report);
    db.logNotification('Telegram', '每日報告', telegramResult.success ? '成功' : `失敗: ${telegramResult.reason}`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(50));
    console.log(`🎉 流程執行完畢！耗時 ${elapsed} 秒`);
    console.log('='.repeat(50) + '\n');

    return { success: true, report, elapsed };
  } catch (error) {
    console.error('\n❌ 流程執行失敗:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 啟動排程任務
 */
function startScheduler() {
  const cronExpression = process.env.CRON_SCHEDULE || '0 9 * * *';

  if (scheduledTask) {
    scheduledTask.stop();
  }

  if (!cron.validate(cronExpression)) {
    console.error(`[排程] 無效的 Cron 表達式: ${cronExpression}`);
    return;
  }

  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log(`[排程] 定期任務觸發 - ${new Date().toLocaleString('zh-TW')}`);
    await runFullPipeline();
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log(`[排程] ⏰ 已啟動定期排程: ${cronExpression} (台北時間)`);
  console.log(`[排程] 下次執行時間由 cron 表達式決定`);
}

/**
 * 停止排程
 */
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[排程] 已停止定期排程');
  }
}

module.exports = {
  runFullPipeline,
  startScheduler,
  stopScheduler
};
