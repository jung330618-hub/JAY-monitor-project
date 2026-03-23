// ===================================================
// 前端應用程式 - 儀表板互動邏輯
// ===================================================

const API_BASE = '';
let allArticles = [];
let currentFilter = 'all';

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', () => {
  updateTime();
  setInterval(updateTime, 1000);
  createParticles();
  loadDashboard();
  // 每 60 秒自動刷新
  setInterval(loadDashboard, 60000);
});

// ===== 時間顯示 =====

function updateTime() {
  const now = new Date();
  const el = document.getElementById('currentTime');
  const options = {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  };
  el.textContent = now.toLocaleString('zh-TW', options);
}

// ===== 粒子效果 =====

function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    container.appendChild(particle);
  }
}

// ===== API 呼叫 =====

async function fetchAPI(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    const data = await res.json();
    if (data.success) return data.data;
    throw new Error(data.error || '未知錯誤');
  } catch (error) {
    console.error(`API 錯誤 (${endpoint}):`, error);
    return null;
  }
}

// ===== 載入儀表板 =====

async function loadDashboard() {
  let data = null;
  try {
    const res = await fetch('../data/dashboard.json');
    data = await res.json();
  } catch (error) {
    console.error('無法讀取靜態 JSON 資料庫:', error);
    return;
  }
  if (!data) return;

  updateStats(data);
  updateTrendChart(data.trend);
  updateDonutChart(data.allTimeStats);
  updateSummary(data.latestReport);
  updateArticles(data.recentArticles);
}

// ===== 更新統計數字 =====

function updateStats(data) {
  const stats = data.allTimeStats || {};
  animateNumber('statTotal', stats.total || 0);
  animateNumber('statPositive', stats.positive || 0);
  animateNumber('statNegative', stats.negative || 0);
  animateNumber('statNeutral', stats.neutral || 0);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  const current = parseInt(el.textContent) || 0;
  const duration = 800;
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(current + (target - current) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ===== 趨勢圖表（純 Canvas） =====

function updateTrendChart(trend) {
  const canvas = document.getElementById('trendChart');
  const emptyEl = document.getElementById('trendEmpty');

  if (!trend || trend.length === 0) {
    canvas.style.display = 'none';
    emptyEl.style.display = 'flex';
    return;
  }

  canvas.style.display = 'block';
  emptyEl.style.display = 'none';

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  const w = rect.width - 48;
  const h = 220;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // 清除
  ctx.clearRect(0, 0, w, h);

  // 計算最大值
  const maxVal = Math.max(...trend.map(d => Math.max(d.positive || 0, d.negative || 0, d.neutral || 0, d.total || 0)), 5);

  // 網格線
  ctx.strokeStyle = 'hsla(0,0%,100%,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(w - padding.right, y);
    ctx.stroke();

    // Y 軸標籤
    ctx.fillStyle = 'hsla(0,0%,100%,0.3)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 8, y + 4);
  }

  // X 軸標籤
  const stepX = chartW / Math.max(trend.length - 1, 1);
  trend.forEach((d, i) => {
    const x = padding.left + stepX * i;
    ctx.fillStyle = 'hsla(0,0%,100%,0.3)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    const dateStr = d.date ? d.date.substring(5) : '';
    ctx.fillText(dateStr, x, h - 10);
  });

  // 畫線條
  const datasets = [
    { key: 'positive', color: 'hsl(145, 65%, 48%)', label: '正面' },
    { key: 'negative', color: 'hsl(0, 72%, 55%)', label: '負面' },
    { key: 'neutral', color: 'hsl(210, 20%, 55%)', label: '中性' }
  ];

  datasets.forEach(ds => {
    const points = trend.map((d, i) => ({
      x: padding.left + stepX * i,
      y: padding.top + chartH - (((d[ds.key] || 0) / maxVal) * chartH)
    }));

    if (points.length < 2) return;

    // 面積填充
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    const baseColor = ds.color.replace('hsl', 'hsla').replace(')', ', 0.15)');
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();

    // 線條
    ctx.beginPath();
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 點
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = ds.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'hsl(230, 25%, 7%)';
      ctx.fill();
    });
  });
}

// ===== 甜甜圈圖表 =====

function updateDonutChart(stats) {
  const canvas = document.getElementById('donutChart');
  const emptyEl = document.getElementById('donutEmpty');
  const centerEl = document.getElementById('donutCenter');

  if (!stats || (stats.total || 0) === 0) {
    canvas.style.display = 'none';
    emptyEl.style.display = 'flex';
    centerEl.style.display = 'none';
    return;
  }

  canvas.style.display = 'block';
  emptyEl.style.display = 'none';
  centerEl.style.display = 'block';

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 200;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const radius = 80;
  const lineWidth = 24;

  const total = (stats.positive || 0) + (stats.negative || 0) + (stats.neutral || 0) || 1;
  const segments = [
    { value: stats.positive || 0, color: 'hsl(145, 65%, 48%)' },
    { value: stats.neutral || 0, color: 'hsl(210, 20%, 55%)' },
    { value: stats.negative || 0, color: 'hsl(0, 72%, 55%)' }
  ];

  ctx.clearRect(0, 0, size, size);

  // 底色
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'hsla(0,0%,100%,0.05)';
  ctx.lineWidth = lineWidth;
  ctx.stroke();

  let startAngle = -Math.PI / 2;
  segments.forEach(seg => {
    if (seg.value === 0) return;
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + angle);
    ctx.strokeStyle = seg.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    startAngle += angle;
  });

  // 更新中心文字
  const avgScore = stats.avg_score != null ? stats.avg_score : '--';
  document.getElementById('avgScore').textContent = avgScore;
}

