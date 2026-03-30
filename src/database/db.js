// ===================================================
// 資料庫模組 - JSON 檔案儲存（免原生編譯依賴）
// ===================================================
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(dataDir, 'jay_monitor.json');

// ===== 資料結構 =====

function getDefaultData() {
  return {
    articles: [],
    analysis_reports: [],
    notification_logs: [],
    _meta: { nextArticleId: 1, nextReportId: 1, nextLogId: 1 }
  };
}

// ===== 讀寫操作 =====

function loadData() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      const data = JSON.parse(raw);
      // 確保所有欄位存在
      if (!data._meta) data._meta = { nextArticleId: 1, nextReportId: 1, nextLogId: 1 };
      if (!data.articles) data.articles = [];
      if (!data.analysis_reports) data.analysis_reports = [];
      if (!data.notification_logs) data.notification_logs = [];
      return data;
    }
  } catch (error) {
    console.error('[DB] 載入資料失敗，建立新資料庫:', error.message);
  }
  return getDefaultData();
}

function saveData(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('[DB] 儲存資料失敗:', error.message);
  }
}

// ===== 文章相關操作 =====

/**
 * 新增文章（若連結已存在則略過）
 */
function insertArticle(article) {
  const data = loadData();
  // 以 link 為唯一鍵
  if (data.articles.some(a => a.link === article.link)) {
    return { changes: 0 };
  }
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  data.articles.push({
    id: data._meta.nextArticleId++,
    title: article.title || '',
    link: article.link || '',
    source: article.source || '',
    snippet: article.snippet || '',
    published_at: article.published_at || '',
    collected_at: now,
    sentiment: null,
    sentiment_score: null,
    summary: null,
    category: null,
    analyzed: 0
  });
  saveData(data);
  return { changes: 1 };
}

/**
 * 批量新增文章
 */
function insertArticles(articles) {
  const data = loadData();
  let count = 0;
  const existingLinks = new Set(data.articles.map(a => a.link));

  for (const article of articles) {
    if (existingLinks.has(article.link)) continue;
    existingLinks.add(article.link);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    data.articles.push({
      id: data._meta.nextArticleId++,
      title: article.title || '',
      link: article.link || '',
      source: article.source || '',
      snippet: article.snippet || '',
      published_at: article.published_at || '',
      collected_at: now,
      sentiment: null,
      sentiment_score: null,
      summary: null,
      category: null,
      analyzed: 0
    });
    count++;
  }

  if (count > 0) saveData(data);
  return count;
}

/**
 * 取得未分析的文章
 */
function getUnanalyzedArticles(limit = 20) {
  const data = loadData();
  return data.articles
    .filter(a => a.analyzed === 0)
    .sort((a, b) => (b.collected_at || '').localeCompare(a.collected_at || ''))
    .slice(0, limit);
}

/**
 * 更新文章分析結果
 */
function updateArticleAnalysis(id, analysis) {
  const data = loadData();
  const article = data.articles.find(a => a.id === id);
  if (article) {
    article.sentiment = analysis.sentiment || '中性';
    article.sentiment_score = parseFloat(analysis.sentiment_score) || 0.5;
    article.summary = analysis.summary || article.title;
    article.category = analysis.category || '其他';
    article.analyzed = 1;
    saveData(data);
    return { changes: 1 };
  }
  return { changes: 0 };
}

/**
 * 取得最近的文章（含分析結果）
 */
function getRecentArticles(limit = 50) {
  const data = loadData();
  return data.articles
    .sort((a, b) => (b.collected_at || '').localeCompare(a.collected_at || ''))
    .slice(0, limit);
}

/**
 * 取得今日文章統計
 */
function getTodayStats() {
  const data = loadData();
  const today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD

  const todayArticles = data.articles.filter(a =>
    (a.collected_at || '').substring(0, 10) === today
  );

  return {
    total: todayArticles.length,
    positive: todayArticles.filter(a => a.sentiment === '正面').length,
    negative: todayArticles.filter(a => a.sentiment === '負面').length,
    neutral: todayArticles.filter(a => a.sentiment === '中性').length
  };
}

