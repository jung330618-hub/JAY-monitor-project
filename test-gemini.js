require('dotenv').config();
const { analyzeArticle, generateDailySummary } = require('./src/analysis/analyzer');

async function testGeminiEngine() {
  console.log('--- 🤖 準備啟動 Gemini AI 引擎測試 ---');
  
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here') {
    console.log('❌ 警告：你還沒有設定你的 GEMINI_API_KEY (.env 檔案)');
    return;
  }
  
  console.log('✅ 已偵測到 GEMINI_API_KEY 配置！');
  console.log('---------------------------------');

  // 1. 測試單篇文章的情緒分析
  const sampleArticle = {
    title: '周杰倫大巨蛋演唱會秒殺！黃牛票飆天價引發粉絲怒火',
    snippet: '周杰倫即將在台北大巨蛋舉行演唱會，門票今天開賣。系統一開放瞬間湧入數十萬人，15萬張門票在5分鐘內被搶購一空。網路上許多黃牛甚至將票價炒高十倍，讓許多買不到的真粉絲非常生氣，紛紛要求主辦單位實名制抵制。',
    source: '測試新聞台'
  };

  console.log('🔍 正在讓 Gemini 分析測試文章...');
  console.log(`標題: ${sampleArticle.title}`);
  const analysisResult = await analyzeArticle(sampleArticle);
  console.log('📝 分析結果:', JSON.stringify(analysisResult, null, 2));

  // 2. 測試摘要產生
  console.log('\n🔍 正在讓 Gemini 產生綜合摘要...');
  const fakeArticles = [
    { title: '周杰倫推出最新情歌，感動百萬粉絲', sentiment: '正面' },
    { title: '演唱會黃牛問題嚴重，文化部表示將出手', sentiment: '負面' },
    { title: '周董代言名錶品牌，帥氣照片曝光', sentiment: '正面' }
  ];
  
  const summaryResult = await generateDailySummary(fakeArticles);
  console.log('📝 摘要結果:', JSON.stringify(summaryResult, null, 2));

  console.log('\n✅ 測試完畢！Gemini 運作正常！');
}

testGeminiEngine();
