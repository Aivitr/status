# GitHub 工程实时遥测看板 (GitHub Live Telemetry Dashboard)
## 架构设计、产品规范与落地实施终极白皮书

---

## 目录
1. [产品定位与核心理念](#第一部分-产品定位与核心理念)
2. [遥测指标库与状态设计](#第二部分-遥测指标库与状态设计)
3. [整体架构与前后端职责划分](#第三部分-整体架构与前后端职责划分)
4. [三层数据摄取与缓存管道](#第四部分-三层数据摄取与缓存管道)
5. [视觉规范与工业控制台美学](#第五部分-视觉规范与工业控制台美学)
6. [信息架构与组件交互设计](#第六部分-信息架构与组件交互设计)
7. [技术选型与阶段实施路线图](#第七部分-技术选型与阶段实施路线图)
8. [附录：数据契约、接口定义与开箱配置模板](#第八部分-附录数据契约接口定义与配置规范)

---

## 第一部分: 产品定位与核心理念

### 1.1 现实痛点与思考源起
在传统开源或软件项目协作中，团队对外展示项目进展往往依赖以下途径：
* **GitHub Projects / Trello 看板**：重在内部敏捷卡片流转，对外部关注者信息密度低且缺乏直观感知；
* **Release Changelog / 周期性周报**：以周或月为周期，属于离线事后总结，缺乏开发过程中的动态生命力；
* **CI 徽章 (Badges)**：只能传达静态的 Pass / Fail 二元结果，缺乏连续演进的数据纵深与工程上下文。

**小米 MiMo RL 训练看板 (`mimo.xiaomi.com/rl`) 的核心启发**：
它打破了模型发布才见分晓的黑盒模式，将底层训练的核心脉动（Step、Reward 曲线、GPU 集群健康度、即时资源消耗）直接转化为**高透明度、高信息密度的实时遥测仪表盘 (Live Telemetry)**。

### 1.2 目标受众与品牌诉求
本项目定位于 **面向外部关注者、技术品牌宣传与工程实力展示**，兼顾内部研发透明度：
1. **技术品牌与极客信任感**：直观向社区、潜在用户、投资人证明：这是一个具备顶级工程纪律、敏捷交付速度与严谨工程素养的团队。
2. **公开构建 (Build in Public) 资产**：将原本沉睡在 Git 提交历史和流水线内部的工程痕迹，转化为对外可公开分享、具备高传播度的交互式数字展台。
3. **彻底的真实工程透明度 (Radical Engineering Transparency)**：
   * 不做粉饰太平的“宣传屏”，而是全面公开真实的工程起伏（包括 CI 构建失败、测试用例回归、Bug 积压与修复耗时）。
   * 这种敢于公开工程波折的自信，恰恰如同 MiMo 看板公开 GPU 故障与巨大算力成本一样，能建立极其强大的专业公信力。

### 1.3 核心架构定位: 多项目配置化体系 (Multi-Project by Design)
看板不仅服务于单一项目，而是设计为**通用、多项目驱动的遥测系统**：
1. **集中配置文件驱动**：
   * 通过统一的配置文件（如 `projects.config.ts`）声明所有纳管的 GitHub 仓库。
   * 每个项目独立配置：仓库标识 (`owner/repo`)、默认分支、鉴权凭据 (独立或共享的 GitHub Token)、专属 Webhook Secret、自定义质量阈值等。
2. **多租户与路由解耦**：
   * 页面支持多项目无缝切换，路由支持 `/` 全景总览与 `/[projectId]` 专属驾驶舱。

### 1.4 交互角色模型: 观察者展台与轻量彩蛋 (Observer-First with Candy Features)
1. **核心定位**：访客首要角色是**“沉浸式观察者”**，看板优先保障高频刷新、平滑图表、无感数据下发的纯粹数字展台体验。
2. **轻量交互与点缀特性 (Candy Features)**：
   * **快捷多项目卡片流**：直观展示项目舰队。
   * **GitHub 原生联动**：实时展示当前 Star / Fork 计数，支持一键直达 GitHub。
   * **版本发布订阅**：提供轻量的 Webhook / RSS 订阅新 Release 提醒。
   * **深潜查看**：点击某个异常事件或 Commit 节点时，提供快速弹出抽屉查看本次变更的简要 Diff 统计，满足深度极客探究欲。

### 1.5 核心设计哲学: Build in Public 2.0 (Engineering Heartbeat)
1. **工程脉动 (Engineering Pulse)**：不仅展示结果，更呈现代码提交频率、分支活跃度与流水线跳动。
2. **质量与成本双轴 (Quality vs. Effort)**：如同训练模型时观察“性能提升 vs 资源消耗”，本项目观察“代码产出/行数变动 vs 测试覆盖率/打包体积/技术债”。
3. **极客掌控感 (Mission Control Aesthetic)**：摒弃平庸的后台管理界面，采用工业终端、航天控制台风格，让开发进展如同航天器发射或高频交易系统一般精密可见。

---

## 第二部分: 遥测指标库与状态设计

### 2.1 指标分层架构: 通用基线与可插拔扩展 (Tiered Metric Architecture)
考虑到不同接入项目的技术栈差异，看板采用**双层可插拔（Opt-in）设计**：
1. **Tier 1: 通用零配置基线 (Universal Baseline - 默认开启)**：
   * 仅依赖标准 GitHub API 与 Webhook，任何 GitHub 仓库只要填入 `owner/repo` 即可 100% 自动点亮。
   * 包括：Commit 频率脉冲、PR 流转状态、Milestone 进度、GitHub Actions 任务状态、Release 事件流。
2. **Tier 2: 深度工程扩展项 (Opt-In Deep Metrics - 按需配置)**：
   * 针对工程成熟度更高的项目，在配置文件中声明开启（如 `features.coverage: true`、`features.bundleBudget: true`）。
   * 看板根据配置动态渲染对应的卡片与图表插槽；未开启的模块在前端自动优雅折叠，保持布局严整。

### 2.2 通用基础指标库 (Tier 1: Universal Zero-Config)
* **实时心跳与状态 (Vital Pulse)**：
  * 主分支最新 GitHub Actions 任务状态：`RUNNING`（含毫秒耗时递增）、`PASSED`、`FAILED`（标明具体失败 Job）。
  * 活跃 Milestone 推进率：版本号、工期倒计时、Issue 关闭比例与分段发光进度条。
  * 24 小时代码心跳火花线 (Commit Sparkline)：展示全天时段的活跃度热力。
* **速率与流转 (Velocity)**：
  * 代码净吞吐：新增 (`+Additions`)、删除 (`-Deletions`)、净变动 (`Net LOC`)。
  * PR 漏斗：进行中 (Open)、已合入 (Merged)、已关闭 (Closed)。
  * 上线平均时延 (Time-to-Ship)：PR 从创建到最终合并的平均耗时 (Mean & P95)。
* **多项目概览态 (Multi-Repo Heartbeat)**：
  * 项目卡片流常驻各仓库最新流水线红绿灯状态。
* **实时事件终端 (Live Event Stream)**：
  * 终端窗口动态输出：PR 合入、CI 触发/通过、Issue 变动、Release 标签发布。

### 2.3 深度定制扩展指标库 (Tier 2: Opt-In Deep Metrics)
由各个项目根据自身需要在配置中激活，并在 CI 中注入官方产物上传步骤：
* **单测覆盖率演进 (Test Coverage)**：
  * 行覆盖率、分支覆盖率随 Commit 推进轨迹，设定最低红线（如 `>= 80%`）。
* **构建产物体积预算 (Bundle Size Budget)**：
  * 前端/客户端构建包体积曲线与报警阈值，监控隐性膨胀。
* **类型与代码洁净度 (Type & Code Cleanliness)**：
  * TypeScript 严格模式检查错误数与 Any 逃逸统计、ESLint 告警收敛轨迹。
* **工程缺陷韧性 (Resilience & MTTR)**：
  * CI 任务近 30 天成功率、构建挂掉后的平均恢复时长 (MTTR: Mean Time to Recovery)。
* **外部服务可用率 (Service Uptime SLA)**：
  * 接入项目线上实际服务的探活成功率 (HTTP 200 Ratio)。

---

## 第三部分: 整体架构与前后端职责划分

### 3.1 架构拓扑 (零侵入架构: Webhook 通知 + 平台自主采集)
```text
[外部访客浏览器 (Next.js 15 Client / React 19)]
                       |
                       | 1. HTTP SWR 极速读取 (<30KB 聚合数据)
                       v
         [Edge Function / Serverless API 网关]
            |                             |
     (读取缓存 / 边缘防穿透)         (接收标准 GitHub Webhook 通知)
            v                             v
  [Upstash Redis 缓存与事件流] <----- [GitHub Webhook Handler]
            ^                             |
            |                             | 30s 防抖唤醒增量拉取
            +-----------------------------+
            ^
            | 2. 平台定时全量轮询 + 自主抓取 Artifacts (Cron Trigger)
  [平台自主 Ingestion Worker] --------> [GitHub GraphQL / REST API]
```

### 3.2 为什么必须坚持“被监控仓库零侵入”设计？
1. **零配置与非侵入性 (Zero-Intrusion)**：
   * 目标仓库不需要改动一行代码，也不需要在 `.github/workflows` 中配置任何特殊的 cURL 上报脚本。
   * 唯一需要做的，是在 GitHub 仓库设置中配置一个标准的 Webhook 回调地址（指向本看板）。
2. **事件由 Webhook 即时通知**：
   * 仓库发生 `push`、`pull_request`、`workflow_run`（CI 完成）时，GitHub 官方系统自动向本平台投递通知，充当“事件闹钟”。
3. **平台自主抓取与解析度量**：
   * 收到通知或 Cron 到期后，平台主动调用 GitHub API（包括拉取 Actions 运行生成的 Artifacts 压缩包解析覆盖率和体积），彻底解耦。

### 3.3 必须使用 Serverless / Edge Function 的环节
1. **GitHub 凭据与多项目鉴权隔离**：
   * 服务端统一安全保管各仓库的 GitHub Token，浏览器不接触任何凭据，享受最高 5,000 次/小时配额。
2. **Webhook 接收与事件去重中继**：
   * 验证 GitHub 的 `X-Hub-Signature-256` 签名，保证事件源安全；对同一事件快速去重并入库，触发增量拉取。
3. **平台自主采集调度器 (Collector / Worker)**：
   * 运行定时任务（Cron）和事件响应拉取，调用 GitHub GraphQL / REST API，并将复杂数据清洗压缩为适合前端展示的轻量快照。
4. **边缘缓存与并发防穿透**：
   * 使用 Upstash Redis 缓存聚合结果，对外网并发访客提供毫秒级响应，避免高频请求击穿 GitHub API 配额。

### 3.4 纯前端 (Client-side) 的核心职责
1. **指标响应式状态管理**：使用 SWR 或 TanStack Query 进行无感后台轮询，断网平滑降级。
2. **高刷新率图形渲染**：基于 `@visx/visx` + 原生 SVG / Canvas 渲染密集波形与平滑图表。
3. **多项目视图管理与大屏投屏**：管理项目流光卡片切换与 Kiosk 自动轮播逻辑。

---

## 第四部分: 三层数据摄取与缓存管道

### 4.1 管道拓扑与数据流向
1. **标准通知层 (Webhook Push - 事件告知)**：
   * 被监控项目在 GitHub 仓库中配置 Webhook，监听 `push`、`pull_request`、`workflow_run`、`release`。
   * 收到事件后，秒级追加至 Redis 实时事件流，同时触发一次受控的轻量增量解析。
2. **主动轮询与聚合层 (Scheduled Pull - 平台自主拉取)**：
   * 看板内置 Cron 调度器（每 15-30 分钟保底执行一次）。
   * 由看板平台自主调用 GitHub GraphQL API，单次请求打包拉取 Milestone、PR 状态、近期提交统计。
3. **工件自主抓取层 (Artifact Ingestion - 深度度量解析)**：
   * 对于开启了单测覆盖率或包体积监控的项目，看板平台在收到 CI 完成的 Webhook 通知后，调用 GitHub Actions Artifacts API (`GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts`)。
   * 自动下载并解压名为 `telemetry-report` 的工件压缩包，读取 JSON 指标存入时序历史。

### 4.2 防抖机制与 GraphQL API 配额精算
1. **事件防抖与并发锁 (Event Debouncing)**：
   * 采用 Redis 键锁机制：`SET lock:refresh:{projectId} 1 EX 30 NX`。
   * 30 秒内的连续 Webhook 推送仅记录实时事件，重度数据拉取合并为一次执行，彻底杜绝请求风暴。
2. **GraphQL 批量单次查询**：
   * 单个 GraphQL 查询一次性合并获取仓库基本信息、未完成 Milestone、最新 20 个 PR 详细行数变动与 100 个 Commit 时间戳，单次仅消耗 1-2 点 GitHub API 配额。
   * 配合多 Token 配置支持，避免触碰 5,000 次/小时限制。

### 4.3 边缘缓存策略与键空间设计 (Edge Cache & Redis Schema)
* **Redis Key 规范**：
  * `telemetry:{projectId}:summary`：当前仓库所有指标的最新扁平快照（JSON 格式，< 30KB），TTL 1 小时。
  * `telemetry:{projectId}:events`：最近 50 条按时间倒序的工程事件流（List 结构）。
  * `telemetry:{projectId}:history`：按 Commit SHA 索引的质量指标历史序列。
* **HTTP 响应头边缘缓存**：
  * 前端访问接口直接命中边缘缓存，携带 `Cache-Control: public, s-maxage=15, stale-while-revalidate=60`，隔离绝大部分公网并发流量。

### 4.4 可直接复用的 GitHub Actions 产物上传模板 (Drop-in CI Template)
如果接入项目想要开启深度质量指标（单测覆盖率、打包体积），只需在其现有的 `.github/workflows/ci.yml` 尾部加上官方的工件归档操作即可：

```yaml
# 在被监控项目的 .github/workflows/ci.yml 中测试/打包步骤后加入
- name: Upload Telemetry Report Artifact
  if: always() && github.ref == 'refs/heads/main'
  uses: actions/upload-artifact@v4
  with:
    name: telemetry-report
    path: |
      coverage/coverage-summary.json
      dist/bundle-stats.json
    retention-days: 1
```

**看板服务端兼容的标准数据规范**：
* **`coverage/coverage-summary.json`**：原生兼容 Vitest / Jest / Istanbul 生成的报告格式：
  ```json
  {
    "total": {
      "lines": { "pct": 86.4 },
      "branches": { "pct": 82.1 }
    }
  }
  ```
* **`dist/bundle-stats.json`**：极简键值格式：
  ```json
  {
    "totalSizeBytes": 145820,
    "gzipSizeBytes": 42100,
    "timestamp": 1740000000
  }
  ```
若项目未生成对应文件，看板平台自动静默跳过，完全不影响基础面板运行。

---

## 第五部分: 视觉规范与工业控制台美学

### 5.1 全局可配置主题色彩系统 (Config-Driven Theme System)
色彩系统通过**配置文件完全驱动**，支持预设主题切换与自定义色值覆盖：
1. **预设主题方案 (Presets)**：
   * `industrial-dark` (默认)：冷深灰底舱 + 翠绿/青蓝发光点缀，偏硬核极客测控风。
   * `obsidian-minimal`：深邃纯黑 + 极简单色白灰高对比，偏高端极简风。
   * `clean-light`：柔和浅灰白底舱 + 深色文字与活泼强调色，适合明亮模式。
   * `custom`：完全由用户在配置文件中定义十六进制颜色。
2. **主题 Token 映射规范**：
   ```typescript
   interface ThemeConfig {
     preset?: 'industrial-dark' | 'obsidian-minimal' | 'clean-light' | 'custom';
     tokens?: {
       canvasBg: string;           // 页面背景底色
       panelSurface: string;       // 卡片与面板表面色
       panelBorder: string;        // 边框色
       accent: string;             // 品牌强调主色
       statusSuccess: string;      // 成功/通过状态色
       statusRunning: string;      // 运行中状态色
       statusWarning: string;      // 警告/临界状态色
       statusFailed: string;       // 失败/故障状态色
     };
   }
   ```
   前端自动根据当前项目配置将这些 Token 挂载为 CSS 原生变量（如 `var(--canvas-bg)`），全局自适应。

### 5.2 排版与亲和度系统 (Typography & Friendly Iconography)
1. **数值强制等宽化 (Tabular Numerics)**：
   * 所有指标数值、时间戳、Commit SHA 统一采用等宽字体（Geist Mono / JetBrains Mono / SF Mono）。
   * 全局开启 `font-variant-numeric: tabular-nums`，确保数值高频跳动时字符绝对稳定不抖动。
2. **兼顾专业度与非技术访客的亲和度 (Friendly & Accessible)**：
   * **允许并善用 Emoji 增强亲和力**：在里程碑目标、项目状态卡片、事件动态中使用生动形象的 Emoji 进行视觉传达（如使用火箭 🚀 标示版本冲刺、使用靶心 🎯 标示里程碑目标、使用沙漏 ⏳ 标示等待排队、使用火花 ✨ 标示新功能发布等）。
   * **微型标签与通俗化注解**：所有专业指标均配备通俗易懂的 Tooltip 浮层提示，将晦涩的“PR Time-to-Merge”解释为直观的“新功能平均上线周期”。

### 5.3 仪器质感与交互微动效 (Tactile & Micro-Motion)
1. **十字准星与标尺格线 (Crosshair Guides)**：在图表面板与卡片边缘点缀细腻的十字参考点，营造精密仪器测控台质感。
2. **实时遥测心跳呼吸灯 (Heartbeat Pulse)**：屏幕右上角常驻脉冲指示点，伴随柔和的双层扩散动画，直观传达当前与后端遥测信道的存活态与更新频率。
3. **贝塞尔平滑缓动与高频插值**：折线图和波形图数据刷新时，通过贝塞尔插值实现丝滑过渡，避免生硬跳变。
4. **终端打字机流式动效**：底部实时事件流新增记录时，带有微弱的光标闪烁与轻柔平移滑入效果。

---

## 第六部分: 信息架构与组件交互设计

整体采用 **Bento Grid（便当盒栅格）** 结合 **顶部项目舰队流 (Project Fleet Stream)** 的布局：

```text
+-----------------------------------------------------------------------------------------+
| [顶层全局状态栏] 品牌 Logo | 全局健康摘要 (GLOBAL NOMINAL) | 实时信道延时 (LIVE 28ms)      |
+-----------------------------------------------------------------------------------------+
| [顶部项目流光卡片舰队 (Horizontal Project Card Stream)]                                    |
| [项目A: Active ✨]  [项目B: Building ⏳]  [项目C: Nominal 🚀]  [项目D: Released 🎉] ...     |
+-----------------------------------------------------------------------------------------+
| [核心 KPI 仪表舱 (4 等分卡片)]                                                           |
|  [里程碑冲刺/倒计时]      [代码净吞吐净值]        [平均交付上线时延]      [24h 提交心跳波形] |
+--------------------------------------------+--------------------------------------------+
| [主分析图表 A: 质量基准与预算演进折线图]    | [主分析图表 B: 动态 Git 分支网络与提交图谱]   |
| (测试覆盖率 % 趋势 vs 包体积预算 KB)       | (多分支拓扑链路、分支状态、Commit 脉络节点)  |
+--------------------------------------------+--------------------------------------------+
| [底部终端: 实时工程动态流 (Live Terminal)]  | [底部舱位: 基础设施负载与部署可用率 SLA]     |
| (等宽逐行打印 PR/CI/Commit 实时事件流)     | (GitHub Actions 配额消耗表、在线服务探活)  |
+-----------------------------------------------------------------------------------------+
```

### 6.1 顶部项目流光卡片舰队 (Horizontal Project Card Stream)
1. **视觉冲击力**：访客一进入页面，便能立即感受到这是一个拥有大量活跃项目、持续蓬勃研发的团队。
2. **卡片微型舱设计**：
   * 每个项目卡片包含：项目名称与 Emoji 图标、主语言标签、GitHub Stars 计数、当前 CI 最新状态发光胶囊（如 `CI PASSING` 或 `BUILDING 03m:12s`）、以及近 7 天代码活跃迷你火花线。
3. **交互联动**：
   * 点击任意卡片，当前卡片呈现微发光边框高亮，下方所有遥测仪表盘（KPI、分支图、质量曲线、终端流）丝滑无刷新过渡切换至该项目的深度遥测数据。

### 6.2 核心 KPI 仪表舱 (Hero KPI Matrix - 4 等分卡片)
1. **当前里程碑冲刺**：版本号（如 `v1.2.0-beta 🚀`）、工期倒计时、分段像素进度条与剩余 Issue 计数。
2. **代码净吞吐净值**：近期新增与删除行数净差（`+Net LOC`），附带微型波形火花线。
3. **平均上线周期 (Time-to-Ship)**：从 PR 发起到合并的平均流转时长与效率评级。
4. **24 小时活跃心跳波形**：全天提交时间段的分布柱状图，直观展示团队当前的研发节奏。

### 6.3 核心分析双联展台 (Primary Analytics Split)
* **左区：质量基准与预算演进图 (Quality Benchmarks)**：
  * 平滑双轴折线图：展现测试覆盖率 (%) 与打包产物体积 (KB) 随 Commit 的演变，标示安全警戒线与预算上限。
* **右区：动态 Git 分支网络与提交图谱 (Interactive Git Branch Network & Commit Graph)**：
  * **分支状态拓扑链路**：以矢量图谱绘制当前仓库的 `main` 主分支与活跃的 `feature/*`、`release/*` 分支演进线。
  * **分支即时状态标识**：在各分支前端清晰标注其当前状态（如 `MERGE CONFLICT`、`BEHIND MAIN`、`CI RUNNING`）。
  * **Commit 节点悬浮深潜**：分支连线上的各个 Commit 圆点支持鼠标悬浮与点击，弹出微型抽屉展示 Commit 标题、提交者、SHA 简码与关联 PR。

### 6.4 底部实时终端与基础设施舱 (Bottom Deck)
* **左区：实时工程事件终端 (Live Engineering Terminal)**：
  * 模拟黑客命令行终端，具备红黄绿标题栏小圆点，滚动输出秒级 Webhook 事件流水。
* **右区：基础设施负载与服务探活 (Infra & SLA Matrix)**：
  * GitHub Actions 跑分用量进度条、线上 Production 服务探活 SLA 百分比。

### 6.5 专属观察者交互增强设计 (Observer Candy Features)
1. **精简时间窗口切换 (Focused Time Windows)**：
   * 专为实时遥测场景设计的等宽胶囊切换器：
     * `LIVE`：最近数小时高频脉冲与即时事件。
     * `TODAY`：当日 0 点至今的生产力净值与 CI 跑分。
     * `7D`：过去 7 天的代码吞吐与质量基准演进趋势。
2. **明暗双模一键切换 (Dark / Light Theme Switcher)**：
   * 默认采用深度极客暗黑风，支持一键切换至高清晰度 Clean Light 明亮模式，全站 CSS 变量毫秒级重着色。
3. **全屏大屏投屏展台模式 (Kiosk / TV Mode)**：
   * 专门针对办公室监控大屏、展台屏幕、电视投屏定制的展台模式：
     * 一键隐藏所有多余交互控件与滚动条，页面全屏沉浸自适应铺满；
     * 关键数字与状态指示自动放大，强化远距离可读性；
     * 可设置定时自动轮播切换不同项目，作为极具工程科技感的技术展台。

---

## 第七部分: 技术选型与阶段实施路线图

### 7.1 技术栈选型与权衡 (Tech Stack Selection)
* **核心框架：Next.js 15 (App Router) + React 19**
  * Route Handlers 天然提供免运维 Serverless / Edge Function，无需独立服务器；前台展示与后台 API、Webhook 接收共存于单一仓库，在 Vercel / Cloudflare 一键部署。
* **开发语言：TypeScript 5.x (Strict 模式)**
  * 为配置解析、GitHub API 响应、Redis 缓存与组件 Props 提供 100% 严密类型保障。
* **样式系统：Tailwind CSS v4**
  * 采用原生 CSS 变量映射主题 Token，实现毫秒级明暗重着色与发光微边框。
* **图表与图形库：`@visx/visx` + 原生 SVG / Canvas**
  * AirBnb 的 Visx 提供 D3 级精度的自定义 SVG 渲染能力，完美支持 Git 分支拓扑图与像素进度条，性能极轻量。
* **存储与缓存：Upstash Redis (Serverless)**
  * HTTP API 兼容 Edge Runtime，全球低延迟同步；免费额度充裕（256MB 存储、10,000 次请求/天），双层边缘缓存下永不超标。
* **部署平台：Vercel / Cloudflare Pages**
  * 自带全球 Anycast CDN 加速、免费 SSL、自定义域名与内置 Cron 定时触发器。

### 7.2 实施三步走路线图 (Phased Implementation Roadmap)
1. **阶段一：配置中枢与数据摄取引擎 (Phase 1: Ingestion & Storage Core)**
   * 初始化 Next.js 15 + TS + Tailwind v4 工程骨架；
   * 实现 `projects.config.ts` 配置解析器与验证器；
   * 实现 GitHub GraphQL 批量采集客户端，完成基础指标清洗；
   * 实现 Webhook 接收端点（`/api/webhooks/github`），加入 HMAC 验签与 30s 防抖锁；
   * 打通 Upstash Redis 缓存与定时拉取。
2. **阶段二：控制台视效与核心组件装配 (Phase 2: Dashboard UI & Visuals)**
   * 搭建 Bento Grid 响应式布局底座；
   * 开发顶部横向项目流光卡片舰队及无刷新切换逻辑；
   * 开发 4 大核心 KPI 卡片（分段像素进度条、火花线）；
   * 基于 `@visx/visx` 绘制质量基准双轴折线图与动态 Git 分支树图谱；
   * 开发底部实时工程事件终端（Live Terminal）。
3. **阶段三：交互增强、投屏模式与细节打磨 (Phase 3: Interactions, Kiosk & Polish)**
   * 实现 `LIVE / TODAY / 7D` 时间窗口切换；
   * 实现一键明暗双模切换；
   * 开发 Kiosk / TV 全屏自动轮播大屏模式；
   * 细节调优：实时呼吸灯、延时 Ping 探活、断网优雅重连提示。

---

## 第八部分: 附录：数据契约、接口定义与配置规范

### 8.1 项目集中配置文件契约 (`projects.config.ts`)
```typescript
export interface ProjectConfig {
  id: string;                      // 唯一标识/路由，如 "muxi-core"
  name: string;                    // 展示名称，如 "Muxi Engine Core"
  icon: string;                    // Emoji 图标，如 "⚡"
  description: string;             // 简要描述
  repository: {
    owner: string;                 // GitHub Owner
    repo: string;                  // GitHub Repo
    defaultBranch: string;         // 默认主分支，如 "main"
  };
  auth?: {
    githubTokenEnvVar?: string;    // 自定义 Token 环境变量名（默认 GITHUB_TOKEN）
    webhookSecretEnvVar?: string;  // 自定义 Webhook Secret 环境变量名
  };
  theme?: {
    preset: 'industrial-dark' | 'obsidian-minimal' | 'clean-light' | 'custom';
    tokens?: {
      canvasBg?: string;
      panelSurface?: string;
      panelBorder?: string;
      accent?: string;
    };
  };
  features: {
    milestone: boolean;            // 默认 true
    commitPulse: boolean;          // 默认 true
    workflowRuns: boolean;         // 默认 true
    gitBranchGraph: boolean;       // 默认 true
    timeToShip: boolean;           // 默认 true
    // 扩展项 (默认 false)
    coverageTrend?: {
      enabled: boolean;
      threshold: number;           // 最低报警阈值，如 80
    };
    bundleBudget?: {
      enabled: boolean;
      budgetKb: number;            // 预算上限，如 250
    };
    uptimeSla?: {
      enabled: boolean;
      endpointUrl: string;         // 探活探测 URL
    };
  };
}

export const projectsConfig: ProjectConfig[] = [
  {
    id: 'muxi-core',
    name: 'Muxi Core Engine',
    icon: '🚀',
    description: 'Next-gen distributed compute kernel',
    repository: {
      owner: 'muxi-tech',
      repo: 'muxi-core',
      defaultBranch: 'main'
    },
    theme: {
      preset: 'industrial-dark'
    },
    features: {
      milestone: true,
      commitPulse: true,
      workflowRuns: true,
      gitBranchGraph: true,
      timeToShip: true,
      coverageTrend: {
        enabled: true,
        threshold: 85
      },
      bundleBudget: {
        enabled: true,
        budgetKb: 200
      }
    }
  }
];
```

### 8.2 前端遥测快照数据契约 (`TelemetrySummaryDTO`)
由 Serverless 聚合后输出给前端的轻量统一数据格式（< 30KB）：

```typescript
export interface TelemetrySummaryDTO {
  meta: {
    projectId: string;
    projectName: string;
    repoFullName: string;
    defaultBranch: string;
    lastSyncedAt: string;          // ISO 时间戳
    stars: number;
    forks: number;
  };
  vitalPulse: {
    latestWorkflow: {
      id: number;
      name: string;
      status: 'RUNNING' | 'PASSED' | 'FAILED' | 'QUEUED';
      durationSeconds: number;
      commitSha: string;
      commitMessage: string;
      author: string;
    };
    activeMilestone?: {
      title: string;
      dueOn: string | null;
      openIssues: number;
      closedIssues: number;
      progressPct: number;
    };
    commitSparkline: number[];     // 近 24 小时按小时分布的提交数 (长度 24)
  };
  velocity: {
    netLoc: {
      additions: number;
      deletions: number;
      net: number;
    };
    pullRequests: {
      open: number;
      merged: number;
      closed: number;
    };
    timeToShip: {
      avgHours: number;
      p95Hours: number;
    };
  };
  gitBranchGraph: {
    nodes: Array<{
      sha: string;
      branch: string;
      message: string;
      author: string;
      timestamp: string;
      ciStatus: 'PASSED' | 'FAILED' | 'RUNNING';
    }>;
    branches: Array<{
      name: string;
      isMain: boolean;
      status: 'AHEAD' | 'BEHIND' | 'SYNCED' | 'CONFLICT';
      latestSha: string;
    }>;
  };
  qualityBenchmarks?: {
    currentCoveragePct?: number;
    coverageHistory?: Array<{ commitSha: string; date: string; coverage: number }>;
    currentBundleKb?: number;
    bundleHistory?: Array<{ commitSha: string; date: string; bundleKb: number }>;
  };
  recentEvents: Array<{
    id: string;
    type: 'PR_MERGED' | 'CI_PASSED' | 'CI_FAILED' | 'RELEASE_PUBLISHED' | 'ISSUE_CLOSED';
    title: string;
    actor: string;
    url: string;
    timestamp: string;
  }>;
}
```
