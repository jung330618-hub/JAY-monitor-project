// ===================================================
// ② 分析模組 - 使用 LLM 進行情緒分析與摘要
// ===================================================
const { GoogleGenAI } = require('@google/genai');

let ai = null;

function isAPIKeyConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return key && key !== 'your_gemini_api_key_here' && key.length > 10;
}

function getGeminiClient() {
  if (!ai) {
    if (!isAPIKeyConfigured()) {
      console.warn('[分析] ⚠️  Gemini API Key 未設定，將使用備用關鍵字分析');
      return null;
    }
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }
  return ai;
}

/**
 * 驗證分析結果的合法性
 */
function validateAnalysis(result) {
  const validSentiments = ['正面', '負面', '中性'];
  if (!validSentiments.includes(result.sentiment)) {
    result.sentiment = '中性';
  }
  result.sentiment_score = parseFloat(result.sentiment_score);
  if (isNaN(result.sentiment_score) || result.sentiment_score < 0 || result.sentiment_score > 1) {
    result.sentiment_score = result.sentiment === '正面' ? 0.7 : result.sentiment === '負面' ? 0.3 : 0.5;
  }
  if (!result.summary || typeof result.summary !== 'string') {
    result.summary = '';
  }
  const validCategories = ['演唱會', '新歌', '影視', '代言', '生活', '爭議', '其他'];
  if (!validCategories.includes(result.category)) {
    result.category = '其他';
  }
  return result;
}

/**
 * 分析單篇文章的情緒和內容
 */
async function analyzeArticle(article) {
  const client = getGeminiClient();

  // 若 API 不可用，直接使用備用分析
  if (!client) {
    return fallbackAnalysis(article);
  }

  const prompt = `請分析以下關於周杰倫（Jay Chou）的新聞/資訊，並以 JSON 格式回覆。

標題: ${article.title}
內容摘要: ${article.snippet || '無'}
來源: ${article.source || '未知'}

請回覆以下 JSON 格式（只需回傳 JSON，不要 markdown 或其他文字標籤）:
{
  "sentiment": "正面/負面/中性",
  "sentiment_score": 0.0到1.0的數值（0=非常負面, 0.5=中性, 1.0=非常正面）,
  "summary": "一句話中文摘要",
  "category": "分類（演唱會/新歌/影視/代言/生活/爭議/其他）"
}`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: '你是專業的華語娛樂新聞分析師，專注於周杰倫（Jay Chou）相關資訊的情緒分析。',
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text);
    return validateAnalysis({
      sentiment: result.sentiment || '中性',
      sentiment_score: result.sentiment_score,
      summary: result.summary || article.title,
      category: result.category || '其他'
    });
  } catch (error) {
    console.error(`[分析] 🚀 Gemini 分析失敗: ${article.title} - ${error.message}`);
    // 若 API 呼叫失敗，使用基本關鍵字分析作為備案
    return fallbackAnalysis(article);
  }
}

/**
 * 批量分析文章
 */
async function analyzeArticles(articles) {
  console.log(`[分析] 開始分析 ${articles.length} 篇文章...`);
  const results = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`[分析] (${i + 1}/${articles.length}) ${article.title.substring(0, 30)}...`);

    const analysis = await analyzeArticle(article);
    results.push({ id: article.id, ...analysis });

    // 避免 API Rate Limit
    if (i < articles.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`[分析] 分析完成，共 ${results.length} 篇`);
  return results;
}

/**
 * 生成每日摘要報告
 */
async function generateDailySummary(articles) {
  if (!articles || articles.length === 0) {
    return { summary: '今日沒有搜集到周杰倫相關新聞。', events: '無' };
  }

  const client = getGeminiClient();
  if (!client) {
    return {
      summary: `今日共搜集 ${articles.length} 篇周杰倫相關新聞。`,
      events: articles.slice(0, 3).map(a => a.title).join('、')
    };
  }

  const articleList = articles
    .map((a, i) => `${i + 1}. [${a.sentiment || '未分析'}] ${a.title}`)
    .join('\n');

  const prompt = `以下是今日搜集到的周杰倫相關新聞，請生成一份精簡的每日摘要報告。

${articleList}

請以純 JSON 格式回覆（無額外格式化符號）:
{
  "summary": "200字以內的今日整體摘要，重點描述今天關於周杰倫的重要動態",
  "events": "重要事件列表，以逗號分隔"
}`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: '你是專業的娛樂新聞摘要編輯，擅長整理周杰倫相關新聞。',
        temperature: 0.5,
        responseMimeType: 'application/json'
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('[分析] Gemini 每日摘要生成失敗:', error.message);
    return {
      summary: `今日共搜集 ${articles.length} 篇周杰倫相關新聞。`,
      events: articles.slice(0, 3).map(a => a.title).join('、')
    };
  }
}

/**
 * 備用分析（當 API 不可用時）
 */
function fallbackAnalysis(article) {
  const text = `${article.title} ${article.snippet || ''}`;

  const positiveWords = ['演唱會', '新歌', '冠軍', '獲獎', '好評', '感動', '期待', '經典', '致敬', '驚喜', '合作', '突破', '回歸', '票房', '熱賣', '秒殺', '加場', '巡迴', '慶祝', '榮獲', '暖心', '浪漫', '幸福', '人氣'];
  const negativeWords = ['爭議', '批評', '質疑', '抄襲', '負面', '醜聞', '道歉', '取消', '延期', '失望', '炎上', '怒批', '翻車', '黑料', '退票', '差評', '崩壞', '槓上'];

  let score = 0.5;
  let sentiment = '中性';

  for (const word of positiveWords) {
    if (text.includes(word)) score += 0.1;
  }
  for (const word of negativeWords) {
    if (text.includes(word)) score -= 0.1;
  }

  score = Math.max(0, Math.min(1, score));

  if (score > 0.6) sentiment = '正面';
  else if (score < 0.4) sentiment = '負面';
  else sentiment = '中性';

  // 判斷分類
  let category = '其他';
  if (text.includes('演唱會') || text.includes('巡演')) category = '演唱會';
  else if (text.includes('新歌') || text.includes('專輯') || text.includes('MV')) category = '新歌';
  else if (text.includes('電影') || text.includes('影視') || text.includes('戲劇')) category = '影視';
  else if (text.includes('代言') || text.includes('品牌')) category = '代言';
  else if (text.includes('生活') || text.includes('家庭') || text.includes('昆凌')) category = '生活';

  return {
    sentiment,
    sentiment_score: parseFloat(score.toFixed(2)),
    summary: article.title,
    category
  };
}

module.exports = {
  analyzeArticle,
  analyzeArticles,
  generateDailySummary,
  fallbackAnalysis
};
