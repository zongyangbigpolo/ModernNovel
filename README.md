# ModernNovel

ModernNovel 是一个面向长篇小说创作的开源 AI 写作工作台。它把项目、章节、人物、地点、世界观、情节画布和 AI 助手放在同一个 Workspace 中，并允许每位用户使用自己的模型 API Key 或本地 Ollama。

> 当前项目处于 POC 阶段。核心写作、AI Provider、Workspace、成员角色和超级管理员能力已经可用，但实时协作、Writer Skill 导入和 DOCX/EPUB 导出仍待实现。

![从故事构想到可编辑情节图](.github/story-map-demo.gif)

## 核心能力

- 项目与长篇作品管理：小说、系列、短篇集、剧本等。
- 章节编辑：Tiptap 富文本编辑器、自动保存、字数统计和并发修改检测。
- Story Canvas：从故事前提扩展为幕、章节、场景节点，并可提升为正式章节。
- Codex：管理人物、地点、世界观资料和情节点。
- AI 写作助手：读取当前项目标题、类型、题材、简介和人物信息作为上下文。
- 自带模型密钥：支持 OpenRouter、OpenAI、Anthropic、Groq、Gemini、Cohere。
- Ollama：本地开发时可以直接连接本机模型。
- Workspace：成员邀请、owner/admin/member 角色、活动 Workspace 切换。
- 超级管理员：查看所有用户和 Workspace，启用或禁用账号。
- Markdown 导出。
- D1 Time Travel 恢复和 SQL 导出。

## 技术架构

```text
Browser
  └─ React 19 + TanStack Router + TanStack Query + shadcn/ui
       └─ /api/*
            └─ Hono on Cloudflare Workers
                 ├─ Better Auth
                 ├─ Cloudflare D1 + Drizzle ORM
                 ├─ Cloudflare Email
                 └─ AI Provider / Ollama
```

生产环境由一个 Cloudflare Worker 同时提供 API 和前端静态资源。小说正文、项目资料、用户、Session、Workspace 和加密后的 AI Key 均保存在 D1。

## 快速开始

### 环境要求

- Bun 1.3+
- Node.js 22+
- Cloudflare Wrangler
- 可选：Ollama

### 安装依赖

```bash
git clone git@github.com:zongyangbigpolo/ModernNovel.git
cd ModernNovel
bun install
```

### 本地环境变量

```bash
cp apps/server/.dev.vars.example apps/server/.dev.vars
cp apps/web/.env.example apps/web/.env
```

`apps/server/.dev.vars`：

```dotenv
CORS_ORIGIN="http://localhost:3001"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="至少 32 位的本地随机字符串"
ENCRYPTION_KEY="base64 编码的 32 字节密钥"
ADMIN_EMAIL="zongyangpolo@gmail.com"
ADMIN_PASSWORD="至少 6 位的本地管理员密码"
NODE_ENV="development"
```

生成密钥：

```bash
openssl rand -base64 32
```

`apps/web/.env`：

```dotenv
VITE_SERVER_URL="http://localhost:3000"
```

以上两个文件均已加入 `.gitignore`，不要提交真实密码或 API Key。

### 初始化本地 D1

```bash
cd apps/server
bunx wrangler d1 migrations apply DB --local
cd ../..
```

### 启动

```bash
bun dev
```

- Web：http://localhost:3001
- API：http://localhost:3000
- 健康检查：http://localhost:3000/health

也可以分别启动：

```bash
bun dev:web
bun dev:server
```

## 账号与权限

### 普通用户

- 使用邮箱和至少 6 位密码注册。
- POC 默认不要求邮箱验证。
- 首次注册自动建立个人 Workspace，并成为 owner。

### Workspace 角色

| 角色 | 权限 |
| --- | --- |
| `owner` | Workspace 完整控制权，管理成员与角色 |
| `admin` | 邀请及管理普通成员 |
| `member` | 使用 Workspace 中的创作功能 |

在 Dashboard 顶部可以切换当前 Workspace，在 **Team** 页面邀请成员、接受邀请和调整角色。

### 超级管理员

固定管理员邮箱为 `zongyangpolo@gmail.com`。服务启动后会使用 `ADMIN_PASSWORD` 幂等创建或提升该账号，密码只来自环境变量，不写入源码。

