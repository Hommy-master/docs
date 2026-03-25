# 花字数据 Vue 组件

## 📁 文件结构

```
HuaZi/
├── index.vue      # 主组件（Vue 3 + TypeScript）
├── index.less     # 样式文件（LESS）
├── data.ts        # 花字数据（TypeScript）
├── huazi.html     # 原始 HTML 文件（参考）
└── README.md      # 本文档
```

## 🎯 功能特性

- ✅ **搜索功能**：支持按名称、描述、作者搜索
- ✅ **分页显示**：每页显示 10 条数据
- ✅ **图片预览**：点击缩略图查看大图
- ✅ **统计信息**：显示总数和原创数量
- ✅ **响应式设计**：适配移动端和桌面端
- ✅ **TypeScript**：完整的类型定义

## 📊 数据说明

### 当前数据
`data.ts` 中包含 5 条示例数据用于演示。

### 使用完整数据
如果需要从 `huazi.html` 提取完整数据：

1. 从 HTML 中提取 JSON 数据数组
2. 转换为 TypeScript 接口格式
3. 替换 `data.ts` 中的 `huaZiData` 数组

示例数据格式：
```typescript
{
  id: string           // 唯一标识
  title: string        // 标题
  description: string  // 描述
  coverUrl: {          // 封面图
    small: string
    static_img: string
  }
  author: {            // 作者信息
    name: string
    avatar_url?: string
  }
  createTime: number   // 创建时间戳
  isOriginal: boolean  // 是否原创
}
```

## 🔧 自定义配置

### 修改分页大小
在 `index.vue` 中修改：
```typescript
const itemsPerPage = ref(40)  // 改为需要的数字
```

### 修改样式
编辑 `index.less` 文件

### 添加新功能
在 `index.vue` 的 `<script setup>` 部分添加逻辑

## 🚀 使用方法

在 VitePress 导航中点击 **"🎨 花字数据"** 即可查看页面。

访问路径：`/page/huazi`

## 💡 注意事项

1. 图片链接使用了示例 URL，实际使用时请替换为真实有效的链接
2. 大量数据时建议实现虚拟滚动以提升性能
3. 可以添加更多筛选条件（如分类、时间范围等）
