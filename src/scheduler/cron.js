// ===================================================
// ⑤ 排程模組 - 定期自動執行與備份
// ===================================================
const cron = require('node-cron');
const { exec } = require('child_process');
const { searchMultipleSources } = require('../search/collector');
const { analyzeArticles, generateDailySummary } = require('../analysis/analyzer');
const { sendDailyReportToLine } = require('../notify/line');
const { sendDailyReportToTelegram } = require('../notify/telegram');
const db = require('../database/db');

let scheduledTask = null;
let backupTask = null; // 獨立的備份排程

/**
 * 自動打包資料庫並推播備份到 GitHub
 */
function backupToGithub() {
  console.log('\n' + '='.repeat(50));
  console.log('📦 [自動備份] 每日系統備份啟動中...');
  console.log('='.repeat(50));

  const today = new Date().toISOString().split('T')[0];
  const commitMsg = `Backup: 系統自動上傳資料庫備份 (${today})`;

  // 在背景強制執行 Git 系列指令與本機複製
  const cmd = `if not exist "C:\\新增資料夾\\obsidian" mkdir "C:\\新增資料夾\\obsidian" && copy /Y "data\\jay_monitor.json" "C:\\新增資料夾\\obsidian\\jay_monitor.json" && git add "data/jay_monitor.json" && git commit -m "${commitMsg}" && git push origin main`;

  exec(cmd, { cwd: process.cwd(), shell: 'cmd.exe' }, (error, stdout, stderr) => {
    if (error) {
       // 如果沒有改動，Git Commit 會報錯並跳出，我們略過無改動的錯誤
       if (stdout.includes('nothing to commit') || stdout.includes('沒有變更')) {
         console.log('ℹ️ [自動備份] 資料庫今日沒有新資料，略過上傳 Github。');
       } else {
         console.error('❌ [自動備份] Git 上傳失敗:', error.message);
       }
       return;
    }
    console.log('✅ [自動備份] 成功上傳到 GitHub！詳細系統回傳：\n', stdout);
  });
}

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

    // ★ 新增：為 GitHub Pages 產生專屬靜態的資料來源檔案
    const fs = require('fs');
    const path = require('path');
    const staticData = db.getDashboardData();
    fs.writeFileSync(path.join(process.cwd(), 'data', 'dashboard.json'), JSON.stringify(staticData, null, 2), 'utf-8');
    console.log('✅ GitHub Pages 靜態資料結構已更新 (dashboard.json)');

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
    console.log(`[排程] 定期報告觸發 - ${new Date().toLocaleString('zh-TW')}`);
    await runFullPipeline();
  }, {
    timezone: 'Asia/Taipei'
  });

  // 設定第二個定期任務：每天深夜 2:00 (台北時間) 進行資料總結上傳 GitHub
  backupTask = cron.schedule('0 2 * * *', () => {
    console.log(`[排程] Github 深夜雲端備份觸發 - ${new Date().toLocaleString('zh-TW')}`);
    backupToGithub();
  }, {
    timezone: 'Asia/Taipei'
  });

  console.log(`[排程] ⏰ 已啟動每日報告排程: ${cronExpression}`);
  console.log(`[排程] ⏰ 已啟動每日 Github 備份排程: 0 2 * * * (每日晚上三更半夜兩點)`);
  console.log(`[排程] 定期任務與備份已準備就緒，背景等待中...`);
}

/**
 * 停止排程
 */
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  if (backupTask) {
    backupTask.stop();
    backupTask = null;
  }
  console.log('[排程] 已停止所有定期任務與備份排程');
}

module.exports = {
  runFullPipeline,
  startScheduler,
  stopScheduler
};
