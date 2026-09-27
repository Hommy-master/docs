---
title: 简创AIGC官方文档
lang: zh-CN
description: 简创AIGC剪映小助手API文档。所有 RESTful API 基地址为 https://capcut-mate.jcaigc.cn。视频导出接口 gen_video 按 0.3 元/分钟计费，其余接口免费；SVIP 享 6 折。
keywords: 简创AIGC, 剪映小助手, API基地址, capcut-mate, gen_video, 视频导出价格, 自动化视频创作, API文档
---

# 简创AIGC官方文档

## 📖 剪映小助手 API 文档

欢迎使用简创AIGC剪映小助手 API。本文档提供完整的接口说明、调用示例和计费规则，帮助开发者快速接入视频自动化创作服务。

开始调用前，请先确认以下两点：

1. 所有 RESTful API 必须使用统一基地址：`https://capcut-mate.jcaigc.cn`
2. 仅 [gen_video](/docs/gen_video.zh.html)（视频导出）收费，其余接口免费

::: tip 想让 AI 工具直接调用？
下载技能文件装进 Claude Code 等支持 Agent Skills 的工具，就能用自然语言生成剪映草稿，不用自己拼 JSON、写 curl。安装步骤见下方「🧩 SKILL.md 下载与安装」。

<a class="skill-download" href="/SKILL.md" download="SKILL.md">⬇️ 下载 SKILL.md</a>
:::

---

## 🌐 API 基地址

所有 RESTful API **必须**以如下地址作为基地址（Base URL），不能省略，也不能替换为其它域名：

```
https://capcut-mate.jcaigc.cn
```

| 项目 | 说明 |
|------|------|
| 基地址 | `https://capcut-mate.jcaigc.cn` |
| 协议 | HTTPS |
| 接口路径前缀 | `/openapi/capcut-mate/v1/` |
| 完整请求地址 | `基地址 + 接口路径` |

### 完整地址拼接规则

```
完整 URL = https://capcut-mate.jcaigc.cn + /openapi/capcut-mate/v1/{接口名}
```

示例：

| 接口 | 完整请求地址 |
|------|----------------|
| 创建草稿 `create_draft` | `https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/create_draft` |
| 生成视频 `gen_video` | `https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/gen_video` |
| 查询状态 `gen_video_status` | `https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/gen_video_status` |

::: warning 调用注意
文档中各接口页列出的路径（如 `POST /openapi/capcut-mate/v1/create_draft`）均为相对路径。实际请求时必须拼接基地址，否则无法访问。
:::

---

## 💰 计费说明

| 接口 | 是否收费 | 价格 | 说明 |
|------|----------|------|------|
| [gen_video](/docs/gen_video.zh.html)（视频导出） | 是 | **0.3 元 / 分钟** | 按导出视频时长计费 |
| 其它全部接口 | 否 | **免费** | 创建草稿、添加素材、查询状态等均可免费调用 |

### SVIP 折扣

SVIP 用户在 `gen_video` 标准价格基础上再打 **6 折**（即按原价的 60% 结算）。

| 用户类型 | 视频导出单价 | 计算方式 |
|----------|----------------|----------|
| 普通用户 | 0.3 元 / 分钟 | 标准价 |
| SVIP 用户 | 0.18 元 / 分钟 | `0.3 × 0.6` |

计费示例：导出 2 分钟视频，普通用户 0.6 元，SVIP 用户 0.36 元。

### API Key 获取与充值

调用接口前请先获取 API Key，并按需充值：

