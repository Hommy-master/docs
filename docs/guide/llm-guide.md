---
description: "CapCut Mate API guide for agents: call order, hard rules, async export, and a minimal example."
---

# Agent Call Guide

## Language Switch
[中文版](/guide/llm-guide.zh) | [English](/guide/llm-guide)

Rules for LLM / agent callers. Full human API pages live in the sidebar; this page only covers what automatic calling must get right.

## Hard rules

1. **Base URL** is `https://capcut-mate.jcaigc.cn`, path prefix `/openapi/capcut-mate/v1/`.
2. **Time unit is microseconds**: 1 second = `1000000`. A 5-second clip is `start: 0, end: 5000000`.
3. **Call `create_draft` first**, then pass the returned `draft_url` on every later write. Do not invent a `draft_id`.
4. **List fields are JSON strings**, not object arrays: `video_infos`, `audio_infos`, `image_infos`, `captions`, `keyframes`, `effect_infos`, `filter_infos`.
5. Only `gen_video` is billed and needs `apiKey` (UUID). All other endpoints are free.
6. Export is async: `gen_video` only submits the job. Poll `gen_video_status`.

## Default workflow

1. `POST /create_draft` → keep `draft_url`
2. Call `add_videos` / `add_images` / `add_audios` / `add_captions` as needed
3. Optional: `add_effects` / `add_filters` / `add_keyframes` / `add_masks`
4. `POST /gen_video` (include `apiKey` for hosted export)
5. Poll `POST /gen_video_status` every 3–5s until `completed` or `failed`
6. On success, use `video_url`

## Do not call unless assembling Coze/n8n JSON

- `timelines`, `audio_timelines`
- `video_infos`, `audio_infos`, `imgs_infos`, `caption_infos`, `effect_infos`, `filter_infos`, `keyframes_infos`
- `str_to_list`, `str_list_to_objs`, `objs_to_str_list`

Build the JSON string yourself and pass it to `add_*`.

## Minimal example: vertical short video

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/create_draft \
  -H "Content-Type: application/json" \
  -d '{"width":1080,"height":1920}'

curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/add_videos \
  -H "Content-Type: application/json" \
  -d '{
    "draft_url": "YOUR_DRAFT_URL",
    "video_infos": "[{\"video_url\":\"https://example.com/clip.mp4\",\"start\":0,\"end\":5000000}]"
  }'

curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/gen_video \
  -H "Content-Type: application/json" \
  -d '{"draft_url":"YOUR_DRAFT_URL","apiKey":"YOUR_UUID_API_KEY"}'

curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/gen_video_status \
  -H "Content-Type: application/json" \
  -d '{"draft_url":"YOUR_DRAFT_URL"}'
```

## Status machine

| status | meaning | next step |
|--------|---------|-----------|
| pending | queued | keep polling |
| processing | rendering | keep polling |
| completed | success | read `video_url` |
| failed | error | read `error_message` |

## Related

- [Compact contract](/guide/llm-contract)
- [llms.txt](/llms.txt)
- [create_draft](/docs/create_draft)
- [gen_video](/docs/gen_video)
- [gen_video_status](/docs/gen_video_status)