// ===== 更新每日摘要 =====

function updateSummary(report) {
  const el = document.getElementById('dailySummary');

  if (!report) {
    el.innerHTML = `
      <div class="summary-empty">
        <span class="empty-icon">📝</span>
        <p>尚無每日摘要</p>
        <p class="empty-hint">執行完整流程後將自動生成</p>
      </div>`;
    return;
  }

  const events = (report.key_events || '').split(',').map(e => e.trim()).filter(Boolean);
  const eventTags = events.map(e => `<span class="event-tag">${e}</span>`).join('');

  el.innerHTML = `
    <div class="summary-date">📅 ${report.report_date}</div>
    <div class="summary-text">${report.daily_summary || '無摘要'}</div>
    <div class="summary-events">
      <h4>🔑 重要事件</h4>
      ${eventTags || '<span class="event-tag">無特別事件</span>'}
    </div>
  `;
}

// ===== 更新文章列表 =====

function updateArticles(articles) {
  allArticles = articles || [];
  renderArticles();
}

function renderArticles() {
  const el = document.getElementById('articlesList');
  const filtered = currentFilter === 'all'
    ? allArticles
    : allArticles.filter(a => a.sentiment === currentFilter);

  if (filtered.length === 0) {
    el.innerHTML = `
      <div class="articles-empty">
        <span class="empty-icon">📋</span>
        <p>${currentFilter === 'all' ? '尚無文章資料' : `沒有${currentFilter}文章`}</p>
        <p class="empty-hint">點擊「立即執行」開始搜集周杰倫相關新聞</p>
      </div>`;
    return;
  }

  el.innerHTML = filtered.map(article => {
    const sentimentEmoji = getSentimentEmoji(article.sentiment);
    const sentimentClass = getSentimentClass(article.sentiment);
    const scorePercent = Math.round((article.sentiment_score || 0.5) * 100);
    const timeStr = formatTime(article.published_at || article.collected_at);

    return `
      <div class="article-item" data-sentiment="${article.sentiment || ''}">
        <div class="article-sentiment ${sentimentClass}">
          ${sentimentEmoji}
        </div>
        <div class="article-content">
          <div class="article-title">
            <a href="${article.link || '#'}" target="_blank" rel="noopener">${escapeHtml(article.title)}</a>
          </div>
          <div class="article-meta">
            <span class="article-source">📰 ${escapeHtml(article.source || '未知')}</span>
            ${article.category ? `<span class="article-category">${article.category}</span>` : ''}
            <span class="article-time">🕐 ${timeStr}</span>
          </div>
          ${article.summary ? `<div class="article-summary">${escapeHtml(article.summary)}</div>` : ''}
        </div>
        <div class="article-score">
          <div class="score-bar">
            <div class="score-fill ${sentimentClass}" style="height: ${scorePercent}%"></div>
          </div>
          <span class="score-label">${scorePercent}%</span>
        </div>
      </div>`;
  }).join('');
}

function filterArticles(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderArticles();
}

// ===== 執行完整流程 =====

async function runFullPipeline() {
  const btn = document.getElementById('btnRunNow');
  const overlay = document.getElementById('runningOverlay');

  btn.disabled = true;
  overlay.classList.add('show');

  // 動畫步驟
  animatePipelineSteps();

  try {
    const res = await fetch(`${API_BASE}/api/run`, { method: 'POST' });
    const data = await res.json();

    overlay.classList.remove('show');
    btn.disabled = false;

    if (data.success) {
      showToast('✅ 流程執行完畢！', 'success');
      loadDashboard();
    } else {
      showToast('❌ 執行失敗: ' + (data.error || '未知錯誤'), 'error');
    }
  } catch (error) {
    overlay.classList.remove('show');
    btn.disabled = false;
    showToast('❌ 連線失敗: ' + error.message, 'error');
  }
}

function animatePipelineSteps() {
  const steps = ['progStep1', 'progStep2', 'progStep3', 'progStep4'];
  const labels = ['🔍 搜集中...', '🧠 AI 分析中...', '📊 生成報告中...', '📨 發送通知中...'];
  const doneLabels = ['✅ 搜集完成', '✅ 分析完成', '✅ 報告完成', '✅ 通知完成'];

  let currentStep = 0;

  function nextStep() {
    if (currentStep > 0) {
      document.getElementById(steps[currentStep - 1]).classList.remove('active');
      document.getElementById(steps[currentStep - 1]).classList.add('done');
      document.getElementById(steps[currentStep - 1]).textContent = doneLabels[currentStep - 1];
    }

    if (currentStep < steps.length) {
      document.getElementById(steps[currentStep]).classList.add('active');
      document.getElementById(steps[currentStep]).textContent = labels[currentStep];
      currentStep++;
      setTimeout(nextStep, 3000);
    }
  }

  // 重置
  steps.forEach((s, i) => {
    const el = document.getElementById(s);
    el.classList.remove('active', 'done');
    el.textContent = labels[i];
  });

  nextStep();
}

// ===== Toast 通知 =====

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== 工具函式 =====

function getSentimentEmoji(sentiment) {
  switch (sentiment) {
    case '正面': return '😊';
    case '負面': return '😟';
    case '中性': return '😐';
    default: return '❓';
  }
}

function getSentimentClass(sentiment) {
  switch (sentiment) {
    case '正面': return 'positive';
    case '負面': return 'negative';
    case '中性': return 'neutral';
    default: return 'neutral';
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '未知';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分鐘前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小時前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';

    return date.toLocaleDateString('zh-TW');
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 響應式圖表重繪
window.addEventListener('resize', () => {
  if (allArticles.length > 0) {
    loadDashboard();
  }
});
