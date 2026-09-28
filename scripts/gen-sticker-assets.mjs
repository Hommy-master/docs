/**
 * 从剪映爬虫项目生成站点用的贴纸预览资源。
 *
 * 79,368 个贴纸若逐个输出图片，会产生近 8 万个小文件（git / 构建 / 部署都会变慢）。
 * 这里改为**图集（atlas）**：每 100 个贴纸拼成一张 10x10 的 WebP，文件数降到 794。
 *
 * 产物：
 *   <out>/atlas/NNNN.webp   每张含 COLS*COLS 个贴纸，TILE x TILE 一格
 *   <out>/index.json        见下方「索引格式」
 *
 * 第 i 个贴纸在图集内的位置：
 *   图集 = floor(i / PER_ATLAS)，格 = i % PER_ATLAS
 *   x = (格 % COLS) * TILE，y = floor(格 / COLS) * TILE
 *
 * 用法：
 *   node scripts/gen-sticker-assets.mjs \
 *     --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
 *     --meta "E:/workspace/WorkBuddy/jianying-crawler/output/stickers.json" \
 *     --out docs/public/tiezhi
 *
 * 先小样本试跑（例如 --every 800 抽 100 条）再全量，避免尺寸/质量选错。
 * 可重复执行：已生成的图集会跳过，中断后重跑即可续做。
 */
import { execFile } from 'node:child_process'
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

// ── 参数 ────────────────────────────────────────────────────────────────
function parseArgs() {
    const argv = process.argv.slice(2)
    const get = (name, fallback) => {
        const i = argv.indexOf(`--${name}`)
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
    }
    return {
        src: get('src'),
        meta: get('meta'),
        out: get('out', 'docs/public/tiezhi'),
        tile: Number(get('tile', 200)),
        cols: Number(get('cols', 10)),
        quality: Number(get('quality', 80)),
        concurrency: Number(get('concurrency', 8)),
        atlasJobs: Number(get('atlas-jobs', 3)),
        limit: Number(get('limit', 0)),
        every: Number(get('every', 0)),
        minBytesPerCell: Number(get('min-bytes-per-cell', 150)),
        // 动图首帧若全透明，最多往后看多少帧；1 = 严格只要首帧（会出现空白预览）
        frames: Number(get('frames', 60)),
    }
}

const args = parseArgs()
if (!args.src || !args.meta) {
    console.error('缺少参数：--src <贴纸文件目录> --meta <stickers.json>')
    process.exit(1)
}

const SRC = resolve(args.src)
const META = resolve(args.meta)
const OUT = resolve(args.out)
const TILE = args.tile
const COLS = args.cols
const PER_ATLAS = COLS * COLS
const ATLAS_SIZE = COLS * TILE
const ATLAS_DIR = join(OUT, 'atlas')

// xstack 的 layout：把第 k 个输入放到第 k 格（行优先）
const XSTACK_LAYOUT = Array.from(
    { length: PER_ATLAS },
    (_, k) => `${(k % COLS) * TILE}_${Math.floor(k / COLS) * TILE}`
).join('|')

for (const p of [SRC, META]) {
    if (!existsSync(p)) {
        console.error(`路径不存在：${p}`)
        process.exit(1)
    }
}
mkdirSync(ATLAS_DIR, { recursive: true })

// ── 1. 建立 sticker_id → 源文件路径 的映射 ──────────────────────────────
console.log(`扫描素材目录：${SRC}`)
const idToFile = new Map()
let scanned = 0
for (const shard of readdirSync(SRC, { withFileTypes: true })) {
    if (!shard.isDirectory()) continue
    const shardDir = join(SRC, shard.name)
    for (const f of readdirSync(shardDir)) {
        const dot = f.lastIndexOf('.')
        if (dot <= 0) continue
        idToFile.set(f.slice(0, dot), join(shardDir, f))
        scanned++
    }
}
console.log(`扫描到 ${scanned} 个素材文件，${idToFile.size} 个唯一 ID`)

// ── 2. 读取元数据，顺序即图集内的位置 ───────────────────────────────────
const meta = JSON.parse(readFileSync(META, 'utf8'))
let items = meta.map((x) => [String(x.sticker_id), String(x.title ?? '').trim()])
if (args.every > 0) items = items.filter((_, i) => i % args.every === 0)
const total = args.limit > 0 ? Math.min(args.limit, items.length) : items.length
console.log(`元数据 ${meta.length} 条，本次处理 ${total} 条`)

