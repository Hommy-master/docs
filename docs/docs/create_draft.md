---
title: CREATE_DRAFT API 接口文档 - 创建剪映草稿
lang: zh-CN
description: CREATE_DRAFT API接口文档，用于创建新的剪映草稿项目，可自定义视频宽度和高度。提供详细的参数说明、使用示例和错误码说明。
keywords: CREATE_DRAFT, 剪映API, 创建草稿, 视频编辑, API文档, 草稿URL
---

# CREATE_DRAFT API 接口文档

## 接口信息

```
POST /openapi/capcut-mate/v1/create_draft
```

## 功能描述

创建剪映草稿。该接口用于创建一个新的剪映草稿项目，可以自定义视频的宽度和高度。创建成功后会返回草稿URL和帮助文档URL，为后续的视频编辑操作提供基础。

## 更多文档

📖 更多详细文档和教程请访问：[https://docs.jcaigc.cn](https://docs.jcaigc.cn)

## 请求参数

```json
{
  "width": 1920,
  "height": 1080
}
```

### 参数说明

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| width | number | ❌ | 1920 | 视频宽度(像素)，必须大于等于1 |
| height | number | ❌ | 1080 | 视频高度(像素)，必须大于等于1 |

### 参数详解

#### 尺寸参数

- **width**: 草稿视频的宽度
  - 最小值：1像素
  - 建议常用值：1920、1280、720
  - 支持自定义尺寸

- **height**: 草稿视频的高度
  - 最小值：1像素
  - 建议常用值：1080、720、480
  - 支持自定义尺寸

#### 常用分辨率

| 分辨率名称 | 宽度 | 高度 | 适用场景 |
|------------|------|------|----------|
| 1080P | 1920 | 1080 | 高清视频制作 |
| 720P | 1280 | 720 | 标清视频制作 |
| 4K | 3840 | 2160 | 超高清视频制作 |
| 竖屏短视频 | 1080 | 1920 | 手机短视频 |
| 正方形 | 1080 | 1080 | 社交媒体内容 |

## 响应格式

### 成功响应 (200)

```json
{
  "draft_url": "https://cm.jcaigc.cn/openapi/v1/get_draft?draft_id=2025092811473036584258",
  "tip_url": "https://help.assets.jcaigc.cn/draft-usage"
}
```

### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| draft_url | string | 新创建的草稿URL，用于后续的编辑操作 |
| tip_url | string | 草稿使用帮助文档URL |

### 错误响应 (4xx/5xx)

```json
{
  "detail": "错误信息描述"
}
```

## 💻 使用示例

### cURL 示例

#### 1. 创建默认分辨率草稿

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/create_draft \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 2. 创建自定义分辨率草稿

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/create_draft \
  -H "Content-Type: application/json" \
  -d '{
    "width": 1280,
    "height": 720
  }'
```

#### 3. 创建竖屏短视频草稿

```bash
curl -X POST https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1/create_draft \
  -H "Content-Type: application/json" \
  -d '{
    "width": 1080,
    "height": 1920
  }'
```



## 错误码说明

| 错误码 | 错误信息 | 说明 | 解决方案 |
|--------|----------|------|----------|
| 400 | width必须大于等于1 | 宽度参数无效 | 提供大于等于1的宽度值 |
| 400 | height必须大于等于1 | 高度参数无效 | 提供大于等于1的高度值 |
| 400 | 参数类型错误 | 参数类型不正确 | 确保width和height为数字类型 |
| 500 | 草稿创建失败 | 内部服务错误 | 联系技术支持 |
| 503 | 服务不可用 | 系统维护中 | 稍后重试 |

## 注意事项

1. **参数验证**: width和height必须为正整数
2. **分辨率建议**: 建议使用常见的视频分辨率以确保兼容性
3. **性能考虑**: 超高分辨率可能影响后续处理性能
4. **存储占用**: 高分辨率草稿会占用更多存储空间
5. **URL有效期**: 返回的draft_url具有一定的有效期

## 工作流程

1. 接收并验证请求参数
2. 创建草稿基础结构
3. 设置画布尺寸
4. 生成草稿URL
5. 返回草稿信息和帮助文档链接

## 相关接口

- [添加视频](./add_videos.md)
- [添加音频](./add_audios.md)
- [添加图片](./add_images.md)
- [保存草稿](./save_draft.md)
- [生成视频](./gen_video.md)

---

<div align="right">

📚 **项目资源**  
**GitHub**: [https://github.com/Hommy-master/capcut-mate](https://github.com/Hommy-master/capcut-mate)  
**Gitee**: [https://gitee.com/taohongmin-gitee/capcut-mate](https://gitee.com/taohongmin-gitee/capcut-mate)

</div>