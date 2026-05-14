require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

// 中间件
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// MongoDB 连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carCalculator';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => {
    console.error('MongoDB 连接失败:', err);
    process.exit(1);
  });

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/records', require('./routes/records'));

// ========== 浏览器搜索路由 ==========
// 汽车网站搜索配置
const CAR_SITES = [
  { name: '汽车之家', url: 'https://www.autohome.com.cn', searchPath: '/grade/carhtml/' },
  { name: '懂车帝', url: 'https://www.dongchedi.com', searchPath: '/search?keyword=' },
  { name: '太平洋汽车', url: 'https://www.pcauto.com.cn', searchPath: '/search/' },
  { name: '易车', url: 'https://www.yiche.com', searchPath: '/chexun/' }
];

// 通用搜索函数
async function searchSite(site, keyword) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' });

    let searchUrl;
    if (site.name === '汽车之家') {
      // 汽车之家使用车型大全页面
      const brandLetter = keyword.charAt(0).toUpperCase();
      searchUrl = `${site.url}${site.searchPath}${brandLetter}.html`;
    } else if (site.name === '懂车帝') {
      searchUrl = `${site.url}${site.searchPath}${encodeURIComponent(keyword)}`;
    } else if (site.name === '太平洋汽车') {
      searchUrl = `${site.url}${site.searchPath}?keyword=${encodeURIComponent(keyword)}`;
    } else if (site.name === '易车') {
      searchUrl = `${site.url}${site.searchPath}?key=${encodeURIComponent(keyword)}`;
    } else {
      searchUrl = `${site.url}/search?keyword=${encodeURIComponent(keyword)}`;
    }

    console.log(`[搜索] ${site.name}: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 等待内容加载
    await new Promise(r => setTimeout(r, 2000));

    // 获取页面内容
    const result = await page.evaluate(() => {
      // 获取标题
      const title = document.title || '';
      // 获取body文本前2000字符
      const bodyText = document.body ? document.body.innerText.substring(0, 2000) : '';
      // 获取主要链接
      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 20)
        .map(a => ({
          text: a.innerText?.trim() || '',
          href: a.href || ''
        }))
        .filter(l => l.text && l.href && l.href.startsWith('http'));

      return { title, bodyText, links };
    });

    await browser.close();

    return {
      site: site.name,
      url: searchUrl,
      ...result,
      success: true
    };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return {
      site: site.name,
      url: searchUrl || site.url,
      error: err.message,
      success: false
    };
  }
}

// 搜索所有汽车网站
app.post('/api/search', async (req, res) => {
  const { keyword, type = 'all' } = req.body;

  if (!keyword || keyword.trim().length < 2) {
    return res.status(400).json({ success: false, error: '关键词至少2个字符' });
  }

  console.log(`[搜索请求] 关键词: ${keyword}, 类型: ${type}`);

  try {
    let sitesToSearch = CAR_SITES;
    if (type === 'pros-cons') {
      // 优缺点评测搜索
      sitesToSearch = CAR_SITES.slice(0, 2); // 只搜索前两个
    } else if (type === 'discount') {
      // 优惠政策搜索
      sitesToSearch = CAR_SITES.slice(2, 4); // 只搜索后两个
    }

    // 并行搜索所有网站
    const results = await Promise.all(
      sitesToSearch.map(site => searchSite(site, keyword))
    );

    // 格式化返回结果
    const formattedResults = results.map(r => ({
      site: r.site,
      url: r.url,
      title: r.title,
      snippet: r.bodyText,
      links: r.links,
      success: r.success,
      error: r.error
    }));

    res.json({
      success: true,
      keyword,
      results: formattedResults,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[搜索错误]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 单网站深度搜索
app.post('/api/search/site', async (req, res) => {
  const { siteName, keyword, path = '' } = req.body;

  const site = CAR_SITES.find(s => s.name === siteName);
  if (!site) {
    return res.status(400).json({ success: false, error: '不支持的网站' });
  }

  try {
    const result = await searchSite(site, keyword);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    searchEnabled: true
  });
});

// 提供本地车型数据库文件
const fs = require('fs');
const path = require('path');
const DB_FILE_PATH = path.join('D:', 'work', 'dataCollect', 'result', 'car_data.db');
app.get('/api/car-db', (req, res) => {
  if (!fs.existsSync(DB_FILE_PATH)) {
    return res.status(404).json({ success: false, error: '本地数据库文件不存在' });
  }
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="car_data.db"');
  fs.createReadStream(DB_FILE_PATH).pipe(res);
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误'
  });
});

// 启动服务器（本地开发）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`浏览器搜索功能已启用`);
});

// 导出 app（用于阿里云函数计算）
module.exports = app;
