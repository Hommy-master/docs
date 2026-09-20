# ADD_BEAUTY API Documentation

## 🌐 Language Switch
[中文版](./add_beauty.zh.md) | [English](./add_beauty.md)

## Interface Information

```
POST /openapi/capcut-mate/v1/add_beauty
```

## Function Description

Add beauty adjustments to video segments in an existing draft. Beauty is attached to the segment and stored in `materials.effects` with `type=figure`. It is not a separate effect track.

The 10 parameters from Jianying's beauty panel are supported: even skin (`匀肤`), plump (`丰盈`), smoothing (`磨皮`), nasolabial folds (`祛法令纹`), bright eyes (`亮眼`), dark circles (`祛黑眼圈`), whitening (`美白`), teeth (`白牙`), skin tone (`肤色`), and skin-tone intensity (`肤色强度`). Each parameter has a default. A slider value of 0 or an empty skin tone is not written. Applying any slider also adds one `makeup-root` material. Setting the same slider again updates intensity instead of appending another material.

## More Documentation

📖 For more detailed documentation and tutorials, please visit: [https://docs.jcaigc.cn](https://docs.jcaigc.cn)

## Request Parameters

```json
{
  "draft_url": "https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/get_draft?draft_id=2025092811473036584258",
  "segment_ids": ["d62994b4-25fe-422a-a123-87ef05038558"],
  "匀肤": 100,
  "丰盈": 100,
  "磨皮": 100,
  "祛法令纹": 100,
  "亮眼": 100,
  "祛黑眼圈": 100,
  "美白": 60,
  "白牙": 100,
  "肤色": "暖白",
  "肤色强度": 60
}
```

### Parameter Description

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| draft_url | string | ✅ | "" | Full URL of the target draft |
| segment_ids | array | ✅ | [] | Video segment IDs to apply beauty to |
| 匀肤 | number | ❌ | 0 | Even-skin intensity, 0–100 |
| 丰盈 | number | ❌ | 0 | Plump intensity, 0–100 |
| 磨皮 | number | ❌ | 0 | Smoothing intensity, 0–100 |
| 祛法令纹 | number | ❌ | 0 | Nasolabial-fold intensity, 0–100 |
| 亮眼 | number | ❌ | 0 | Bright-eye intensity, 0–100 |
| 祛黑眼圈 | number | ❌ | 0 | Dark-circle intensity, 0–100 |
| 美白 | number | ❌ | 0 | Whitening intensity, 0–100 |
| 白牙 | number | ❌ | 0 | Teeth-whitening intensity, 0–100 |
| 肤色 | string | ❌ | "" | Skin-tone preset; empty means off. Currently `暖白` |
| 肤色强度 | number | ❌ | 60 | Skin-tone intensity, 0–100; used only when `肤色` is set |
| beauty_infos | array | ❌ | [] | Legacy slider list; can be combined with the named fields |

### beauty_infos

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| name | string | ✅ | - | Slider name: `匀肤`, `丰盈`, `磨皮`, `祛法令纹`, `亮眼`, `祛黑眼圈`, `美白`, `白牙`, `肤色`/`暖白` |
| intensity | number | ❌ | 0 | Intensity from 0 to 100, matching the Jianying slider |

Named fields and `beauty_infos` are merged before writing. Sliders at `0` and an empty `肤色` are skipped. At least one effective slider is required after merging.

Intensity is divided by 100 when written. Whitening and smoothing use the material `value` field. Even skin, plump, nasolabial folds, bright eyes, and dark circles use `adjust_params` (`name` is `"0"`). Teeth whitening uses `adjust_params` (`name` is `"1"`). Skin tone is written to `face_adjust_params` and exported as `暖白`.

## Response

```json
{
  "draft_url": "https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/get_draft?draft_id=2025092811473036584258",
  "affected_segments": ["d62994b4-25fe-422a-a123-87ef05038558"],
  "figure_ids": ["figure-id-1", "makeup-root-id"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| draft_url | string | Draft URL |
| affected_segments | array | Segment IDs that received beauty |
| figure_ids | array | Figure material IDs, including the auto-added makeup-root |

## Examples

### Named parameters

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/add_beauty \
  -H "Content-Type: application/json" \
  -d '{
    "draft_url": "YOUR_DRAFT_URL",
    "segment_ids": ["segment-id"],
    "匀肤": 80,
    "美白": 60,
    "肤色": "暖白",
    "肤色强度": 60
  }'
```

### beauty_infos

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/add_beauty \
  -H "Content-Type: application/json" \
  -d '{
    "draft_url": "YOUR_DRAFT_URL",
    "segment_ids": ["segment-id"],
    "beauty_infos": [
      {"name": "磨皮", "intensity": 70},
      {"name": "白牙", "intensity": 50},
      {"name": "暖白", "intensity": 60}
    ]
  }'
```

### Update intensity on the same segment

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/add_beauty \
  -H "Content-Type: application/json" \
  -d '{
    "draft_url": "YOUR_DRAFT_URL",
    "segment_ids": ["segment-id"],
    "美白": 40
  }'
```

Calling the same slider again on the same segment updates intensity and does not append another figure material. `makeup-root` is kept as a single entry per segment.

## Error Codes

| Code | Message | Description | Solution |
|------|---------|-------------|----------|
| 2001 | Invalid draft URL | Draft missing or not in cache | Check `draft_url` |
| 2015 | Segment not found | `segment_id` does not exist | Confirm the segment ID |
| 2016 | Invalid segment type | Not a video segment | Call this API only on video/image segments |
| 2042 | Draft lock timeout | Another write is in progress on the same draft | Retry later |
| 2043 | Invalid beauty information | Empty `segment_ids` / no effective sliders, or intensity out of 0–100 | Check beauty parameters |
| 2044 | Beauty type not found | Unsupported slider name (e.g. face slim) | Use a supported name |
| 2045 | Beauty addition failed | Failed while writing beauty to the segment | Retry or contact support |

## Notes

- Only segments on a video track are supported (video or image). Captions, audio, and other segment types are rejected.
- Sliders that were not verified in a Jianying draft (face slim, eye enlarge, and so on) are rejected with `2044`.
- The draft stores `resource_id` and does not embed a local effect-cache path. Jianying downloads the package when the draft is opened.
- Named parameters at 0 (or an empty skin tone) are not written. At least one non-default beauty parameter or `beauty_infos` item is required.
- Skin tone accepts `肤色` or `暖白` as `name` / `肤色` value; the exported material name is `暖白`.
- Each successful call ensures one `makeup-root` on the segment (type `makeup_root`, intensity fixed at 0).

## Related Interfaces

- [Add Videos](./add_videos.md)
- [Add Images](./add_images.md)
- [Add Effects](./add_effects.md)
- [Save Draft](./save_draft.md)

---

<div align="right">

📚 **Project Resources**  
**GitHub**: [https://github.com/Hommy-master/capcut-mate](https://github.com/Hommy-master/capcut-mate)  
**Gitee**: [https://gitee.com/taohongmin-gitee/capcut-mate](https://gitee.com/taohongmin-gitee/capcut-mate)

</div>
