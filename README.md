# docs

简创 AIGC 剪映小助手帮助文档（VitePress）。

```
.
├─ SKILL.md                     # Agent Skill 源文件（下载入口 → /SKILL.md）
├─ scripts                     # 贴纸素材的生成与校验脚本
│  ├─ gen-sticker-assets.mjs    # 生成贴纸图集与索引
│  ├─ check-sticker-assets.mjs  # 校验图集（逐格比对源素材）
│  ├─ gen-sticker-anim.mjs      # 生成动图贴纸（动态 WebP）
│  └─ check-sticker-anim.mjs    # 校验动图（结构 / 完整性 / 透明底 / 画幅）
├─ docs                         # VitePress srcDir
│  ├─ .vitepress
│  │  ├─ config.ts
│  │  └─ theme
│  │     ├─ HuaZi               # 花字数据页（/page/huazi）
│  │     └─ TieZhi              # 贴纸数据页（/page/tiezhi）
│  ├─ public
│  │  ├─ llms.txt               # 模型发现入口 → /llms.txt
│  │  ├─ SKILL.md               # SKILL.md 的站点副本（由 sync-skill 生成）
│  │  ├─ huazi/                 # 花字预览图（逐文件）
│  │  └─ tiezhi/                # 贴纸预览图集与动图（生成的，勿手工改）
│  │     ├─ atlas/NNN.webp      # 每张 100 个贴纸，10x10，128px 一格
│  │     ├─ index.json          # [[sticker_id, title], ...]
│  │     ├─ anim/NNN/NNNN.webp  # 动图贴纸，按 1000 个一组分片
│  │     └─ anim.json           # 哪些 idx 有动图 + 生成时的 fps/时长/尺寸
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
│     ├─ huazi.md
│     └─ tiezhi.md
├─ package.json
└─ .github/workflows/release.yml
```

## 贴纸数据页维护

`docs/public/tiezhi/` **全部是生成产物，不要手工编辑**。源素材在剪映爬虫项目里（约 34GB / 7.9 万个文件），用脚本转成图集：

```bash
node scripts/gen-sticker-assets.mjs \
  --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
  --meta "E:/workspace/WorkBuddy/jianying-crawler/output/stickers.json" \
  --out docs/public/tiezhi \
  --tile 128 --quality 84 --cols 10 --frames 60
```

生成后**必须跑一遍校验**（约 5 分钟，会逐格比对源素材）：

```bash
node scripts/check-sticker-assets.mjs \
  --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
  --out docs/public/tiezhi
```

几个必须知道的点：

- **位置公式**：第 `i` 个贴纸在图集 `floor(i / 100)` 的格 `i % 100`，格内 `x = (i % 10) * tile`、`y = floor(i % 100 / 10) * tile`。页面（`theme/TieZhi/index.vue`）和两个脚本必须用同一套公式，改动任何一处都要同步。
- **拼图不能用 `tile` 滤镜**。实测 `-vf tile=10x10` + `%03d` 序列输入在本机 ffmpeg 上会读错帧（输出第 0 格出现的是第 12 个贴纸），且会静默地只填一格。脚本改用 `xstack` 显式指定每个输入的位置。
- **每格必须先 `format=rgba` 再 `pad`**。不透明源（JPG 等）没有 alpha 平面，直接 `pad` 补出来的是**实心黑边**；更要命的是 **xstack 的输出格式取第一个输入的格式**——只要第 0 格来自不透明源，整张图集就会以无 alpha 的 yuv420p 编码，所有透明区域全变黑（实测 794 张里 253 张中招）。`verifyAtlas` 现在会强制检查 `pix_fmt=yuva420p`，缺 alpha 的图集一律判为不合格并重建。
- **动图取帧规则**（`--frames`，默认 60）：动图默认只取首帧，但实测有 600 多个贴纸**首帧是全透明的**，内容在后面几帧才逐渐画出来。这类贴纸会退回到「内容最饱满的那帧」——注意不是「第一张非空帧」，那样取到的多半是只有几笔轮廓的半成品。判据是把最多 60 帧的 alpha 缩略图一次解码出来，数有内容的像素数取最大。两个脚本共用这套规则，改一处必须同步另一处。
- 脚本自带校验：输出尺寸必须是 `cols*tile`，且体积不得低于下限，否则报错退出——避免"空壳图集"被当成成功。
- 支持断点续跑：已存在的图集会跳过，中断后原样重跑即可。
- 改分辨率/质量会让**全量重新生成**（约 20 分钟），并显著改变体积：128px/q84 约 285MB，160px/q86 约 398MB。
- 索引体积随条数线性增长（7.9 万条约 4MB），页面在运行时 `fetch`，不要 import 进 JS 包。
- 比对 **PSNR 前必须先把两张图合成到中灰底**：带 alpha 的图直接比毫无意义，全透明区域的 RGB 是任意值，会让正确的副本也报出个位数 dB 的假失败。

