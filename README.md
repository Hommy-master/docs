# docs

简创 AIGC 剪映小助手帮助文档（VitePress）。

```
.
├─ docs
│  ├─ .vitepress
│  │  └─ config.ts
│  └─ index.md
└─ package.json
```

## 环境要求

- Node.js **22**
- pnpm **10**

安装 Node.js 后请**重新打开终端**，再执行下面的检查命令：

```bash
node -v
# 期望输出：v22.x.x

npm -v
```

若尚未安装 pnpm，用 npm 全局安装：

```bash
npm install -g pnpm@10
pnpm -v
# 期望输出：10.x.x
```

## 手动打包

在仓库根目录（与 `package.json` 同级）执行：

```bash
# 1. 安装依赖
pnpm install

# 2. 打包静态站点
pnpm run build
```

打包成功后，产物目录为：

```
docs/.vitepress/dist
```

将该目录部署到静态网站即可。如需本地预览打包结果：

```bash
pnpm run serve
```

开发时热更新预览（不生成正式产物）：

```bash
pnpm run dev
```

## 图片引入方法

```html
<!-- 插入网络图片 -->
```

![Vue.js Logo](https://vuejs.org/images/logo.png)

```html
<!-- 插入本地图片 -->
```

![图片引入示例](./demo.png)
