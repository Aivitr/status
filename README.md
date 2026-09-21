# Muxi Status

**GitHub 工程实时遥测看板 (GitHub Live Telemetry Dashboard)**

> Build in Public 2.0: 将沉睡在 Git 提交历史和 CI 流水线内部的工程脉动，转化为高透明度、高信息密度的实时交互式数字展台。

---

## 核心特性

- **实时心跳脉冲 (Live Pulse)** ── 毫秒级 Webhook 事件推送 + SWR 无感后台轮询，页面右上角呼吸灯始终跳动
- **Bento Grid 控制台布局** ── 12 列精密栅格，KPI 仪表舱 / 分析图表 / 实时终端一目了然
- **零侵入遥测 (Zero-Intrusion)** ── 被监控仓库不需改动一行代码，仅需配置标准 GitHub Webhook 回调地址
- **多项目配置化 (Multi-Project)** ── 单一 `projects.config.ts` 声明所有纳管仓库，路由自动生成
- **Visx 高密度图表** ── 基于 AirBnb `@visx/visx` 的 SVG 渲染，支持质量基准折线图与 Git 分支 DAG 拓扑
- **大屏投屏模式 (Kiosk / TV Mode)** ── 一键全屏，隐藏交互控件，自动轮播多项目
- **Clean Light / Industrial Dark 双主题** ── CSS 变量毫秒级重着色，支持 `prefers-color-scheme` 自动跟随

---

## 技术栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 框架 | **Next.js 16 (App Router)** | Route Handlers 提供 Serverless API，前后端同仓 |
| 视图 | **React 19** | Server Components + Client Components 混合渲染 |
| 语言 | **TypeScript 5 (Strict)** | 全链路类型安全，Zod 运行时校验 |
| 样式 | **Tailwind CSS v4** | 原生 CSS 变量映射 OKLCH 主题 Token |
| 图表 | **@visx/visx** | D3 级精度的 SVG 自定义渲染，折线图 / DAG / 火花线 |
| 缓存 | **Upstash Redis** | Serverless HTTP API，Edge Runtime 兼容，事件流 + 防抖锁 |
| 数据获取 | **SWR** | 客户端无感轮询，断网平滑降级 |
| 数据源 | **GitHub GraphQL / REST API** | 单次 GraphQL 批量查询，配额消耗极低 |
| 部署 | **Vercel** | 全球 CDN + Edge Functions + Cron Jobs |

---

## 架构概览

```text
 [浏览器 / 大屏 TV]
         |
         | SWR 轮询 (< 30KB JSON)
         v
 [Next.js Route Handlers / Edge Functions]
         |                           |
    读取聚合缓存               接收 GitHub Webhook
         v                           v
 [Upstash Redis]  <────────  [Webhook Handler]
    事件流 + 快照缓存                 |
         ^                     30s 防抖后触发
         |                     增量 GraphQL 拉取
         |                           |
 [Cron Worker]  ──────────>  [GitHub GraphQL API]
  定时全量轮询                   批量查询指标
```

**关键设计决策:**

1. **Webhook 作为事件闹钟**，不作为数据源。收到 `push` / `workflow_run` 通知后，平台自主调用 GitHub API 拉取完整数据
2. **Redis 键锁防抖** (`SET lock:refresh:{projectId} 1 EX 30 NX`)，30 秒内连续推送只触发一次重度拉取
3. **浏览器永不接触 GitHub Token**，凭据隔离在服务端，享受 5,000 次/小时 API 配额

---

## 快速开始

### 前置条件

