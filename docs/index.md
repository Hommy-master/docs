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

## 🔧 核心功能

- **自动化视频创作** — 通过 API 自动创建和编辑视频，提升制作效率
- **批量素材处理** — 支持同时处理多个视频、音频、图片素材
- **丰富的特效支持** — 提供转场、遮罩、滤镜等多种视频特效
- **灵活的时间轴控制** — 精确控制素材在时间轴上的位置和持续时间

---

## 📚 文档导航

<div class="grid-container">

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
<li><a href="/docs/add_masks.zh.html" title="ADD_MASKS API - 添加遮罩效果">添加遮罩</a></li>
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
