require('dotenv').config();
const { searchMultipleSources } = require('./src/search/collector');

async function testSearchEngine() {
  console.log('--- 🚀 準備啟動搜尋引擎測試 ---');
  
  if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === 'your_tavily_api_key_here') {
    console.log('❌ 警告：你還沒有設定你的 TAVILY_API_KEY (.env 檔案)');
    console.log('👉 系統將會略過 Tavily，直接調用排名第二的 DuckDuckGo！');
  } else {
    console.log('✅ 已偵測到 TAVILY_API_KEY 配置！將啟動最高級 AI 搜尋。');
  }

  console.log('---------------------------------');
  // 開始搜尋
  await searchMultipleSources();
}

testSearchEngine();