- **Node.js** >= 18
- **pnpm** >= 9 (`corepack enable && corepack prepare pnpm@latest`)
- **GitHub Personal Access Token** (需要 `repo` 和 `read:org` 权限)
- **Upstash Redis** 实例 ([免费创建](https://console.upstash.com))

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/muxi-tech/muxi-status.git
cd muxi-status

# 安装依赖
pnpm install

# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，填入实际凭据 (见下方环境变量说明)

# 启动开发服务器
pnpm dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可看到看板。

### 构建与生产运行

```bash
pnpm build    # 生产构建
pnpm start    # 启动生产服务器
```

---

## 环境变量

在项目根目录创建 `.env.local`，参照 `.env.example`:

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `GITHUB_TOKEN` | 是 | GitHub Personal Access Token，用于调用 GraphQL / REST API |
| `WEBHOOK_SECRET` | 否 | 全局 GitHub Webhook 签名密钥，用于 HMAC-SHA256 验签 |
| `UPSTASH_REDIS_REST_URL` | 是 | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | 是 | Upstash Redis REST 鉴权令牌 |
| `CRON_SECRET` | 否 | Cron 定时任务鉴权密钥 (Vercel Cron 使用) |

### 细粒度凭据解析 (Granular Token Resolution)

平台支持多层级、细粒度的 GitHub Token 和 Webhook Secret 解析，以支持多组织、多仓库的不同权限隔离要求。解析优先级如下（以 `owner: muxi-tech`, `repo: muxi-core`, `id: muxi-core-web` 为例）：

**GitHub Token 解析顺序:**
1. 仓库配置直接指定: `config.auth.token`
2. 仓库配置指定环境变量名: `config.auth.githubTokenEnvVar` (如读取 `process.env.MY_SPECIAL_TOKEN`)
3. 仓库级自动映射: `GITHUB_TOKEN_MUXI_TECH_MUXI_CORE` 或项目 ID `GITHUB_TOKEN_MUXI_CORE_WEB`
4. 组织级自动映射: `GITHUB_TOKEN_MUXI_TECH`
5. 全局后备环境变量: `GITHUB_TOKEN`

**Webhook Secret 解析顺序:**
1. 仓库配置直接指定: `config.auth.webhookSecret`
2. 仓库配置指定环境变量名: `config.auth.webhookSecretEnvVar`
3. 仓库级自动映射: `WEBHOOK_SECRET_MUXI_TECH_MUXI_CORE` 或项目 ID `WEBHOOK_SECRET_MUXI_CORE_WEB`
4. 组织级自动映射: `WEBHOOK_SECRET_MUXI_TECH`
5. 全局后备环境变量: `WEBHOOK_SECRET`

**提示**: 自动映射规则会将特殊字符如 `-`、`.` 替换为下划线 `_` 并转为大写。

---

## 项目配置

编辑 `src/lib/config/projects.config.ts` 来声明需要监控的 GitHub 仓库:

```typescript
export const projectsConfig: ProjectConfig[] = [
  {
    id: 'my-project',           // 唯一标识，用于路由和 Redis 键
    name: 'My Project',         // 看板上的展示名称
    icon: '🚀',                 // Emoji 图标
    description: '项目简介',
    repository: {
      owner: 'your-org',       // GitHub Owner
      repo: 'your-repo',      // GitHub Repo 名
      defaultBranch: 'main',
    },
    theme: {
      preset: 'industrial-dark',  // 可选: industrial-dark | clean-light
    },
    features: {
      milestone: true,          // Milestone 进度追踪
      commitPulse: true,        // 24h 提交心跳火花线
      workflowRuns: true,       // GitHub Actions 状态
      gitBranchGraph: true,     // Git 分支 DAG 拓扑
      timeToShip: true,         // PR 合并时延统计
      // Tier 2 深度指标 (可选，需 CI 配合上传 Artifact)
      coverageTrend: {
        enabled: true,
        threshold: 80,          // 覆盖率最低红线 (%)
      },
      bundleBudget: {
        enabled: true,
        budgetKb: 250,          // 包体积预算上限 (KB)
      },
    },
  },
];
```

Tier 1 指标 (Milestone / Commit / CI / PR) 开箱即用，不需要被监控仓库做任何改动。

---

## 接入被监控仓库

### 步骤一: 配置 GitHub Webhook

在被监控仓库的 **Settings > Webhooks** 中添加:

| 配置项 | 值 |
|--------|----|
| Payload URL | `https://your-domain.com/api/webhooks/github` |
| Content type | `application/json` |
| Secret | 与 `WEBHOOK_SECRET` 环境变量一致 |
| Events | 勾选: `Pushes`, `Pull requests`, `Workflow runs`, `Releases` |

### 步骤二 (可选): 开启 Tier 2 深度指标

如果需要测试覆盖率和包体积追踪，在被监控仓库的 CI 流水线尾部添加 Artifact 上传步骤:

```yaml
# .github/workflows/ci.yml
- name: Upload Telemetry Report
  if: always() && github.ref == 'refs/heads/main'
  uses: actions/upload-artifact@v4
  with:
    name: telemetry-report
    path: |
      coverage/coverage-summary.json
      dist/bundle-stats.json
    retention-days: 1
```

看板平台会在收到 `workflow_run` 完成通知后自动下载并解析 Artifact。未生成对应文件时静默跳过，不影响基础面板。

---

## 部署

### Vercel (推荐)

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 一键部署
vercel
```

在 Vercel 项目设置中添加上述环境变量。Cron 定时任务通过 `vercel.json` 配置，无需额外设置。

### 其他平台

本项目是标准 Next.js 应用，兼容任何支持 Node.js >= 18 的平台:

- **Cloudflare Pages**: 通过 `@cloudflare/next-on-pages` 适配
- **Docker**: `pnpm build && pnpm start`，监听 3000 端口
- **自托管 VPS**: 配合 PM2 或 systemd 运行

---

## 项目结构

```
src/
├── app/                    # Next.js App Router 路由
│   ├── api/                # Route Handlers (Webhook / Telemetry API / Cron)
│   └── [locale]/           # 页面组件
├── components/             # UI 组件 (KPI 卡片 / 图表 / 终端 / 主题切换)
├── context/                # React Context (项目切换 / 主题)
├── hooks/                  # SWR 数据获取 Hooks
└── lib/                    # 核心逻辑
    ├── config/             # projects.config.ts 项目配置
    ├── github/             # GitHub GraphQL 客户端
    ├── redis/              # Upstash Redis 服务层
    └── types/              # TypeScript 类型定义
```

---

## 遥测指标体系

### Tier 1: 零配置基线 (Universal Baseline)

仅依赖标准 GitHub API，仓库填入 `owner/repo` 即可全部点亮:

- **Commit 心跳火花线**: 24 小时按小时分布的提交活跃度
- **PR 漏斗**: Open / Merged / Closed 状态统计
- **CI 流水线状态**: 最新 Workflow Run 的实时状态与耗时
- **Milestone 冲刺进度**: 版本号、工期倒计时、Issue 关闭比例
- **Time-to-Ship**: PR 从创建到合并的平均时延 (Mean & P95)
- **实时事件终端**: PR 合入、CI 触发、Release 发布的秒级事件流

### Tier 2: 深度扩展 (Opt-In Deep Metrics)

通过 CI Artifact 上传开启，在配置中声明 `enabled: true`:

- **测试覆盖率趋势**: 行覆盖率 / 分支覆盖率随 Commit 推进
- **构建产物体积预算**: 包体积曲线与报警阈值
- **服务可用率 SLA**: HTTP 探活成功率 (规划中)

---

## 设计理念

**"工程脉动，而非粉饰太平。"**

这个看板的核心理念是 **Radical Engineering Transparency**。它公开真实的工程起伏，包括 CI 构建失败、测试用例回归、Bug 积压与修复耗时。这种敢于公开工程波折的自信，恰恰能建立极其强大的专业公信力。

视觉上采用工业控制台美学: 等宽数值防止跳动、OKLCH 色彩空间保证感知均匀、Bento Grid 栅格实现高密度信息排布、十字准星标记营造精密仪器质感。

---

## License

MIT