超级管理员在 **Administration** 页面可以：

- 查看全部用户。
- 启用或禁用用户；禁用时立即撤销该用户现有 Session。
- 查看全部 Workspace 及成员数量。

## 配置 AI API

AI Key 不需要写入命令行配置文件。登录后打开：

```text
Dashboard → AI Models → Connect
```

选择 Provider，填写 API Key 后保存。Key 会使用 `ENCRYPTION_KEY` 通过 AES-GCM 加密后存入 D1，API 不会把明文 Key 返回浏览器。

### Provider 支持情况

| Provider | 配置方式 | 当前默认模型 |
| --- | --- | --- |
| OpenRouter | OAuth PKCE 或手动 API Key | `openrouter/auto` |
| OpenAI | API Key | `gpt-4o-mini` |
| Anthropic | API Key | `claude-haiku-4-5` |
| Groq | API Key | `llama-3.3-70b-versatile` |
| Gemini | API Key | `gemini-2.0-flash` |
| Cohere | API Key | `command-r-08-2024` |
| Ollama | 服务 URL，无需 Key | `llama3.2` |

当前 AI 聊天页面会使用第一个启用的 Provider，若存在 `isDefault` Provider 则优先使用它。后端 API 支持通过 `model` 参数临时覆盖模型，但网页端尚未提供通用模型选择器。

### OpenRouter

1. 在 OpenRouter 创建 API Key，或使用页面提供的 OAuth 连接。
2. 进入 **AI Models**。
3. 选择 OpenRouter。
4. 完成 OAuth，或切换到手动 API Key。
5. 创建项目，在写作页面打开 AI 助手测试。

### OpenAI / Anthropic / Groq / Gemini / Cohere

1. 从对应平台创建 API Key。
2. 在 **AI Models** 选择 Provider。
3. 粘贴 Key 并连接。
4. 不要把 Provider Key 放入 `.env`、README 或 GitHub Secrets；它属于用户级数据，应由网页保存。

### Ollama

本地启动 Ollama：

```bash
ollama serve
ollama pull llama3.2
```

在 **AI Models → Ollama** 中填写：

```text
http://localhost:11434
```

ModernNovel 通过 Ollama 的 OpenAI-compatible `/v1/chat/completions` 接口调用模型。

注意：部署在 Cloudflare Worker 后，Worker 中的 `localhost` 不是你的电脑。生产环境若要使用家中或局域网的 Ollama，需要提供受保护的公网 HTTPS 地址、Cloudflare Tunnel 或独立模型网关；不要把无鉴权的 Ollama 端口直接暴露到公网。

## Writer Skill 与中文写作技巧

### 当前状态

当前版本还没有可从网页导入的 Writer Skill、提示词包或作家风格库。

AI 系统提示词目前定义在：

```text
apps/server/src/routers/ai.ts
```

`buildSystemPrompt()` 会自动附加：

- 项目标题与类型。
- 题材。
- 项目简介，最多 500 字符。
- 最多 20 位人物及其简介。

因此，现在临时加入写作技巧有三种方式：

1. 在每次 AI 对话中直接说明要求，最安全也最灵活。
2. 把简短的项目级写作规范放入项目简介，但只有前 500 字符会进入 AI 上下文。
3. 开发阶段修改 `BASE_SYSTEM_PROMPT`，这会影响所有用户和全部项目，不适合多用户部署。

### 推荐的 Skill 实现方案

后续建议新增独立的 `writer_skill`，而不是继续扩大固定系统提示词：

```text
writer_skill
├─ id
├─ owner_id / organization_id
├─ name
├─ language
├─ description
├─ instructions
├─ examples
├─ source
├─ is_active
└─ created_at / updated_at
```

同时增加：

- **AI Models → Writer Skills**：创建、编辑、导入和启用技巧包。
- 项目设置中的 Skill 多选。
- JSON/Markdown 导入预览。
- Prompt 长度限制和内容清洗。
- Skill 优先级：平台基础规则 → Workspace Skill → 项目 Skill → 当前用户要求。
- 只把当前项目启用的 Skill 合并进 `buildSystemPrompt()`。

推荐导入的是抽象、可执行的写作方法，例如：

