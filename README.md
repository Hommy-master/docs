# docs

简创 AIGC 剪映小助手帮助文档（VitePress）。

```
.
├─ SKILL.md                     # Agent Skill 源文件（下载入口 → /SKILL.md）
├─ docs                         # VitePress srcDir
│  ├─ .vitepress
│  │  ├─ config.ts
│  │  └─ theme
│  ├─ public
│  │  ├─ llms.txt               # 模型发现入口 → /llms.txt
│  │  └─ SKILL.md               # SKILL.md 的站点副本（由 sync-skill 生成）
│  ├─ index.md
│  ├─ guide                     # 模型调用指南 / 精简契约
│  ├─ api                       # 接口正文（rewrites 到 /docs/{slug}）
│  │  ├─ draft
│  │  ├─ media
│  │  ├─ effects
│  │  ├─ lookup
│  │  ├─ helpers
│  │  └─ string
│  └─ page
│     └─ huazi.md
├─ package.json
└─ .github/workflows/release.yml
```

## SKILL.md 维护

仓库根目录的 `SKILL.md` 是**唯一源文件**，`docs/public/SKILL.md` 是站点下载副本（对外地址 `https://docs.jcaigc.cn/SKILL.md`）。
修改源文件后必须同步副本，否则下载到的还是旧版本：

```bash
pnpm run sync-skill
```

`SKILL.md` 的 YAML frontmatter 必须以第 1 行的 `---` 开头，且**只保留技能规范定义的字段**（`name`、`description`，可选 `license` / `compatibility` / `metadata` / `allowed-tools`）。多写非规范字段会让「上传 zip 到 Claude 网页版」这类流程报错，因此不要加入生成工具留下的额外键。另外：`name`（`capcut-mate`）需与安装目录名一致，文件名必须是大写的 `SKILL.md`。

对外 URL：接口页仍是 `/docs/{slug}.zh.html`；模型镜像为 `/docs/{slug}.zh.md`；发现入口为 `/llms.txt`；技能文件下载为 `/SKILL.md`。

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