**[https://www.jcaigc.cn](https://www.jcaigc.cn)**

---

## 🤖 模型 / Agent 接入

大模型请不要抓取整站 HTML。从发现入口开始：

- [llms.txt](/llms.txt) — 硬规则与分组链接（llmstxt.org）
- [调用指南](/guide/llm-guide.zh) — 调用顺序、微秒、JSON 字符串、异步导出
- [精简契约](/guide/llm-contract.zh) — 核心写接口的最小请求体

时间单位为**微秒**（1 秒 = 1000000）。列表字段（`video_infos` 等）是 JSON 字符串。写接口必须携带 `create_draft` 返回的 `draft_url`。

如果把下面的技能文件装进 AI 工具，以上规则会由工具自动遵守，你直接用自然语言提需求即可。

---

## 🧩 SKILL.md 下载与安装

把剪映小助手封装成 **Agent Skill**（技能文件 `SKILL.md`）。下载并安装到支持技能（Agent Skills）的 AI 工具后，直接用自然语言就能驱动剪映草稿的创建与导出，不必自己拼 JSON、写 curl。

<a class="skill-download" href="/SKILL.md" download="SKILL.md">⬇️ 下载 SKILL.md</a>

也可以直接命令行下载：

```bash
curl -O https://docs.jcaigc.cn/SKILL.md
```

| 项目 | 说明 |
|------|------|
| 文件名 | `SKILL.md` |
| 技能名 | `capcut-mate`（写在文件开头的 `name` 字段，安装目录名要与它一致） |
| 文件大小 | 约 6.5 KB |
| 适用工具 | Claude Code、Claude 网页版/桌面版，以及 Cursor、GitHub Copilot、Gemini CLI、Codex CLI、Windsurf 等支持 Agent Skills 的工具 |
| 前置条件 | 无需额外依赖；仅导出视频（`gen_video`）需要自备 `apiKey` |
| 下载地址 | `https://docs.jcaigc.cn/SKILL.md` |

### 安装到 Claude Code（CLI / IDE 插件）

技能文件必须放在名为 `capcut-mate` 的目录里，且该目录下直接就是 `SKILL.md`。

**方式一：个人级技能（所有项目都能用）**

```bash
# macOS / Linux
mkdir -p ~/.claude/skills/capcut-mate
curl -o ~/.claude/skills/capcut-mate/SKILL.md https://docs.jcaigc.cn/SKILL.md
```

```powershell
# Windows PowerShell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills\capcut-mate"
curl.exe -o "$env:USERPROFILE\.claude\skills\capcut-mate\SKILL.md" https://docs.jcaigc.cn/SKILL.md
```

**方式二：项目级技能（只在当前项目生效）**

把文件放到项目根目录：

```
你的项目/
└─ .claude/
   └─ skills/
      └─ capcut-mate/
         └─ SKILL.md     ← 下载的文件放这里
```

放好之后**新开一个会话**（或执行 `/exit` 后重新进入），技能才会被加载。

::: warning 装不上时先看这两条
1. **文件名必须是大写的 `SKILL.md`**。Windows / macOS 默认不区分大小写，写成 `skill.md` 本地看着能用，但在 Linux 上会直接失效。
2. **必须是「目录 + SKILL.md」的结构**，不能把文件平铺成 `.claude/skills/capcut-mate.md`；而且目录名要和技能名一致，即 `capcut-mate`。
:::

### 安装到 Claude 网页版 / 桌面版

Claude 网页版与桌面版通过**上传 zip 包**安装技能，不能直接用上面的目录：

1. 先在**设置 → 能力（Capabilities）**里打开「代码执行与文件创建」——不开这个开关，技能无法运行。
2. 进入 **自定义（Customize）→ 技能（Skills）→ 创建技能 → 上传技能**，选择 zip 包。
3. 上传后把该技能**打开开关**。

zip 包的内部结构必须是「技能目录 + SKILL.md」，不要多套一层文件夹：

```
capcut-mate/          ← 压缩包的顶层就是这一层
└─ SKILL.md
```

在电脑上建好 `capcut-mate` 目录、把下载的 `SKILL.md` 放进去，然后压缩成 `capcut-mate.zip` 即可：

```bash
mkdir -p capcut-mate
curl -o capcut-mate/SKILL.md https://docs.jcaigc.cn/SKILL.md
zip -r capcut-mate.zip capcut-mate     # 或右键「压缩」
```

::: tip 技能不会跨产品同步
在网页版上传的技能，不会出现在 Claude Code 里；反过来也一样。两边都要用，就各自安装一次。
:::

### 安装到其它 AI 工具

同一个 `SKILL.md` 换到别的工具也能用，规则是一样的：**建一个名为 `capcut-mate` 的目录，把 `SKILL.md` 放进去**，区别只是“放在哪个目录”。

| 工具 | 放置位置（`capcut-mate` 为技能目录名） |
|------|--------------------------------------|
| Cursor | 项目内 `.cursor/skills/capcut-mate/SKILL.md`；用户级 `~/.cursor/skills/capcut-mate/SKILL.md` |
| GitHub Copilot | 项目内 `.github/skills/capcut-mate/SKILL.md`；用户级 `~/.copilot/skills/capcut-mate/SKILL.md` |
| Gemini CLI | 工作区 `.gemini/skills/capcut-mate/SKILL.md`；用户级 `~/.gemini/skills/capcut-mate/SKILL.md` |
| Codex CLI | 仓库内 `.agents/skills/capcut-mate/SKILL.md`；用户级 `~/.agents/skills/capcut-mate/SKILL.md` |
| Windsurf | 工作区 `.windsurf/skills/capcut-mate/SKILL.md`；全局 `~/.codeium/windsurf/skills/capcut-mate/SKILL.md` |

::: warning 以各工具官方文档为准
各工具的「技能（Skills）」目录约定仍在演进，上表仅供参考。安装前请查一下该工具官方文档里 Skills / 技能 一章；如果你的工具不在表里，在设置里搜 “Skills” 也能找到对应目录。此外 `.agents/skills/` 正逐渐成为跨工具的通用位置，但 Claude Code 只读 `.claude/skills/`。
:::

### 验证是否安装成功

Claude Code 里可以先执行 `/skills`（或 `/context`），确认列表中出现 `capcut-mate`。

然后提一句带触发词的需求，比如：

> 用剪映小助手创建一个 1080x1920 的竖屏草稿，加一段 5 秒视频

AI 应该会自动读取该技能并调用 `/create_draft`、`/add_videos` 等接口。如果它反过来问你“接口地址是什么”，说明技能没被加载，请检查目录名、文件名大小写和层级是否正确。

### 使用提示

- 技能里已写明硬规则：Base URL、微秒、`draft_url`、列表字段是 JSON 字符串、异步轮询等，无需你再向 AI 解释。
- 仅 `gen_video`（导出）收费，0.3 元/分钟，需要 `apiKey`。请先到 [https://www.jcaigc.cn](https://www.jcaigc.cn) 获取并充值，调用时把 Key 交给 AI 即可。
- 想要更细的接口参数，让 AI 直接读本站文档页，或参考[调用指南](/guide/llm-guide.zh)与[精简契约](/guide/llm-contract.zh)。

---

## 🔧 核心功能

- **自动化视频创作** — 通过 API 自动创建和编辑视频，提升制作效率
- **批量素材处理** — 支持同时处理多个视频、音频、图片素材
- **丰富的特效支持** — 提供转场、遮罩、滤镜等多种视频特效
- **灵活的时间轴控制** — 精确控制素材在时间轴上的位置和持续时间

---

## 📚 文档导航

<div class="grid-container">

<div class="grid-item">
<h3>🤖 模型接入</h3>
<ul>
<li><a href="/SKILL.md" download="SKILL.md" title="下载 SKILL.md 技能文件，安装到 AI 工具后可用自然语言调用">⬇️ 下载 SKILL.md</a></li>
<li><a href="/llms.txt" title="llms.txt 发现入口">llms.txt</a></li>
<li><a href="/guide/llm-guide.zh.html" title="模型调用指南">调用指南</a></li>
<li><a href="/guide/llm-contract.zh.html" title="精简契约">精简契约</a></li>
</ul>
</div>

<div class="grid-item">
<h3>🚀 快速开始</h3>
<ul>
<li><a href="/docs/create_draft.zh.html" title="CREATE_DRAFT API - 创建剪映草稿">创建草稿</a></li>
<li><a href="/docs/get_draft.zh.html" title="GET_DRAFT API - 获取草稿信息">获取草稿</a></li>
<li><a href="/docs/save_draft.zh.html" title="SAVE_DRAFT API - 保存草稿">保存草稿</a></li>
</ul>
</div>

<div class="grid-item">
<h3>🎞️ 视频处理</h3>
<ul>
<li><a href="/docs/add_videos.zh.html" title="ADD_VIDEOS API - 批量添加视频素材">添加视频</a></li>
<li><a href="/docs/add_images.zh.html" title="ADD_IMAGES API - 添加图片素材">添加图片</a></li>
<li><a href="/docs/add_audios.zh.html" title="ADD_AUDIOS API - 批量添加音频素材">添加音频</a></li>
</ul>
</div>

<div class="grid-item">
<h3>🎨 效果增强</h3>
<ul>
<li><a href="/docs/add_effects.zh.html" title="ADD_EFFECTS API - 添加视频特效">添加特效</a></li>
<li><a href="/docs/add_beauty.zh.html" title="ADD_BEAUTY API - 添加美颜效果">添加美颜</a></li>
<li><a href="/docs/add_masks.zh.html" title="ADD_MASKS API - 添加遮罩效果">添加遮罩</a></li>
<li><a href="/docs/add_mask_keyframes.zh.html" title="ADD_MASK_KEYFRAMES API - 添加蒙版关键帧">添加蒙版关键帧</a></li>
<li><a href="/docs/add_captions.zh.html" title="ADD_CAPTIONS API - 批量添加字幕">添加字幕</a></li>
</ul>
</div>

<div class="grid-item">
<h3>📤 输出发布</h3>
<ul>
<li><a href="/docs/gen_video.zh.html" title="GEN_VIDEO API - 生成视频">生成视频（收费）</a></li>
<li><a href="/docs/gen_video_status.zh.html" title="GEN_VIDEO_STATUS API - 查询生成状态">查询生成状态</a></li>
</ul>
</div>

</div>

---

## 🛠️ 技术支持

如果您在使用过程中遇到任何问题，请通过以下方式联系我们：

- 📧 邮箱支持: 16620803786@163.com
- 📖 官方文档: [https://docs.jcaigc.cn](https://docs.jcaigc.cn)
- 🔑 API Key 获取 & 充值: [https://www.jcaigc.cn](https://www.jcaigc.cn)
- 💬 开发者社区: [GitHub讨论区](https://github.com/Hommy-master/capcut-mate/discussions)

---

<div align="center">

📚 **项目资源**  
[GitHub](https://github.com/Hommy-master/capcut-mate) | [Gitee](https://gitee.com/taohongmin-gitee/capcut-mate) | [官方文档](https://docs.jcaigc.cn) | [获取 API Key](https://www.jcaigc.cn)

版权所有 © 2025 简创AIGC

</div>