```markdown
# 中文悬疑节奏

- 每个场景先明确人物目标、阻力和信息增量。
- 线索首次出现时保持自然，后续至少产生一次错误解释。
- 章节结尾优先留下未完成动作、认知反转或代价升级。
- 对话避免直接解释背景，让信息通过立场冲突显现。
```

不建议直接导入整本小说、长篇原文或要求模型复刻某位在世作家的独特文风。更适合把资料整理成通用技巧、结构规则、自检清单和少量自有示例，并记录来源及授权状态。

## Cloudflare 部署

### 1. 创建 D1

```bash
cd apps/server
bunx wrangler login
bunx wrangler d1 create modernnovel
```

把输出的 `database_id` 和数据库名称填写到 `apps/server/wrangler.jsonc`。

### 2. 配置公开变量

在 `apps/server/wrangler.jsonc` 中加入：

```jsonc
"vars": {
  "NODE_ENV": "production",
  "ADMIN_EMAIL": "zongyangpolo@gmail.com",
  "CORS_ORIGIN": "https://你的域名",
  "BETTER_AUTH_URL": "https://你的域名"
}
```

### 3. 配置 Secret

```bash
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put ADMIN_PASSWORD
bunx wrangler secret put ENCRYPTION_KEY
```

如果需要邀请邮件和密码重置，还必须在 Cloudflare 配置 Email Sending，并把发件地址修改为已验证域名。邮箱验证在当前 POC 中默认关闭。

### 4. 迁移和部署

```bash
bunx wrangler d1 migrations apply DB --remote
cd ../..
bun deploy
```

Worker 会同时部署 API 和 `apps/web/dist` 静态资源。

## D1 备份与恢复

D1 Time Travel 默认自动开启：

- Workers Free：通常保留 7 天。
- Workers Paid：通常保留 30 天。

额外导出 SQL：

```bash
bun db:backup
bun db:backup -- /secure/path/modernnovel.sql
```

恢复到时间点或 bookmark：

```bash
bun db:restore -- 2026-08-12T02:00:00Z
bun db:restore -- <bookmark>
```

恢复会覆盖生产数据库，脚本要求手动输入 `RESTORE`。长期备份应保存到加密存储，不能提交到 Git。

## 项目结构

```text
ModernNovel/
├─ apps/
│  ├─ web/       React 前端
│  ├─ server/    Hono Worker、D1 Schema、迁移和 API
│  └─ docs/      VitePress 文档
├─ e2e/          Playwright 测试
├─ package.json
└─ mprocs.yaml
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `bun dev` | 启动 Web 和 Server |
| `bun dev:web` | 仅启动前端 |
| `bun dev:server` | 仅启动 Worker |
| `bun build` | 构建完整应用 |
| `bun test` | 运行 Web 和 Server 测试 |
| `bun check-types` | TypeScript 检查 |
| `bun lint` | Biome 检查 |
| `bun quality` | 类型检查和 lint |
| `bun db:generate` | 生成 Drizzle 迁移 |
| `bun db:backup` | 导出远程 D1 |
| `bun db:restore -- <时间或 bookmark>` | Time Travel 恢复 |
| `bun deploy` | 构建并部署 Worker |

## 当前限制

- 没有 Writer Skill 导入与项目级提示词管理。
- 网页端尚无通用模型选择器、温度和最大 Token 配置。
- Ollama 生产部署需要可由 Worker 访问的安全 HTTPS 网关。
- 团队成员可以共享 Workspace，但实时多人编辑尚未实现。
- 邮件发送依赖 Cloudflare 已验证的发件域名。
- DOCX、EPUB 和实时流式 AI 输出尚未完成。

## 安全说明

- 不要提交 `.dev.vars`、`.env`、D1 导出或真实 API Key。
- `BETTER_AUTH_SECRET`、`ADMIN_PASSWORD`、`ENCRYPTION_KEY` 必须使用 Cloudflare Secrets。
- 修改 `ENCRYPTION_KEY` 后，已有 AI Key 将无法解密。
- 不要在公网暴露无认证 Ollama。
- POC 未启用邮箱验证和机器人防护，公开运营前应补充相应措施。

## 测试

```bash
bun test
bun check-types
bun lint
```

## License

[AGPL-3.0](LICENSE.md)
