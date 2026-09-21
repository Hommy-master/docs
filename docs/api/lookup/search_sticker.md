# SEARCH_STICKER API Documentation

## 🌐 Language Switch
[中文版](/docs/search_sticker.zh) | [English](/docs/search_sticker)

## Interface Information

```
POST /openapi/capcut-mate/v1/search_sticker
```

## Function Description

Search stickers by keywords. This interface is used to search for related sticker materials based on keywords provided by users, returning a list of matching stickers, including detailed information such as image URLs, dimensions, types, etc.

## More Documentation

📖 For more detailed documentation and tutorials, please visit: [https://docs.jcaigc.cn](https://docs.jcaigc.cn)

## Request Parameters

```json
{
  "keyword": "人"
}
```

### Parameter Description

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| keyword | string |✅ | - | Search keyword |

### Parameter Details

#### keyword

- **Type**: string
- **Description**: Keyword to search for stickers
- **Example**: "人", "花", "动物"

## Response Format

### Success Response (200)

```json
{
  "data": [
    {
      "sticker": {
        "large_image": {
          "image_url": "https://p3-heycan-jy-sign.byteimg.com/tos-cn-i-3jr8j4ixpe/29351205dbd943658d94c8feb17e5ed4~tplv-3jr8j4ixpe-resize:1920:1920.png?x-expires=1797257777&x-signature=r18I9uLQzgm%2FcvF8WNLbgw8BRwg%3D"
        },
        "preview_cover": "",
        "sticker_package": {
          "height_per_frame": 540,
          "size": 305932,
          "width_per_frame": 540
        },
        "sticker_type": 1,
        "track_thumbnail": "https://p3-heycan-jy-sign.byteimg.com/tos-cn-i-3jr8j4ixpe/29351205dbd943658d94c8feb17e5ed4~tplv-3jr8j4ixpe-resize:120:120.png?x-expires=1797257777&x-signature=NqeKYGyeqIjCzF0Ls07ctnP%2BehI%3D&format=.png"
      },
      "sticker_id": "7521200021564427545",
      "title": "大笑"
    }
  ]
}
```

### Response Field Description

| Field | Type | Description |
|-------|------|-------------|
| data | array | Sticker data list |
| sticker | object | Detailed sticker information |
| large_image | object | Large image information |
| image_url | string | Image URL |
| preview_cover | string | Preview cover |
| sticker_package | object | Sticker package information |
| height_per_frame | number | Height per frame |
| size | number | Sticker package size |
| width_per_frame | number | Width per frame |
| sticker_type | number | Sticker type |
| track_thumbnail | string | Track thumbnail |
| sticker_id | string | Sticker ID |
| title | string | Sticker title |

### Error Response (4xx/5xx)

```json
{
  "detail": "Error message description"
}
```

## Usage Examples

### cURL Examples

#### 1. Search Stickers with Keyword "人"

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/search_sticker \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "人"
  }'
```

#### 2. Search Stickers with Keyword "动物"

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/search_sticker \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "动物"
  }'
```

## Error Code Description

| Error Code | Error Message | Description | Solution |
|------------|---------------|-------------|----------|
| 400 | keyword is required | Missing keyword parameter | Provide a valid keyword parameter |

## Notes

1. **Keyword Matching**: Current implementation uses simple title matching, can be extended to full-text search in actual applications
2. **Data Source**: Currently returns mock data, in actual applications should connect to sticker database or call external APIs
3. **Performance Consideration**: For large sticker datasets, should consider pagination and caching mechanisms

## Workflow

1. Validate required parameter (keyword)
2. Call service layer to search for stickers
3. Return matching sticker list

## Related Interfaces

- [Add Sticker](/docs/add_sticker)
- [Create Draft](/docs/create_draft)

---

<div align="right">

📚 **Project Resources**  
**GitHub**: [https://github.com/Hommy-master/capcut-mate](https://github.com/Hommy-master/capcut-mate)  
**Gitee**: [https://gitee.com/taohongmin-gitee/capcut-mate](https://gitee.com/taohongmin-gitee/capcut-mate)

</div>