### 动图

源素材里的 GIF 合计约 18GB（23,513 个，中位 121KB、最大 58MB），页面不可能直接拉。全部转成 128px 的动态 WebP：

```bash
node scripts/gen-sticker-anim.mjs \
  --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
  --out docs/public/tiezhi \
  --size 128 --quality 55 --fps 10 --max-seconds 2
```

产物是 `docs/public/tiezhi/anim/<idx/1000>/<idx>.webp` 和 `anim.json`（列出哪些 idx 有动图）。页面取到 `anim.json` 后，命中的贴纸用 `<img>` 播动图，其余继续用图集格子；动图缺失或解码失败会当场退回静态格子，不会露出破图。同样支持断点续跑。

```bash
node scripts/check-sticker-anim.mjs \
  --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
  --out docs/public/tiezhi
```

几个必须知道的点：

- **128px 不是随便定的**：图集格子本身就是 128px，动图按同一套 `scale=...:force_original_aspect_ratio=decrease` 生成，因此动图和静图一样清楚，网格里两种卡片的画面大小也完全一致。
- 23,513 个候选 GIF 里真正生成动图的只有 19,298 个（82%），剩下 4,214 个（18%）页面继续用静态格子。**源文件是多帧，不等于在我们这套参数下看得出动效**，实测不含动效的有三类：
  - 单帧 GIF，2,921 个（12.4%），只是静图；
  - 多帧，但按 `fps` 抽帧后只剩一种画面，1,293 个（5.5%）。典型是「首帧 190ms、次帧只占 20ms」，10fps 抽样只会落在第一帧上；也有单帧却自带帧时长的 GIF 被 `fps` 滤镜补齐成一串**一模一样的画面**；整段比一个帧间隔还短的（两帧各 10ms，`fps=10` 一帧都吐不出来）也归在这里。不剔除的话，页面上会冒出一批挂着「动图」角标却纹丝不动的贴纸。判据是「逐帧字节完全相同」：动图 WebP 逐帧独立编码，画面相同必然字节相同；只要有一帧不同就不算全同，不会误伤真动图；

  另有 1 个源素材本机 ffmpeg 解不开（那个 `.gif` 其实是动画 WebP）。
- **判「漏生成」必须按同一套参数复算**：`check-sticker-anim.mjs` 是拿 `anim.json` 里的 fps **和 maxSeconds** 重新给源素材抽帧的，只有抽帧后确实还剩多种画面的才算真漏。漏掉 `-t` 就会误报——实测有个 GIF 首帧帧时长被写成 **10 秒**，动效在 t=10s 才出现，而生成时 `-t 2` 早就把它截断了。另外切帧别用「总字节 ÷ 源帧数」：rawvideo 输出默认是 CFR 的，ffmpeg 会按时间戳复制补帧（实测 2 帧的 GIF 被补成 21 帧），要加 `-fps_mode passthrough`。
- **画幅比要跟源素材比，不能跟图集格子比**：格子是「整帧等比缩到 128 以内再 pad 成方形」，能从头量到的只是内容像素的包围盒，而内容通常比整帧小一圈。拿动图的整帧画幅去比格子的内容包围盒，等于比两个不同的东西，实测 12 个抽样里能报出 6 个假失败。
- **别用 ffprobe 校验动图 WebP**：本机 ffmpeg 6.1 只认静态 WebP，喂它自己刚写出来的动画得到的是 `0,0,unknown` + `image data not found`。校验脚本改成直接读 RIFF 分块（VP8X 的 ALPHA/ANIMATION 标志、ANMF 帧数、分块是否越界），比 ffprobe 查得还多。
- **不用 VP8/VP9 视频容器**：WebM+alpha 只比 WebP 小 30%（同规格 371MB vs 497MB），但 Safari / 微信 iOS 不支持 WebM 的透明通道，透明区会变成黑底——正是图集那边花了两轮才修掉的毛病。另外本机 ffmpeg 的 VP9 alpha 直接失效（显式 `-pix_fmt yuva420p` 也只出 yuv420p）。
- `-compression_level 4` 而不是 6：实测同一张图 286ms vs 1340ms，体积只差 1.4%。
- 体积实测 **568.0MB**（19,298 个，即原始 18GB 的 3.1%；定规格时估的是约 500MB，超了约 14%）。规格对照（全量 23,513 个）：96px/10fps/2s 约 356MB；128px/8fps/1.5s 约 340MB（1.5s 会截断 31% 的动图，循环处会跳）。
- 动图按 1000 个一组分片存放，两万多个文件平铺一个目录，列举和提交都很难受。

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