const missing = items.slice(0, total).filter(([id]) => !idToFile.has(id))
if (missing.length) {
    console.warn(`⚠️ ${missing.length} 个 ID 没有对应素材文件，将用透明格占位（示例：${missing[0][0]}）`)
}

// ── 3. 生成 ─────────────────────────────────────────────────────────────
const tmpRoot = mkdtempSync(join(tmpdir(), 'tiezhi-'))
const atlasCount = Math.ceil(total / PER_ATLAS)
const PAD = Math.max(3, String(Math.max(atlasCount - 1, 0)).length)
const atlasName = (a) => `${String(a).padStart(PAD, '0')}.webp`

let built = 0
let skipped = 0
let done = 0
/** 首帧空白、改用后面某一帧的贴纸数 */
let recovered = 0
const failures = []
/** 源文件本身坏掉 / 编码不支持的贴纸：留透明格，不影响整张图集 */
const badSources = []

/**
 * 统一尺寸方块：居中缩放 + 透明补边。
 *
 * `format=rgba` 必须**放在 pad 前面**，两个原因：
 *   1. 不透明源（JPG 等）本身没有 alpha 平面，pad 不会凭空造一个出来，
 *      补边就会变成实心黑；先转 rgba，pad 才能真正补出透明边。
 *   2. xstack 的**输出格式取第一个输入的格式**。只要第 0 格是不透明的，
 *      整张图集就会以 yuv420p（无 alpha）编码，所有透明区域一律渲染成黑色 ——
 *      实测 794 张里有 253 张中招。每格统一成 rgba，图集才稳定带 alpha。
 */
const TILE_FILTER = `scale=${TILE}:${TILE}:force_original_aspect_ratio=decrease,` +
    `format=rgba,` +
    `pad=${TILE}:${TILE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`

/**
 * 一张图的最大 alpha 值；整张全透明返回 0。
 *
 * 必须先 `format=rgba`：不透明图（JPG 等）没有 alpha 平面，直接 alphaextract
 * 会一个 packet 都产不出来，ffmpeg 以非 0 退出。补上 alpha 平面后，
 * 不透明图得到恒为 255 的 alpha，正是我们要的语义。
 * 探测本身失败时按"有内容"处理，绝不让它把整格图判死。
 */
async function alphaMax(file) {
    try {
        const { stdout } = await run(
            'ffmpeg',
            [
                '-loglevel', 'error', '-y', '-i', file,
                '-vf', 'format=rgba,alphaextract,format=gray',
                '-frames:v', '1', '-f', 'rawvideo', '-',
            ],
            { encoding: 'buffer', maxBuffer: 1 << 24 }
        )
        let max = 0
        for (const v of stdout) if (v > max) max = v
        return max === 0 && stdout.length === 0 ? 255 : max
    } catch {
        return 255
    }
}

/**
 * 单张贴纸 → 统一尺寸方块（居中缩放，透明补边）。
 *
 * 动图（GIF 等）默认只取首帧。但实测不少动图**首帧是空的**（内容在后面几帧才
 * 逐渐画出来），照首帧输出会得到一张全透明图，页面上就是一块空白。
 * 传 --frames N（N>1）时，若首帧全透明就往后找第一张有内容的帧。
 */
async function makeTile(srcFile, outFile) {
    await run('ffmpeg', [
        '-loglevel', 'error',
        '-y',
        '-i', srcFile,
        '-vf', TILE_FILTER,
        '-frames:v', '1',
        outFile,
    ])

    if (args.frames <= 1) return
    if ((await alphaMax(outFile)) > 0) return

    // 首帧是全透明的，退回到后面某一帧。
    // 注意不能取"第一张有内容的帧"：这类动图多半是内容逐渐画出来的，
    // 头几帧只有一点点轮廓，取到就会得到一张几乎看不见的预览图。
    // 这里一次性把所有帧的 alpha 缩略图解码出来，挑"有内容的像素最多"的那帧。
    const dir = mkdtempSync(join(tmpRoot, 'frames-'))
    try {
        await run('ffmpeg', [
            '-loglevel', 'error', '-y',
            '-i', srcFile,
            '-frames:v', String(args.frames),
            join(dir, '%03d.png'),
        ])
        const files = readdirSync(dir).sort()
        if (files.length <= 1) return // 单帧源，没有可退的帧

        const SIDE = 32
        const { stdout } = await run(
            'ffmpeg',
            [
                '-loglevel', 'error', '-y',
                '-i', join(dir, '%03d.png'),
                '-vf', `format=rgba,alphaextract,format=gray,scale=${SIDE}:${SIDE}:flags=area`,
                '-f', 'rawvideo', '-',
            ],
            { encoding: 'buffer', maxBuffer: 1 << 24 }
        )
        const FRAME_BYTES = SIDE * SIDE
        const frames = Math.floor(stdout.length / FRAME_BYTES)
        let best = -1
        let bestScore = 0
        for (let k = 0; k < frames; k++) {
            let score = 0
            for (let p = k * FRAME_BYTES; p < (k + 1) * FRAME_BYTES; p++) {
                if (stdout[p] > 8) score++
            }
            // >= 让同样饱满时取更靠后的帧（渐显类动图最后一帧才是完整状态）
            if (score >= bestScore && score > 0) {
                bestScore = score
                best = k
            }
        }
        if (best < 0) return // 所有帧都是空的，只能留空白

        await run('ffmpeg', [
            '-loglevel', 'error', '-y',
            '-i', join(dir, files[best]),
            '-vf', TILE_FILTER,
            '-frames:v', '1',
            outFile,
        ])
        recovered++
    } finally {
        cleanupDir(dir)
    }
}

