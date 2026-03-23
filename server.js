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

// ===== 啟動伺服器 =====

app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(50));
  console.log('  🎤 周杰倫輿情監控系統');
  console.log('  Jay Chou Reputation Monitor');
  console.log('═'.repeat(50));
  console.log(`  🌐 網頁報告: http://localhost:${PORT}`);
  console.log(`  📡 API 服務: http://localhost:${PORT}/api`);
  console.log('═'.repeat(50) + '\n');

  // 啟動定期排程
  startScheduler();
});
