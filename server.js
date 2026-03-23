// ===================================================
// 主伺服器入口 - Jay 周杰倫輿情監控系統
// ===================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./src/database/db');
const { runFullPipeline, startScheduler } = require('./src/scheduler/cron');
const { searchMultipleSources } = require('./src/search/collector');

const app = express();
const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// ===== API 路由 =====

/**
 * 取得儀表板資料
 */
app.get('/api/dashboard', (req, res) => {
  try {
    const data = db.getDashboardData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 取得文章列表
 */
app.get('/api/articles', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const articles = db.getRecentArticles(limit);
    res.json({ success: true, data: articles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 取得情緒趨勢
 */
app.get('/api/trend', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 14;
    const trend = db.getSentimentTrend(days);
    res.json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 取得報告列表
 */
app.get('/api/reports', (req, res) => {
  try {
    const reports = db.getReports(7);
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 手動觸發完整流程
 */
app.post('/api/run', async (req, res) => {
  try {
    console.log('[API] 手動觸發完整流程');
    const result = await runFullPipeline();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 只執行搜集步驟
 */
app.post('/api/search', async (req, res) => {
  try {
    console.log('[API] 手動觸發搜集');
    const articles = await searchMultipleSources();
    const newCount = db.insertArticles(articles);
    res.json({
      success: true,
      data: { total: articles.length, new: newCount }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 健康檢查
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    name: '周杰倫輿情監控系統',
    timestamp: new Date().toISOString()
  });
});

const localtunnel = require('localtunnel');

// ===== 啟動伺服器 =====

app.listen(PORT, async () => {
  console.log('\n' + '═'.repeat(50));
  console.log('  🎤 周杰倫輿情監控系統');
  console.log('  Jay Chou Reputation Monitor');
  console.log('═'.repeat(50));
  console.log(`  🌐 本機除錯網址: http://localhost:${PORT}`);
  console.log(`  📡 API 服務: http://localhost:${PORT}/api`);
  console.log('═'.repeat(50));

  // 🌍 黑科技：幫你的本機自動打一條隧道上外網
  try {
    const tunnel = await localtunnel({ port: PORT });
    
    // 把這條公開隨機網址塞進系統記憶體裡，讓 LINE 跟 Telegram 可以隨時拿去當超連結發送
    global.PUBLIC_URL = tunnel.url;

    console.log(`  🚀 【手機雲端遠端入口】開通成功！`);
    console.log(`  👉 你的公開專屬儀表板網址: ${tunnel.url}`);
    console.log(`    (不論你在哪裡、用什麼網路，只要用手機點開這串網址就能隨時觀看你的報告！)`);
    console.log('═'.repeat(50) + '\n');

    tunnel.on('close', () => {
      console.log('⚠️ 外網通道已關閉');
    });
  } catch (err) {
    console.log('⚠️ 自動建立外網通道失敗，將僅維持區域網路模式。');
  }

  // 啟動定期排程
  startScheduler();
});
