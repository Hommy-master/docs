---
description: "Compact CapCut Mate write-API contract: methods, required fields, JSON-string fields, and minimal bodies."
---

# Compact Contract

## Language Switch
[中文版](/guide/llm-contract.zh) | [English](/guide/llm-contract)

Minimal contract for function calling. See each API page for full fields. All timestamps are **microseconds**.

Base URL: `https://capcut-mate.jcaigc.cn`

Full path = Base URL + `/openapi/capcut-mate/v1/{name}`

## Core endpoints

| Endpoint | Method | Required | JSON-string fields | Return fields to keep |
|----------|--------|----------|--------------------|-----------------------|
| create_draft | POST | none (default 1920x1080) | none | `draft_url` |
| add_videos | POST | `draft_url`, `video_infos` | `video_infos` | `draft_url`, `segment_ids` |
| add_audios | POST | `draft_url`, `audio_infos` | `audio_infos` | `draft_url` |
| add_images | POST | `draft_url`, `image_infos` | `image_infos` | `draft_url`, `segment_ids` |
| add_captions | POST | `draft_url`, `captions` | `captions` | `draft_url` |
| gen_video | POST | `draft_url`; hosted export should send `apiKey` | none | none (poll status) |
| gen_video_status | POST | `draft_url` | none | `status`, `video_url` |

## Minimal bodies

### create_draft

```json
{ "width": 1080, "height": 1920 }
```

Keep `draft_url` from the response.

### add_videos

```json
{
  "draft_url": "https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/get_draft?draft_id=REPLACE",
  "video_infos": "[{\"video_url\":\"https://example.com/clip.mp4\",\"start\":0,\"end\":5000000}]"
}
```

Common `video_infos` item fields: required `video_url` (http/https), `start`, `end`; optional `duration`, `volume`, `transition`, `transition_duration`, `mask`.

### add_audios

```json
{
  "draft_url": "YOUR_DRAFT_URL",
  "audio_infos": "[{\"audio_url\":\"https://example.com/bgm.mp3\",\"start\":0,\"end\":10000000}]"
}
```

### add_images

```json
{
  "draft_url": "YOUR_DRAFT_URL",
  "image_infos": "[{\"image_url\":\"https://example.com/cover.png\",\"start\":0,\"end\":5000000}]"
}
```

### add_captions

```json
{
  "draft_url": "YOUR_DRAFT_URL",
  "captions": "[{\"start\":0,\"end\":5000000,\"text\":\"Hello CapCut\"}]",
  "font_size": 15,
  "text_color": "#ffffff"
}
```

### gen_video

```json
{
  "draft_url": "YOUR_DRAFT_URL",
  "apiKey": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### gen_video_status

```json
{ "draft_url": "YOUR_DRAFT_URL" }
```

`status`: `pending` | `processing` | `completed` | `failed`. Read `video_url` only when `completed`.

## Optional write APIs

| Endpoint | Required | Notes |
|----------|----------|-------|
| add_effects | `draft_url`, `effect_infos` | `effect_infos` is a JSON string |
| add_filters | `draft_url`, `filter_infos` | `filter_infos` is a JSON string |
| add_keyframes | `draft_url`, `keyframes` | `keyframes` is a JSON string |
| add_masks | `draft_url`, `segment_ids`, `name` | needs an existing video/image segment |
| add_sticker | `draft_url`, `sticker_id`, `start`, `end` | `sticker_id` from search_sticker |
| save_draft | `draft_url` | usually optional; write APIs persist |

## Related

- [Agent call guide](/guide/llm-guide)
- [llms.txt](/llms.txt)
