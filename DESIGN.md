# 智股舆情 - 设计文档

> **文档状态**: 活跃维护中
> **最后更新**: 2026-02-22
> **版本**: v0.1.0-mvp

## 文档说明

本文档是项目的**单一真实来源 (Single Source of Truth)**，包含架构设计、接口契约、验证记录和变更历史。

**产品需求文档 (PRD)** 请参考项目根目录的 `PRD.md`（如有）或产品团队提供的文档。

---

## 目录

1. [当前架构 (Current Architecture)](#当前架构)
2. [接口契约 (Interface Contracts)](#接口契约)
3. [验证日志 (Verification Log)](#验证日志)
4. [变更日志 (Change Log)](#变更日志)

---

## 当前架构

### 技术栈概览

**当前实现 (MVP 阶段)**:
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite (better-sqlite3)
- **实时通信**: WebSocket (ws)
- **AI 服务**: Google Gemini API

**PRD 目标技术栈** (生产环境):
- 前端: Uni-app (Vue 3 + Vite + Pinia) - 跨端支持
- 后端: Python + FastAPI
- 数据库: PostgreSQL + Redis
- 部署: TencentOS Server 3.1 + Docker

**技术选型说明**:
- 当前为 Web MVP 快速验证阶段
- 跨端能力、Python 数据处理生态将在后续迭代中引入
- 数据库迁移路径: SQLite → PostgreSQL (生产)

### 服务抽象层架构

**设计原则**: 使用接口抽象外部依赖，支持 Mock 和真实实现无缝切换

**当前服务层结构**:
```
src/services/
├── interfaces/              # 服务接口定义
│   ├── IStockDataService.ts          # 股票行情数据接口
│   ├── ISentimentCrawlerService.ts   # 舆情采集接口
│   └── IHeatCalculatorService.ts     # 热度计算接口
├── implementations/
│   ├── mock/               # Mock 实现 (当前使用)
│   │   ├── MockStockDataService.ts
│   │   ├── MockSentimentCrawlerService.ts
│   │   └── MockHeatCalculatorService.ts
│   └── real/               # 真实实现 (待开发)
│       ├── AkShareStockDataService.ts      (TODO)
│       ├── RealSentimentCrawlerService.ts  (TODO)
│       └── RealHeatCalculatorService.ts    (TODO)
└── ServiceFactory.ts       # 服务工厂 (统一管理)
```

**配置切换**:
- 环境变量 `USE_MOCK_SERVICES=true` → 使用 Mock 实现
- 环境变量 `USE_MOCK_SERVICES=false` → 使用真实实现

**占位实现说明**:

| 服务 | 当前实现 | 目标实现 | 迁移时机 |
|------|---------|---------|---------|
| 股票数据 | MockStockDataService | AkShareStockDataService (Python) | 后端切换到 FastAPI |
| 舆情采集 | MockSentimentCrawlerService | RealSentimentCrawlerService (爬虫) | 后端切换到 FastAPI |
| 热度计算 | MockHeatCalculatorService | RealHeatCalculatorService (三因子) | 接入真实数据后 |

**迁移路径**:
1. 在 `implementations/real/` 目录实现真实服务类
2. 在 `ServiceFactory.ts` 中导入真实实现
3. 设置环境变量 `USE_MOCK_SERVICES=false`
4. 测试验证后部署

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web (React) │  │ 小程序(未来) │  │  App (未来)  │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
└─────────┼───────────────────────────────────────────────────┘
          │
          │ HTTP/WebSocket
          │
┌─────────▼───────────────────────────────────────────────────┐
│                     API Gateway Layer                        │
│                    (Express Server)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  REST API    │  │  WebSocket   │  │  Static      │      │
│  │  Endpoints   │  │  Handler     │  │  Assets      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
└─────────┼──────────────────┼───────────────────────────────┘
          │                  │
          │                  │
┌─────────▼──────────────────▼───────────────────────────────┐
│                     Business Logic Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Stock       │  │  User        │  │  Prediction  │     │
│  │  Service     │  │  Service     │  │  Service     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼────────────┐
│                      Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  SQLite DB   │  │  Gemini AI   │  │  WebSocket   │     │
│  │  (本地存储)  │  │  (舆情分析)  │  │  (实时推送)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 数据模型

**当前实现的表结构**:

```sql
-- 用户表
users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  mobile TEXT UNIQUE,
  reputation INTEGER DEFAULT 0,
  is_pro INTEGER DEFAULT 0,
  avatar TEXT,
  wx_openid TEXT,  -- 微信 OpenID (v0.1.3 新增)
  member_expire_at INTEGER  -- Pro 会员到期时间 (v0.1.3 新增)
)

-- 股票表
stocks (
  symbol TEXT PRIMARY KEY,
  name TEXT,
  price REAL,
  change_percent REAL,
  volume REAL,
  heat_score REAL DEFAULT 0,
  market TEXT,  -- 'A' or 'HK'
  industry TEXT,
  sentiment_score REAL DEFAULT 0,  -- 舆情分 (v0.1.3 新增)
  reason_tags TEXT,  -- 热度归因标签 JSON (v0.1.3 新增)
  last_heat_update INTEGER  -- 最后热度更新时间 (v0.1.3 新增)
)

-- 标签表
tags (
  id INTEGER PRIMARY KEY,
  stock_symbol TEXT,
  content TEXT,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  is_hidden INTEGER DEFAULT 0
)

-- 弹幕表
danmaku (
  id INTEGER PRIMARY KEY,
  stock_symbol TEXT,
  user_id INTEGER,
  content TEXT,
  timestamp INTEGER,  -- 用于 K 线时间轴联动
  likes INTEGER DEFAULT 0
)

-- 预测表
predictions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  stock_symbol TEXT,
  direction INTEGER,  -- 1=看涨, -1=看跌
  status TEXT DEFAULT 'pending',  -- pending/win/loss
  prediction_price REAL,  -- 预测时的价格 (v0.1.3 新增)
  settled_at INTEGER,  -- 结算时间 (v0.1.3 新增)
  created_at INTEGER
)

-- 自选股表
watchlist (
  user_id INTEGER,
  stock_symbol TEXT,
  PRIMARY KEY (user_id, stock_symbol)
)

-- 声望历史表 (新增)
reputation_history (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  event TEXT,  -- 'danmaku_liked', 'prediction_win', 'prediction_loss'
  change INTEGER,
  reason TEXT,
  timestamp INTEGER
)
```

**与 PRD 的差异**:
- ✅ `wx_openid` 字段已添加 (v0.1.3)
- ✅ `member_expire_at` 字段已添加 (v0.1.3)
- ✅ `predictions.status` 字段实现 (pending/win/loss)
- ✅ `predictions.prediction_price` 字段已添加 (v0.1.3)
- ✅ `stocks.sentiment_score` 字段已添加 (v0.1.3)
- ✅ `stocks.reason_tags` 字段已添加 (v0.1.3)
- ❌ 无独立的 `StockHeat` 表 (热度数据合并在 stocks 表，更高效)
- ✅ 新增 `reputation_history` 表 (声望变更记录)
- ✅ 新增 `schema_version` 表 (数据库版本管理)

**数据库索引** (v0.1.3 新增):
- `idx_danmaku_timestamp` - 优化弹幕时间轴查询
- `idx_predictions_status` - 优化预测结算查询
- `idx_reputation_history_user` - 优化声望历史查询

### 核心功能模块

#### 已实现功能
- ✅ 股票热度榜单 (三因子算法 - 使用 Mock 数据)
- ✅ 个股详情页
- ✅ 弹幕系统 (WebSocket 实时)
- ✅ 弹幕点赞 (触发声望变化)
- ✅ 涨跌预测投票 (含时间窗口验证)
- ✅ 预测窗口期限制 (前日 16:00 - 当日 09:25)
- ✅ 预测结算逻辑 (自动结算 + 声望奖励)
- ✅ 声望系统规则 (弹幕获赞 +1, 预测成功 +100)
- ✅ 声望等级系统 (新手/入门/进阶/高手/大神/传奇)
- ✅ 高声望用户预测过滤 (Pro 功能)
- ✅ 自选股监控
- ✅ AI 标签验证 (Gemini)
- ✅ AI 舆情归因 (Gemini, Pro 功能)
- ✅ 热度归因详情 (Pro 功能)

#### 未实现功能
- ❌ 微信登录 + 手机号绑定
- ❌ 外部舆情抓取 (雪球/东财/财联社) - 已有 Mock 实现
- ❌ K 线与弹幕时间轴联动 (需前端配合)
- ❌ 自选股宫格模式 (9 宫格 + Sparkline) - 需前端实现
- ❌ 交易接口 (富途/平安证券)
- ❌ 支付系统 (微信/支付宝)
- ❌ 异动推送

---

## 接口契约

### REST API 规范

**基础信息**:
- Base URL: `http://localhost:3000/api`
- Content-Type: `application/json`
- 认证: 暂无 (MVP 阶段)

### 股票相关接口

#### GET /api/stocks
获取股票列表

**Query Parameters**:
```typescript
{
  market?: 'A' | 'HK' | 'All',  // 市场筛选
  industry?: string | 'All',     // 行业筛选
  cycle?: string                 // 周期 (未使用)
}
```

**Response**:
```typescript
Array<{
  symbol: string,
  name: string,
  price: number,
  change_percent: number,
  volume: number,
  heat_score: number,
  market: 'A' | 'HK',
  industry: string,
  tags: string  // JSON array string
}>
```

#### GET /api/stocks/:symbol
获取单个股票详情

**Response**:
```typescript
{
  symbol: string,
  name: string,
  price: number,
  change_percent: number,
  volume: number,
  heat_score: number,
  market: 'A' | 'HK',
  industry: string
}
```

#### GET /api/stocks/:symbol/attribution
获取股票热度归因 (Pro 功能)

**Response**:
```typescript
{
  sentiment: 'positive' | 'negative' | 'neutral',
  score: number,  // 0-100
  reasons: string[],
  institutions: string[]
}
```

### 标签相关接口

#### GET /api/stocks/:symbol/tags
获取股票标签列表

**Response**:
```typescript
Array<{
  id: number,
  stock_symbol: string,
  content: string,
  likes: number,
  dislikes: number,
  is_hidden: 0 | 1
}>
```

#### POST /api/stocks/:symbol/tags
创建新标签 (AI 验证)

**Request Body**:
```typescript
{
  content: string
}
```

**Response**:
```typescript
{
  success: boolean,
  error?: string  // AI 拒绝原因
}
```

#### POST /api/tags/:id/vote
标签点赞/踩

**Request Body**:
```typescript
{
  type: 'like' | 'dislike'
}
```

**Response**:
```typescript
{
  success: boolean
}
```

**业务规则**:
- 踩数 >= 5 时自动隐藏标签

### 预测相关接口

#### POST /api/predictions
提交涨跌预测

**Request Body**:
```typescript
{
  user_id: number,
  stock_symbol: string,
  direction: 1 | -1  // 1=看涨, -1=看跌
}
```

**Response**:
```typescript
{
  success: boolean,
  error?: string  // 如果验证失败，返回错误信息
}
```

**业务规则**:
- 预测窗口期: 前日 16:00 至当日 09:25
- 超出窗口期返回 400 错误

#### GET /api/predictions/stats/:symbol
获取预测统计

**Response**:
```typescript
{
  bull: number,  // 看涨人数
  bear: number   // 看跌人数
}
```

#### GET /api/predictions/stats/:symbol/high-reputation
获取高声望用户预测统计 (Pro 功能)

**Query Parameters**:
```typescript
{
  min_reputation?: number  // 最低声望要求，默认 1000
}
```

**Response**:
```typescript
{
  bull: number,
  bear: number,
  bullRatio: number,  // 看涨比例 (%)
  bearRatio: number,  // 看跌比例 (%)
  totalUsers: number  // 高声望用户总数
}
```

### 自选股接口

#### GET /api/watchlist/:user_id
获取用户自选股

**Response**:
```typescript
Array<{
  symbol: string,
  name: string,
  price: number,
  change_percent: number,
  heat_score: number,
  rank: number,        // 热度排名
  bull_count: number,  // 看涨人数
  bear_count: number   // 看跌人数
}>
```

#### POST /api/watchlist
添加自选股

**Request Body**:
```typescript
{
  user_id: number,
  stock_symbol: string
}
```

#### DELETE /api/watchlist
删除自选股

**Request Body**:
```typescript
{
  user_id: number,
  stock_symbol: string
}
```

### 声望系统接口

#### GET /api/user/:id/reputation
获取用户声望信息

**Response**:
```typescript
{
  reputation: number,
  level: number,  // 等级 (1-6)
  title: string,  // 等级称号 (新手/入门/进阶/高手/大神/传奇)
  nextLevelReputation: number,  // 下一等级所需声望
  isHighReputationUser: boolean  // 是否为高声望用户 (>= 1000)
}
```

#### GET /api/user/:id/prediction-stats
获取用户预测统计

**Response**:
```typescript
{
  total: number,  // 总预测数
  wins: number,  // 成功数
  losses: number,  // 失败数
  pending: number,  // 待结算数
  winRate: number  // 胜率 (%)
}
```

#### POST /api/danmaku/:id/like
弹幕点赞 (触发声望变化)

**Response**:
```typescript
{
  success: boolean
}
```

**业务规则**:
- 弹幕被点赞，发布者声望 +1

### 热度系统接口

#### GET /api/heat/ranking
获取热度排行榜

**Query Parameters**:
```typescript
{
  limit?: number  // 返回数量，默认 50
}
```

**Response**:
```typescript
Array<{
  symbol: string,
  name: string,
  heat_score: number,
  rank: number
}>
```

#### GET /api/stocks/:symbol/heat-attribution
获取股票热度归因详情 (Pro 功能)

**Response**:
```typescript
{
  symbol: string,
  heat_score: number,
  factors: {
    turnover: { score: number, weight: 0.4, contribution: number },
    sentiment: { score: number, weight: 0.3, contribution: number },
    interaction: { score: number, weight: 0.3, contribution: number }
  },
  reason_tags: string[],
  sentiment_details: {
    total_mentions: number,
    mention_growth_rate: number,
    positive_ratio: number,
    negative_ratio: number,
    hot_keywords: string[],
    articles: Array<{...}>
  }
}
```

### 管理员接口

#### POST /api/admin/calculate-heat
手动触发热度计算

**Response**:
```typescript
{
  success: boolean,
  updated: number  // 更新的股票数量
}
```

#### POST /api/admin/settle-predictions
手动触发预测结算

**Response**:
```typescript
{
  total: number,  // 结算总数
  wins: number,  // 成功数
  losses: number,  // 失败数
  reputationAwarded: number  // 发放的总声望
}
```

### WebSocket 协议

**连接地址**: `ws://localhost:3000`

#### 客户端 → 服务端

**发送弹幕**:
```typescript
{
  type: 'danmaku',
  stock_symbol: string,
  user_id: number,
  content: string
}
```

#### 服务端 → 客户端

**弹幕广播**:
```typescript
{
  type: 'danmaku',
  payload: {
    id: number,
    stock_symbol: string,
    user_id: number,
    content: string,
    timestamp: number,
    username: string
  }
}
```

**价格更新** (每 5 秒):
```typescript
{
  type: 'price_update',
  payload: Array<Stock>
}
```

---

## 验证日志

### 最近验证记录

#### 2026-02-22: 初始架构验证

**验证项目**:
- ✅ 数据库表结构创建成功
- ✅ REST API 基础功能可用
- ✅ WebSocket 实时弹幕正常
- ✅ Gemini AI 标签验证可用
- ✅ 价格模拟更新正常

**已知问题**:
- ⚠️ 无用户认证，user_id 硬编码为 1
- ✅ 热度算法已实现三因子计算 (使用 Mock 数据)
- ✅ 预测结算逻辑已实现
- ✅ 声望系统规则已实现

**性能指标**:
- API 响应时间: < 50ms (本地 SQLite)
- WebSocket 延迟: < 100ms
- 并发支持: 未测试

#### 2026-02-23: 核心功能模块实现

**验证项目**:
- ✅ 声望系统规则正常工作
- ✅ 预测时间窗口验证正常
- ✅ 预测结算逻辑正常
- ✅ 热度三因子算法正常 (Mock 数据)
- ✅ 高声望用户过滤正常
- ✅ 弹幕点赞触发声望变化

**已知问题**:
- ⚠️ 预测价格使用当前价格 (应使用历史价格)
- ⚠️ 收盘价使用当前价格 (应调用真实 API)
- ⚠️ 热度算法使用 Mock 数据 (待接入真实数据源)

**性能指标**:
- 热度计算: < 100ms/股 (Mock 数据)
- 预测结算: < 50ms/条
- 声望更新: < 10ms/次

### 待验证项目

- [x] 热度三因子算法准确性 (Mock 数据验证通过)
- [x] 预测结算准确性 (逻辑验证通过)
- [x] 声望系统规则正确性 (验证通过)
- [ ] 真实数据源接入后的算法准确性
- [ ] K 线与弹幕时间轴同步
- [ ] 高并发场景 (100+ 用户)
- [ ] 数据库迁移 (SQLite → PostgreSQL)

---

## 变更日志

> **规则**: 任何代码修改前，必须先在此记录变更说明

### [未发布] - 待规划

#### 计划新增
- 微信登录 + 手机号绑定
- K 线与弹幕时间轴联动 (需前端配合)
- 自选股宫格模式 + Sparkline (需前端实现)
- 交易接口 (富途/平安证券)
- 支付系统 (微信/支付宝)
- 异动推送

#### 计划修改
- 数据库迁移至 PostgreSQL + Redis
- 后端重构为 FastAPI (Python)
- 前端重构为 Uni-app (跨端)
- 接入真实数据源 (AkShare + 爬虫)

### [0.1.2] - 2026-02-23

#### 新增
- 实现声望系统服务 (`ReputationService`)
  - 弹幕获赞 +1 声望
  - 预测成功 +100 声望
  - 声望等级系统 (新手/入门/进阶/高手/大神/传奇)
  - 高声望用户识别 (>= 1000)
- 实现预测服务 (`PredictionService`)
  - 预测时间窗口验证 (前日 16:00 - 当日 09:25)
  - 预测结果计算逻辑
  - 预测窗口期描述
- 实现预测结算服务 (`PredictionSettlementService`)
  - 自动结算待结算预测
  - 更新预测状态 (pending -> win/loss)
  - 自动发放声望奖励
  - 用户预测统计
- 实现热度算法服务 (`HeatAlgorithmService`)
  - 三因子算法 (成交 40% + 舆情 30% + 互动 30%)
  - 互动指标计算 (预测人数 + 弹幕密度)
  - 热度排行榜
  - 热度归因详情 (Pro 功能)
- 新增数据库表 `reputation_history` (声望变更记录)

#### API 新增
- `POST /api/danmaku/:id/like` - 弹幕点赞 (触发声望变化)
- `GET /api/predictions/stats/:symbol/high-reputation` - 高声望用户预测统计 (Pro)
- `GET /api/user/:id/reputation` - 用户声望信息
- `GET /api/user/:id/prediction-stats` - 用户预测统计
- `GET /api/heat/ranking` - 热度排行榜
- `GET /api/stocks/:symbol/heat-attribution` - 热度归因详情 (Pro)
- `POST /api/admin/calculate-heat` - 手动触发热度计算
- `POST /api/admin/settle-predictions` - 手动触发预测结算

#### 功能完成
- ✅ 声望系统规则
- ✅ 预测窗口期限制
- ✅ 预测结算与声望奖励
- ✅ 热度三因子算法 (使用 Mock 数据)
- ✅ 高声望用户预测过滤 (Pro 功能)

#### 技术债务清理
- ✅ 声望系统规则已实现
- ✅ 热度算法已实现 (Mock 数据)
- ✅ 预测结算逻辑已实现
- ⚠️ 仍需接入真实数据源

### [0.1.3] - 2026-02-23

#### 数据库优化
- 新增 `users.wx_openid` 字段 (微信登录准备)
- 新增 `users.member_expire_at` 字段 (Pro 会员到期时间)
- 新增 `stocks.sentiment_score` 字段 (舆情分)
- 新增 `stocks.reason_tags` 字段 (热度归因标签 JSON)
- 新增 `stocks.last_heat_update` 字段 (最后热度更新时间)
- 新增 `predictions.prediction_price` 字段 (预测时的价格)
- 新增 `predictions.settled_at` 字段 (结算时间)
- 新增 `schema_version` 表 (数据库版本管理)

#### 索引优化
- 新增 `idx_danmaku_timestamp` 索引 (优化弹幕时间轴查询)
- 新增 `idx_predictions_status` 索引 (优化预测结算查询)
- 新增 `idx_reputation_history_user` 索引 (优化声望历史查询)

#### 服务更新
- 更新 `PredictionSettlementService` 使用 `prediction_price` 字段
- 更新 `HeatAlgorithmService` 保存热度归因标签到数据库
- 更新 `POST /api/predictions` 接口记录预测价格

#### 迁移系统
- 创建数据库迁移脚本 `migrate-v0.1.3.ts`
- 实现自动迁移检测和执行
- 支持版本管理和回滚

#### 数据完整性提升
- ✅ 预测价格准确记录 (解决技术债务)
- ✅ 热度归因标签持久化
- ✅ 会员到期时间支持
- ✅ 微信登录字段准备

### [0.1.2] - 2026-02-23

#### 新增
- 创建服务抽象层架构
  - 定义 `IStockDataService` 接口 (股票行情数据)
  - 定义 `ISentimentCrawlerService` 接口 (舆情采集)
  - 定义 `IHeatCalculatorService` 接口 (热度计算)
- 实现 Mock 服务层 (占位实现)
  - `MockStockDataService`: 模拟股票行情数据
  - `MockSentimentCrawlerService`: 模拟舆情采集
  - `MockHeatCalculatorService`: 简化热度算法
- 创建 `ServiceFactory` 统一管理服务实例
- 添加环境变量 `USE_MOCK_SERVICES` 控制实现切换

#### 文档更新
- 在 DESIGN.md 中新增"服务抽象层架构"章节
- 在 DESIGN.md 中新增"技术栈迁移指南"章节
- 更新 .env.example 添加服务配置说明

#### 架构改进
- 支持 Mock 和真实实现无缝切换
- 为后续迁移到 FastAPI + AkShare 做好准备
- 所有外部 API 依赖均通过接口抽象，便于测试和替换

### [0.1.0] - 2026-02-22

#### 新增
- 初始化项目结构
- 实现基础 REST API
- 实现 WebSocket 实时通信
- 集成 Gemini AI 标签验证
- 实现自选股功能
- 实现涨跌预测投票

#### 技术债务
- 无用户认证系统
- 热度算法为静态值
- 无预测结算逻辑
- 无声望系统规则
- 数据库为 SQLite (非生产级)

---

## 附录

### 开发环境要求

- Node.js >= 18
- npm >= 9
- Gemini API Key

### 快速启动

```bash
npm install
npm run dev
```

### 相关文档

- [产品需求文档 (PRD)](./PRD.md) - 如有
- [API 测试集合](./docs/api-tests.md) - 待创建
- [部署指南](./docs/deployment.md) - 待创建

### 技术栈迁移指南

#### 阶段 1: 当前 MVP (已完成)
- ✅ React + Express + SQLite
- ✅ Mock 服务层 (占位实现)
- ✅ 基础功能验证

#### 阶段 2: 后端迁移到 FastAPI (计划中)

**迁移步骤**:
1. 搭建 FastAPI 项目结构
2. 实现真实服务类:
   - `AkShareStockDataService`: 使用 AkShare 获取实时行情
   - `RealSentimentCrawlerService`: 爬取雪球/东财/财联社
   - `RealHeatCalculatorService`: 实现三因子算法
3. 迁移数据库到 PostgreSQL + Redis
4. 实现定时任务 (Celery/TaskIQ):
   - 每 5 分钟更新热度分
   - 每日收盘后结算预测
5. 部署到 TencentOS + Docker

**技术债务清理**:
- 实现微信登录 + 手机号绑定
- 实现声望系统规则
- 实现预测结算逻辑
- 实现 K 线与弹幕时间轴联动

#### 阶段 3: 前端迁移到 Uni-app (计划中)

**迁移步骤**:
1. 使用 Uni-app 重构前端 (Vue 3 + Pinia)
2. 适配小程序、iOS、Android
3. 实现微信授权登录
4. 优化图表性能 (uCharts/ECharts)
5. 实现宫格模式 + Sparkline

#### 阶段 4: 商业化功能 (计划中)

**待实现功能**:
- 支付系统 (微信支付/支付宝)
- 交易接口 (富途/平安证券)
- 异动推送系统
- Pro 会员深度功能

---

**文档维护者**: 开发团队
**反馈渠道**: 项目 Issue 或团队会议
