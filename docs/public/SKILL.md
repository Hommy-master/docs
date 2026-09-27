---
name: capcut-mate
description: 简创AIGC CapCut Mate（剪映小助手）API 技能。通过 RESTful API 自动化创建剪映草稿：添加视频/音频/图片/字幕、特效/滤镜/关键帧/蒙版，并异步导出生成视频。触发词：剪映草稿、剪映自动化、CapCut Mate、create_draft、gen_video、自动生成剪映视频、批量做视频。来源：https://docs.jcaigc.cn/
---

# CapCut Mate — 剪映小助手 API

通过 HTTP 接口驱动剪映草稿的创建与视频导出。核心流程：**create_draft → add_*（素材/字幕/特效）→ gen_video（异步）→ 轮询 gen_video_status**。

## 硬规则（必须遵守）

1. **Base URL**：`https://capcut-mate.jcaigc.cn`，路径前缀 `/openapi/capcut-mate/v1/`。完整地址 = Base URL + `/openapi/capcut-mate/v1/{接口名}`。
2. **时间单位是微秒**：1 秒 = `1000000`。5 秒片段写 `start: 0, end: 5000000`。
3. **先 create_draft**，后续所有写接口必须携带返回的 `draft_url`。禁止自行拼接 `draft_id`。
4. **列表字段是 JSON 字符串**（序列化后的字符串），不是对象数组：`video_infos`、`audio_infos`、`image_infos`、`captions`、`keyframes`、`effect_infos`、`filter_infos`。
5. **仅 gen_video 收费**（0.3 元/分钟），需要 `apiKey`（UUID，用户自备，获取地址 <https://www.jcaigc.cn> ）。其余接口免费。
6. **导出是异步**：gen_video 仅表示任务已提交，必须轮询 `gen_video_status` 直到 `completed` 或 `failed`（建议每 3–5 秒一次）。`failed` 时读取 `error_message`，不要死循环。

## 核心接口速查

| 接口               | 方法   | 必填字段                            | JSON 字符串字段    | 返回关键字段                     |
| ---------------- | ---- | ------------------------------- | ------------- | -------------------------- |
| create_draft     | POST | 无（默认 1920x1080，可传 width/height） | 无             | `draft_url`                |
| add_videos       | POST | `draft_url`, `video_infos`      | `video_infos` | `draft_url`, `segment_ids` |
| add_audios       | POST | `draft_url`, `audio_infos`      | `audio_infos` | `draft_url`                |
| add_images       | POST | `draft_url`, `image_infos`      | `image_infos` | `draft_url`, `segment_ids` |
| add_captions     | POST | `draft_url`, `captions`         | `captions`    | `draft_url`                |
| gen_video        | POST | `draft_url`（线上导出带 `apiKey`）     | 无             | 无（去查状态）                    |
| gen_video_status | POST | `draft_url`                     | 无             | `status`, `video_url`      |

### video_infos 数组项常用字段

`video_url`（必填，http/https）、`start`、`end`；可选 `duration`、`volume`、`transition`、`transition_duration`、`mask`。

### 增强接口（按需）

| 接口            | 必填                                        | 备注                                              |
| ------------- | ----------------------------------------- | ----------------------------------------------- |
| add_effects   | `draft_url`, `effect_infos`               | JSON 字符串                                        |
| add_filters   | `draft_url`, `filter_infos`               | JSON 字符串                                        |
| add_keyframes | `draft_url`, `keyframes`                  | JSON 字符串                                        |
| add_masks     | `draft_url`, `segment_ids`, `name`        | 先有视频/图片片段（segment_ids 来自 add_videos/add_images） |
| add_sticker   | `draft_url`, `sticker_id`, `start`, `end` | sticker_id 来自 search_sticker                    |
| save_draft    | `draft_url`                               | 通常可省略，写接口会自动落盘                                  |

辅助查询接口：get_text_animations、get_image_animations、get_text_effects、search_sticker。

## 禁止主动调用的接口

以下是给扣子（Coze）/ n8n 拼 JSON 字符串用的辅助接口，原生 function calling **不要**调用，直接构造 JSON 字符串传给 add_* 即可：

`timelines`、`audio_timelines`、`video_infos`、`audio_infos`、`imgs_infos`、`caption_infos`、`effect_infos`、`filter_infos`、`keyframes_infos`、`str_to_list`、`str_list_to_objs`、`objs_to_str_list`

## 最小工作流示例

```bash
# 1. 创建 1080x1920 竖屏草稿
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/create_draft \
  -H "Content-Type: application/json" \
  -d '{"width":1080,"height":1920}'
# 响应中的 draft_url 用于后续所有调用

# 2. 添加 5 秒视频
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/add_videos \
  -H "Content-Type: application/json" \
  -d '{
    "draft_url": "YOUR_DRAFT_URL",
    "video_infos": "[{\"video_url\":\"https://example.com/clip.mp4\",\"start\":0,\"end\":5000000}]"
  }'

# 3. 提交导出（收费，需 apiKey）
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/gen_video \
  -H "Content-Type: application/json" \
  -d '{"draft_url":"YOUR_DRAFT_URL","apiKey":"YOUR_UUID_API_KEY"}'

# 4. 每 3-5 秒轮询，直到 completed
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/gen_video_status \
  -H "Content-Type: application/json" \
  -d '{"draft_url":"YOUR_DRAFT_URL"}'
# completed 时读取响应中的 video_url
```

## 状态机

| status     | 含义  | 下一步                     |
| ---------- | --- | ----------------------- |
| pending    | 排队中 | 继续轮询                    |
| processing | 渲染中 | 继续轮询                    |
| completed  | 成功  | 读取 `video_url`          |
| failed     | 失败  | 读取 `error_message`，停止轮询 |

## 详细文档（references/）

需要某个接口的完整参数、响应结构或更多示例时，按需读取，不要一次全读：

- `references/llm-guide.zh.md` — 调用顺序、硬规则与最小示例（最常用，优先读）
- `references/llm-contract.zh.md` — 核心写接口精简契约（方法/必填/最小请求体）
- `references/llms.txt` — 文档发现入口（全部接口链接清单）
- `references/llms-full.txt` — 全部接口的完整文档合集（约 280KB，仅在需要查具体接口细节时用 Grep 定位后再读）

## 计费

- gen_video：0.3 元/分钟（按导出视频时长计费）
- 其余接口全部免费
- SVIP：gen_video 再打 6 折（0.18 元/分钟）
- API Key 获取与充值：<https://www.jcaigc.cn>