/**
 * 取得情緒趨勢（最近 N 天）
 */
function getSentimentTrend(days = 14) {
  const data = loadData();
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  // 按日期分組
  const grouped = {};
  for (const article of data.articles) {
    const date = (article.collected_at || '').substring(0, 10);
    if (date < cutoffStr) continue;
    if (!grouped[date]) {
      grouped[date] = { date, total: 0, positive: 0, negative: 0, neutral: 0, scores: [] };
    }
    grouped[date].total++;
    if (article.sentiment === '正面') grouped[date].positive++;
    else if (article.sentiment === '負面') grouped[date].negative++;
    else if (article.sentiment === '中性') grouped[date].neutral++;
    if (article.sentiment_score != null) grouped[date].scores.push(article.sentiment_score);
  }

  return Object.values(grouped)
    .map(g => ({
      date: g.date,
      total: g.total,
      positive: g.positive,
      negative: g.negative,
      neutral: g.neutral,
      avg_score: g.scores.length > 0
        ? parseFloat((g.scores.reduce((s, v) => s + v, 0) / g.scores.length).toFixed(2))
        : null
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ===== 報告相關操作 =====

function insertReport(report) {
  const data = loadData();
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  // 若同日期報告已存在，替換
  const idx = data.analysis_reports.findIndex(r => r.report_date === report.report_date);
  const entry = {
    id: idx >= 0 ? data.analysis_reports[idx].id : data._meta.nextReportId++,
    report_date: report.report_date,
    total_articles: report.total_articles || 0,
    positive_count: report.positive_count || 0,
    negative_count: report.negative_count || 0,
    neutral_count: report.neutral_count || 0,
    daily_summary: report.daily_summary || '',
    key_events: report.key_events || '',
    created_at: now
  };
  if (idx >= 0) {
    data.analysis_reports[idx] = entry;
  } else {
    data.analysis_reports.push(entry);
  }
  saveData(data);
  return { changes: 1 };
}

function getLatestReport() {
  const data = loadData();
  if (data.analysis_reports.length === 0) return undefined;
  return data.analysis_reports
    .sort((a, b) => (b.report_date || '').localeCompare(a.report_date || ''))
    [0];
}

function getReports(limit = 7) {
  const data = loadData();
  return data.analysis_reports
    .sort((a, b) => (b.report_date || '').localeCompare(a.report_date || ''))
    .slice(0, limit);
}

// ===== 通知日誌 =====

function logNotification(channel, message, status) {
  const data = loadData();
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  data.notification_logs.push({
    id: data._meta.nextLogId++,
    channel,
    message,
    status,
    sent_at: now
  });
  saveData(data);
}

// ===== 統計資料 =====

function getDashboardData() {
  const todayStats = getTodayStats();
  const trend = getSentimentTrend(14);
  const recentArticles = getRecentArticles(30);
  const latestReport = getLatestReport();
  const recentReports = getReports(7); // ★ 取出最近的 7 篇歷史報告

  const data = loadData();
  const analyzed = data.articles.filter(a => a.analyzed === 1);

  const allTimeStats = {
    total: analyzed.length,
    positive: analyzed.filter(a => a.sentiment === '正面').length,
    negative: analyzed.filter(a => a.sentiment === '負面').length,
    neutral: analyzed.filter(a => a.sentiment === '中性').length,
    avg_score: analyzed.length > 0
      ? parseFloat((analyzed.reduce((s, a) => s + (a.sentiment_score || 0), 0) / analyzed.length).toFixed(2))
      : null
  };

  return {
    todayStats,
    allTimeStats,
    trend,
    recentArticles,
    latestReport,
    recentReports
  };
}

module.exports = {
  loadData,
  saveData,
  insertArticle,
  insertArticles,
  getUnanalyzedArticles,
  updateArticleAnalysis,
  getRecentArticles,
  getTodayStats,
  getSentimentTrend,
  insertReport,
  getLatestReport,
  getReports,
  logNotification,
  getDashboardData
};
