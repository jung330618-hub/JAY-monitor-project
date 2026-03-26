// ===================================================
// ① 搜集模組 - 從各種來源搜集周杰倫相關資訊
// ===================================================
const RSSParser = require('rss-parser');
const https = require('https');
const http = require('http');
const { searchNews } = require('duck-duck-scrape');

const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
});

// 搜尋關鍵字
const SEARCH_KEYWORDS = [
  '周杰倫 太陽之子',
  '周杰倫 新專輯',
  '周杰倫',
  'Jay Chou',
  '周杰倫 演唱會',
  '周杰倫 新歌'
];

/**
 * 帶重試機制的 RSS 搜尋
 */
async function fetchRSSWithRetry(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const feed = await parser.parseURL(url);
      return feed;
    } catch (error) {
      if (attempt < retries) {
        const waitMs = 1000 * Math.pow(2, attempt); // 指數退避: 1s, 2s
        console.log(`[搜集] 請求失敗，${waitMs / 1000}秒後重試 (${attempt + 1}/${retries})...`);
        await sleep(waitMs);
      } else {
        throw error;
      }
    }
  }
}

/**
 * 從 Google News RSS 搜集新聞
 */
async function searchGoogleNews(keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://news.google.com/rss/search?q=${encodedKeyword}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

  try {
    const feed = await fetchRSSWithRetry(url);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      source: item.creator || item.source?.name || 'Google News',
      snippet: stripHtml(item.contentSnippet || item.content || ''),
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
    }));
  } catch (error) {
    console.error(`[搜集] Google News 搜尋 "${keyword}" 失敗（已重試）:`, error.message);
    return [];
  }
}

/**
 * 從 Bing News RSS 搜集新聞（備用來源）
 */
async function searchBingNews(keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://www.bing.com/news/search?q=${encodedKeyword}&format=rss&mkt=zh-TW`;

  try {
    const feed = await fetchRSSWithRetry(url, 1);
    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      source: item.creator || 'Bing News',
      snippet: stripHtml(item.contentSnippet || item.content || ''),
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
    }));
  } catch (error) {
    console.error(`[搜集] Bing News 搜尋 "${keyword}" 失敗:`, error.message);
    return [];
  }
}

/**
 * 從 Tavily AI 搜集高品質新聞或資訊
 */
async function searchTavily(keyword) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === 'your_tavily_api_key_here') {
    return [];
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: keyword,
        search_depth: 'basic',
        include_images: false,
        max_results: 5,
        topic: 'news'
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return (data.results || []).map(item => {
      let hostname = 'Tavily';
      try { hostname = 'Tavily (' + new URL(item.url).hostname + ')'; } catch(e){}
      return {
        title: item.title || '',
        link: item.url || '',
        source: hostname,
        snippet: stripHtml(item.content || ''),
        published_at: item.published_date || new Date().toISOString()
      };
    });
  } catch (error) {
    console.error(`[搜集] Tavily 搜尋 "${keyword}" 失敗:`, error.message);
    return [];
  }
}

/**
 * 從 DuckDuckGo 搜集新聞（第二優先備案）
 */
async function searchDuckDuckGo(keyword) {
  try {
    const searchOptions = {
      safeSearch: 'Off',
      time: 'd' // 過去一天的資料
    };
    const results = await searchNews(keyword, searchOptions);
    return (results.results || []).slice(0, 10).map(item => ({
      title: item.title || '',
      link: item.url || '',
      source: item.source || 'DuckDuckGo News',
      snippet: stripHtml(item.excerpt || ''),
      published_at: item.date ? new Date(item.date * 1000).toISOString() : new Date().toISOString()
    }));
  } catch (error) {
    console.error(`[搜集] DuckDuckGo 搜尋 "${keyword}" 失敗:`, error.message);
    return [];
  }
}

/**
 * 從多個 RSS 來源搜集
 */
async function searchMultipleSources() {
  const startTime = Date.now();
  console.log('[搜集] 🔍 開始搜集周杰倫相關資訊...');
  const allArticles = [];
  const seen = new Set();

  function addUnique(articles) {
    for (const article of articles) {
      if (article.link && !seen.has(article.link)) {
        seen.add(article.link);
        allArticles.push(article);
      }
    }
  }

  // 1️⃣ 第一優先：Tavily AI 搜尋（高品質，專為 LLM 設計）
  if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== 'your_tavily_api_key_here') {
    for (const keyword of SEARCH_KEYWORDS) {
      console.log(`[搜集] Tavily AI (第一優先): "${keyword}"`);
      const tavilyArticles = await searchTavily(keyword);
      addUnique(tavilyArticles);
      console.log(`[搜集]   → 取得 ${tavilyArticles.length} 篇`);
      // 避免 API 頻率限制
      if (tavilyArticles.length > 0) await sleep(1000);
    }
  }

  // 2️⃣ 第二優先：若 Tavily 沒查到資料或未設定 API Key，啟用 DuckDuckGo
  if (allArticles.length === 0) {
    console.log('[搜集] ⚠️ Tavily 無資料或未設定，切換至備用搜尋引擎 DuckDuckGo');
    for (const keyword of SEARCH_KEYWORDS) {
      console.log(`[搜集] DuckDuckGo: "${keyword}"`);
      const ddgArticles = await searchDuckDuckGo(keyword);
      addUnique(ddgArticles);
      console.log(`[搜集]   → 取得 ${ddgArticles.length} 篇`);
      await sleep(1000);
    }
  }

  // 3️⃣ 兜底備案：如果前兩者都失敗，才使用傳統 RSS（Google News & Bing）
  if (allArticles.length === 0) {
    console.log('[搜集] ⚠️ 前兩者皆無資料，啟動最終備案 Google & Bing News');
    for (const keyword of SEARCH_KEYWORDS) {
      console.log(`[搜集] Google News: "${keyword}"`);
      const googleArticles = await searchGoogleNews(keyword);
      addUnique(googleArticles);
      console.log(`[搜集]   → 取得 ${googleArticles.length} 篇`);
      await sleep(1000);
    }
    const bingArticles = await searchBingNews('周杰倫');
    addUnique(bingArticles);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[搜集] ✅ 搜集完成: 共 ${allArticles.length} 篇不重複文章 (耗時 ${elapsed}s)`);
  return allArticles;
}

/**
 * 使用自訂搜尋（fetch JSON 來源）
 */
async function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON 解析失敗'));
        }
      });
    }).on('error', reject);
  });
}

// ===== 工具函式 =====

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  searchGoogleNews,
  searchBingNews,
  searchMultipleSources,
  SEARCH_KEYWORDS
};