/**
 * 把 PER_ATLAS 张方块拼成一张图集。
 *
 * 注意：**不要用 `-vf tile=COLSxCOLS` + `%03d` 序列输入**。
 * 实测该写法在本机 ffmpeg 上会读错帧（5x5 时第 0 格出现的是第 12 个贴纸），
 * 且输出静默地只有一格有内容。xstack 由命令行显式指定每个输入的去向，
 * 不存在这个问题；每格的对应关系已用「源图 vs 图集裁切」比对图逐格验证过。
 */
function makeAtlas(tilePaths, outFile) {
    const inputs = tilePaths.flatMap((p) => ['-i', p])
    const fc =
        `[${tilePaths.map((_, k) => k).join('][')}]` +
        `xstack=inputs=${tilePaths.length}:layout=${XSTACK_LAYOUT}`
    return run('ffmpeg', [
        '-loglevel', 'error',
        '-y',
        ...inputs,
        '-filter_complex', fc,
        '-frames:v', '1',
        '-c:v', 'libwebp',
        '-quality', String(args.quality),
        '-compression_level', '6',
        outFile,
    ])
}

/** 校验图集不是「空壳」——尺寸必须是 COLS*TILE，必须带 alpha，且体积达标 */
async function verifyAtlas(file) {
    const { stdout } = await run('ffprobe', [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,pix_fmt',
        '-of', 'csv=p=0',
        file,
    ])
    const [wStr, hStr, pixFmt] = stdout.trim().split(',').map((x) => x.trim())
    const w = Number(wStr)
    const h = Number(hStr)
    if (w !== ATLAS_SIZE || h !== ATLAS_SIZE) {
        throw new Error(`图集尺寸异常：期望 ${ATLAS_SIZE}x${ATLAS_SIZE}，实际 ${w}x${h}`)
    }
    // 没有 alpha 的图集，透明区域会被编码成实心黑，页面上就是一格格黑方块
    if (pixFmt !== 'yuva420p') {
        throw new Error(`图集缺少 alpha 通道（pix_fmt=${pixFmt}），透明区域会变黑`)
    }
    const bytes = statSync(file).size
    const floor = args.minBytesPerCell * PER_ATLAS
    if (bytes < floor) {
        throw new Error(`图集体积异常：${bytes} B < 下限 ${floor} B，可能拼图失败`)
    }
    return bytes
}

/** 简易并发池 */
async function pool(tasks, size) {
    let next = 0
    const workers = Array.from({ length: Math.min(size, tasks.length) }, async () => {
        while (next < tasks.length) {
            const i = next++
            await tasks[i]()
        }
    })
    await Promise.all(workers)
}

/**
 * 清理临时目录。
 * Windows 上杀毒/索引服务可能仍持有刚写完的 PNG 句柄，导致 rmdir 抛 ENOTEMPTY，
 * 这里退避重试；仍然失败就只告警，不能让清理失败把整轮生成带崩。
 */
function cleanupDir(dir) {
    try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 })
    } catch (e) {
        console.warn(`\n⚠️ 临时目录清理失败（不影响产物）：${dir} —— ${e.code || e.message}`)
    }
}

