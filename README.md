# 汽车落地价计算器 - 云端版

一个功能完善的汽车落地价计算工具，支持云端数据存储、多维度对比和汽车信息搜索功能。

## 功能特性

### 核心功能
- **智能计算**: 精确计算汽车落地价，支持购置税、保险、上牌费等各项费用
- **补贴支持**: 国家补贴与苏州地方补贴二选一
- **云端存储**: 用户数据云端保存，多设备同步
- **双视图对比**: 卡片视图与表格视图自由切换
- **评论备注**: 为每条记录添加备注说明

### 搜索功能
- **多站搜索**: 同时搜索汽车之家、懂车帝、太平洋汽车、易车四大平台
- **智能分类**: 支持优缺点评测、优惠政策等分类搜索
- **深度爬取**: 基于 Puppeteer 的浏览器自动化搜索

### 用户系统
- **JWT 认证**: 安全的用户注册与登录
- **个人设置**: 自定义用户名、默认城市等偏好

## 技术栈

| 层级 | 技术 |
|-----|------|
| 前端 | HTML5 + CSS3 + 原生 JavaScript (SPA) |
| 后端 | Node.js + Express |
| 数据库 | MongoDB (Mongoose ODM) |
| 搜索 | Puppeteer 浏览器自动化 |
| 部署 | 阿里云函数计算 (Serverless) |

## 项目结构

```
.
├── index.html                    # 前端主页面（单页应用）
├── README.md                     # 项目文档
└── car-calculator-server/        # 后端服务
    ├── index.js                  # Express 入口文件
    ├── package.json              # 依赖配置
    ├── .env.example              # 环境变量示例
    ├── models/
    │   ├── User.js               # 用户数据模型
    │   └── Record.js             # 计算记录模型
    ├── routes/
    │   ├── auth.js               # 认证相关路由
    │   └── records.js            # 记录管理路由
    └── middleware/
        └── auth.js               # JWT 认证中间件
```

## 快速开始

### 环境要求
- Node.js 18+
- MongoDB 实例（本地或云端）

### 1. 安装依赖

```bash
cd car-calculator-server
npm install
```

### 2. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件，填入以下信息
cat .env
```

**必需的环境变量：**

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb://user:pass@host:port/carCalculator?authSource=admin` |
| `JWT_SECRET` | JWT 签名密钥（建议32位以上随机字符串） | `your-super-secret-key-here` |
| `PORT` | 本地开发端口（可选，默认3000） | `3000` |

### 3. 本地开发

```bash
# 启动后端服务
npm start

# 或使用 nodemon 热重载
npm run dev
```

前端直接用浏览器打开 `index.html`，修改其中的 `API_BASE_URL` 为 `http://localhost:3000/api`。

### 4. 生产部署

#### 部署后端到阿里云函数计算

1. 登录 [阿里云函数计算控制台](https://fc.console.aliyun.com/)
2. 创建服务，运行时选择 **Node.js 18**
3. 将 `car-calculator-server` 目录打包上传
4. 配置环境变量（`MONGODB_URI`, `JWT_SECRET`）
5. 添加 HTTP 触发器，获取触发器地址

#### 部署前端

将 `index.html` 部署到任意静态托管服务：

- **阿里云 OSS** + CDN（推荐国内访问）
- **GitHub Pages**（免费）
- **Vercel / Netlify**（免费，海外访问快）
- **自有服务器**

**注意：** 部署后需修改 `index.html` 中的 `API_BASE_URL` 为实际后端地址。

## API 文档

### 认证接口

| 方法 | 路径 | 说明 | 请求体 |
|-----|------|------|--------|
| POST | `/api/auth/register` | 用户注册 | `{ username, password }` |
| POST | `/api/auth/login` | 用户登录 | `{ username, password }` |
| GET | `/api/auth/me` | 获取当前用户信息 | - |
| PUT | `/api/auth/settings` | 更新用户设置 | `{ defaultCity, ... }` |

### 记录接口

| 方法 | 路径 | 说明 | 认证 |
|-----|------|------|------|
| GET | `/api/records` | 获取所有记录 | 是 |
| POST | `/api/records` | 创建新记录 | 是 |
| GET | `/api/records/:id` | 获取单条记录 | 是 |
| PUT | `/api/records/:id` | 更新记录 | 是 |
| DELETE | `/api/records/:id` | 删除记录 | 是 |
| GET | `/api/records/stats/summary` | 获取统计摘要 | 是 |

### 搜索接口

| 方法 | 路径 | 说明 | 请求体 |
|-----|------|------|--------|
| POST | `/api/search` | 多站搜索 | `{ keyword, type }` |
| POST | `/api/search/site` | 单站深度搜索 | `{ siteName, keyword, path }` |

**搜索类型说明：**
- `type: 'all'` - 搜索所有网站
- `type: 'pros-cons'` - 优缺点评测（汽车之家、懂车帝）
- `type: 'discount'` - 优惠政策（太平洋汽车、易车）

### 健康检查

| 方法 | 路径 | 说明 |
|-----|------|------|
| GET | `/health` | 服务状态检查 |

## 配置说明

### MongoDB 配置

**阿里云 MongoDB：**
1. 登录 [阿里云控制台](https://www.aliyun.com/) → 云数据库 MongoDB 版
2. 创建实例（按量付费适合测试）
3. 创建数据库用户和密码
4. 获取连接地址（公网访问需开启公网地址）
5. **重要**：将函数计算的出口 IP 加入 MongoDB 白名单

**本地 MongoDB：**
```bash
# 使用 Docker 快速启动
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### CORS 配置

生产环境建议限制 CORS 为前端域名：

```javascript
// index.js 中修改
app.use(cors({
  origin: 'https://your-frontend-domain.com', // 替换为你的前端域名
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## 注意事项

1. **Puppeteer 依赖**：搜索功能需要 Chromium，阿里云函数计算可能需要额外配置层
2. **MongoDB 白名单**：确保函数计算的出口 IP 已加入 MongoDB 白名单
3. **HTTPS**：生产环境务必使用 HTTPS，JWT 在 HTTP 下不安全
4. **数据备份**：建议定期备份 MongoDB 数据
5. **搜索频率限制**：频繁搜索可能导致 IP 被汽车网站封禁

## 常见问题

**Q: 本地启动后前端无法连接后端？**
A: 检查 `index.html` 中的 `API_BASE_URL` 是否设置为 `http://localhost:3000/api`，并确保浏览器允许跨域请求。

**Q: MongoDB 连接失败？**
A: 检查连接字符串格式是否正确，确认 IP 已在 MongoDB 白名单中。

**Q: 搜索功能返回空结果？**
A: 目标网站可能更新了页面结构，或你的 IP 被暂时限制。建议降低搜索频率。

## 开发计划

- [ ] 支持更多汽车品牌和车型数据
- [ ] 添加价格趋势图表
- [ ] 支持导出 Excel/PDF 报告
- [ ] 微信小程序版本

## 许可证

MIT License - Copyright (c) 2026 WangYang

---

**作者**：WangYang (forza_wy@outlook.com)  
**版本**：v1.0.0  
**更新日期**：2026年5月