/** 生成一张图集（含临时方块与校验）。单张失败只记录，不中断整轮。 */
async function buildAtlas(a) {
    const from = a * PER_ATLAS
    const to = Math.min(from + PER_ATLAS, total)
    const atlasFile = join(ATLAS_DIR, atlasName(a))
    const tileDir = mkdtempSync(join(tmpRoot, 'tiles-'))

    try {
        const tasks = []
        for (let i = from; i < to; i++) {
            const srcFile = idToFile.get(items[i][0])
            if (!srcFile) continue
            const slot = i - from // 用 const 固化，避免闭包拿到循环结束后的值
            const idx = i
            tasks.push(async () => {
                try {
                    await makeTile(srcFile, join(tileDir, `${String(slot).padStart(3, '0')}.png`))
                } catch (e) {
                    // 单个源文件坏掉（爬虫抓到的残图等）不该让整张图集失败：
                    // 这里留空，后面的补格逻辑会填一张透明方块。
                    badSources.push({
                        idx,
                        id: items[idx][0],
                        file: srcFile,
                        msg: String(e.stderr || e.message || e)
                            .split('\n')
                            .filter(Boolean)
                            .pop(),
                    })
                }
            })
        }
        await pool(tasks, args.concurrency)

        // 缺素材 / 尾图不满的格子补透明方块，否则 xstack 会因输入数不足报错
        const tilePaths = []
        for (let slot = 0; slot < PER_ATLAS; slot++) {
            const tilePath = join(tileDir, `${String(slot).padStart(3, '0')}.png`)
            if (!existsSync(tilePath)) {
                await run('ffmpeg', [
                    '-loglevel', 'error', '-y',
                    '-f', 'lavfi',
                    '-i', `color=c=0x00000000:s=${TILE}x${TILE}`,
                    '-frames:v', '1',
                    tilePath,
                ])
            }
            tilePaths.push(tilePath)
        }

        await makeAtlas(tilePaths, atlasFile)
        await verifyAtlas(atlasFile)
        built++
        done += to - from
        process.stdout.write(`\r已生成图集 ${built} 张（跳过 ${skipped}），进度 ${done}/${total}   `)
    } catch (e) {
        failures.push({ atlas: a, file: atlasFile, msg: e.message || String(e) })
        process.stdout.write(`\r图集 ${a} 失败，已跳过（共 ${failures.length} 张失败）   `)
    } finally {
        cleanupDir(tileDir)
    }
}

const todo = []
for (let a = 0; a < atlasCount; a++) {
    const existing = join(ATLAS_DIR, atlasName(a))
    if (existsSync(existing)) {
        // 断点续跑不能只看"文件在不在"：上一轮如果被杀进程打断，
        // 会留下一个截断的 webp，只看存在性就会把它当成已完成，永久坏在那里。
        try {
            await verifyAtlas(existing)
            skipped++
            done += Math.min(PER_ATLAS, total - a * PER_ATLAS)
            continue
        } catch (e) {
            console.warn(`\n⚠️ 已存在的图集校验不通过，将重建：${existing} —— ${e.message}`)
        }
    }
    todo.push(a)
}
await pool(todo.map((a) => () => buildAtlas(a)), args.atlasJobs)

// ── 4. 写索引 ───────────────────────────────────────────────────────────
const payload = {
    tile: TILE,
    cols: COLS,
    atlasPerFile: PER_ATLAS,
    total,
    items: items.slice(0, total),
}
const indexFile = join(OUT, 'index.json')
writeFileSync(indexFile, JSON.stringify(payload))
rmSync(tmpRoot, { recursive: true, force: true })

console.log(`\n完成：图集 ${built} 张（跳过 ${skipped} 张）→ ${ATLAS_DIR}`)
console.log(`索引：${indexFile}（${total} 条，${(statSync(indexFile).size / 1048576).toFixed(1)} MB）`)

if (recovered) {
    console.log(`\n提示：${recovered} 个动图贴纸的首帧是全透明的，已改用内容最饱满的那一帧。`)
}

if (badSources.length) {
    console.warn(`\n⚠️ ${badSources.length} 个源文件无法解码，这些格子是空白的（页面仍会显示卡片，只是没有图）：`)
    for (const b of badSources.slice(0, 10)) {
        console.warn(`   idx ${b.idx} ${b.id} —— ${b.file}\n      ${b.msg}`)
    }
    if (badSources.length > 10) console.warn(`   …另有 ${badSources.length - 10} 个`)
}

if (failures.length) {
    console.error(`\n⚠️ ${failures.length} 张图集生成失败，原样重跑即可补齐：`)
    for (const f of failures.slice(0, 20)) console.error(`   ${f.file} —— ${f.msg}`)
    process.exit(1)
}
