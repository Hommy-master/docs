/**
 * 校验 scripts/gen-sticker-anim.mjs 的产物：每个动图是不是真的属于索引里那个贴纸，透明底有没有丢。
 *
 * 为什么不能像静图那样用 ffprobe 比对：本机的 ffmpeg 6.1 **读不了动图 WebP**，喂它自己刚写出来的
 * 动画，得到的是 `0,0,unknown` + `image data not found`（浏览器侧完全正常）。所以结构类校验改成
 * 直接读 RIFF 分块；只有「源素材那半边」才用 ffmpeg，因为它读 GIF 没问题。
 *
 * 三层校验：
 *   1. 结构：anim.json 与文件本身（VP8X 的 ALPHA/ANIMATION 标志、ANMF 帧数、画布尺寸、分块完整性）
 *   2. 完整性：源素材里真有动效的 GIF 是否都在 anim.json 里，索引里的 idx 要能对上同一个源文件。
 *      判「漏」之前先按同一个 fps 抽帧复算——源是 2 帧不代表这个动图在我们的帧率下看得出动效
 *   3. 抽样对照：源素材有透明像素的，动图必须带逐帧 alpha（ALPH 分块）；动图的画布画幅必须与
 *      源素材一致——不一致意味着这个动图配错了贴纸
 *
 *   第 2 层要逐个真解码源文件来数帧（GIF 的 nb_frames 是 ffprobe 猜的，不能信），
 *   默认抽查 200 条；--samples 0 是全量，那要跑很久。
 *
 * 用法：
 *   node scripts/check-sticker-anim.mjs \
 *     --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
 *     --out docs/public/tiezhi
 */
import { execFile } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

function parseArgs() {
    const argv = process.argv.slice(2)
    const get = (name, fallback) => {
        const i = argv.indexOf(`--${name}`)
        return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
    }
    return {
        src: get('src'),
        out: get('out', 'docs/public/tiezhi'),
        // 第 2 层的抽查条数（要真解码每个源文件，全量跑很慢），0 = 全量
        samples: Number(get('samples', 200)),
        concurrency: Number(get('concurrency', 8)),
        // 画幅比的允许误差。动图和源素材都是「等比缩到 128 以内」，正常应当分毫不差，
        // 5% 只是给宽高取整留的余量
        aspectTolerance: Number(get('aspect-tolerance', 0.05)),
        // 画幅比对照的条数，0 = 抽样项全比（只是一次 ffprobe，很便宜）
        aspectSamples: Number(get('aspect-samples', 0)),
    }
}

const args = parseArgs()
if (!args.src) {
    console.error('缺少参数：--src <贴纸文件目录>（需要源素材才能校验动图归属）')
    process.exit(1)
}

const SRC = resolve(args.src)
const OUT = resolve(args.out)
const INDEX = join(OUT, 'index.json')
const ANIM = join(OUT, 'anim.json')

for (const p of [SRC, INDEX, ANIM]) {
    if (!existsSync(p)) {
        console.error(`路径不存在：${p}`)
        process.exit(1)
    }
}

const index = JSON.parse(readFileSync(INDEX, 'utf8'))
const anim = JSON.parse(readFileSync(ANIM, 'utf8'))
const TOTAL = index.total
const SHARD = anim.shard || 1000

const animPath = (idx) => join(OUT, 'anim', String(Math.floor(idx / SHARD)), `${idx}.webp`)

console.log(
    `索引 ${TOTAL} 条；动图 ${anim.items.length} 个，规格 ${anim.size}px / ${anim.fps}fps / ≤${anim.maxSeconds}s`
)

// ── 1. 结构 ─────────────────────────────────────────────────────────────
const ANMF_HEADER = 16 // ANMF 载荷前 16 字节是帧头，之后才是子分块

/**
 * 读 RIFF 分块。返回 { frames, width, height, alphaChunks, flags }，顺带发现被截断的文件。
 *
 * VP8X 标志位（按容器规范）：bit5 ICC / bit4 ALPHA / bit3 EXIF / bit2 XMP / bit1 ANIMATION。
 * 别记反：**Alpha 是 0x10，Animation 是 0x02**（记反了会把「不透明的动图」全判成没有 alpha）。
 */
function readAnim(file) {
    const buf = readFileSync(file)
    if (buf.length < 30) throw new Error(`文件过小：${buf.length} 字节`)
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
        throw new Error('不是 WebP 文件')
    }
    let offset = 12
    let vp8x = null
    let frames = 0
    let alphaChunks = 0
    while (offset + 8 <= buf.length) {
        const id = buf.toString('ascii', offset, offset + 4)
        const len = buf.readUInt32LE(offset + 4)
        if (offset + 8 + len > buf.length) throw new Error(`分块 ${id} 越界，文件被截断`)
        if (id === 'VP8X') {
            vp8x = {
                flags: buf.readUInt8(offset + 8),
                width: buf.readUIntLE(offset + 12, 3) + 1,
                height: buf.readUIntLE(offset + 15, 3) + 1,
            }
        } else if (id === 'ANMF') {
            frames++
            // 帧内子分块：有 ALPH 才说明这一帧真的带了逐像素透明
            let p = offset + 8 + ANMF_HEADER
            const end = offset + 8 + len
            while (p + 8 <= end) {
                const sub = buf.readUInt32LE(p + 4)
                if (buf.toString('ascii', p, p + 4) === 'ALPH') alphaChunks++
                p += 8 + sub + (sub % 2)
            }
        }
        offset += 8 + len + (len % 2)
    }
    if (!vp8x) throw new Error('缺少 VP8X 分块（写成了单帧 WebP）')
    if ((vp8x.flags & 0x02) === 0) throw new Error('没有 ANIMATION 标志（不是动图）')
    if (frames <= 1) throw new Error(`只有 ${frames} 帧`)
    if (vp8x.width > anim.size || vp8x.height > anim.size) {
        throw new Error(`画布超标：${vp8x.width}x${vp8x.height}`)
    }
    return { frames, width: vp8x.width, height: vp8x.height, alphaChunks, flags: vp8x.flags }
}

let bad = 0
/** 全量统计带不带 ALPHA 标志：源里不透明的贴纸本来就没有 alpha 平面，所以只报告不判失败，
 *  但「一个都没有 alpha」就说明编码参数丢了 alpha 平面，那是要命的 */
let noAlphaFlag = 0
for (const idx of anim.items) {
    if (!Number.isInteger(idx) || idx < 0 || idx >= TOTAL) {
        console.error(`✗ 索引里有非法下标：${idx}`)
        bad++
        continue
    }
    const file = animPath(idx)
    if (!existsSync(file)) {
        console.error(`✗ 索引里有、文件却不在：idx ${idx} —— ${file}`)
        bad++
        continue
    }
    try {
        if ((readAnim(file).flags & 0x10) === 0) noAlphaFlag++
    } catch (e) {
        console.error(`✗ idx ${idx}（${index.items[idx][1]}）：${e.message}`)
        bad++
    }
}
const sorted = [...anim.items].sort((a, b) => a - b)
if (new Set(anim.items).size !== anim.items.length) {
    console.error('✗ anim.json 里有重复下标')
    bad++
}
if (sorted.join() !== anim.items.join()) {
    console.warn('△ anim.json 的下标不是升序的（不影响使用，但不利于比对）')
}
console.log(
    `结构校验：${anim.items.length} 个动图，异常 ${bad}（不带 alpha 平面 ${noAlphaFlag} 个，` +
        `源素材本就不透明的贴纸不算问题）`
)

// ── 2. 完整性：源素材里该生成的都生成了吗 ───────────────────────────────
const idToFile = new Map()
for (const shard of readdirSync(SRC, { withFileTypes: true })) {
    if (!shard.isDirectory()) continue
    const shardDir = join(SRC, shard.name)
    for (const f of readdirSync(shardDir)) {
        if (!f.toLowerCase().endsWith('.gif')) continue
        idToFile.set(f.slice(0, f.lastIndexOf('.')), join(shardDir, f))
    }
}

const inAnim = new Set(anim.items)
const candidates = []
index.items.forEach(([id], idx) => {
    const src = idToFile.get(id)
    if (src) candidates.push({ idx, id, src })
})
const probeList =
    args.samples > 0
        ? candidates.filter((_, i) => i % Math.max(1, Math.floor(candidates.length / args.samples)) === 0)
        : candidates

/** 源文件帧数。必须用 -count_frames 真解码：GIF 的 nb_frames / avg_frame_rate 是 ffprobe 猜的，
 *  实测有报 32 帧 10fps、而按帧延迟算出来是 32 帧 4.9s 的。 */
async function sourceFrames(file) {
    try {
        const { stdout } = await run('ffprobe', [
            '-v', 'error', '-select_streams', 'v:0', '-count_frames',
            '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', file,
        ])
        const n = Number(stdout.trim())
        return Number.isFinite(n) && n > 0 ? n : 0
    } catch {
        return 0 // 解不开的源（损坏、或扩展名骗人的 WebP）不下结论
    }
}

/**
 * 源素材按**生成时的同一套参数**（fps + 时长上限）抽帧后，还剩几种画面。
 *
 * 判「漏生成」之前必须先过这一关：源文件是 2 帧不代表这个动图在我们的帧率、时长下看得出动效。
 * 实测几个都不是漏做——
 *   - 一帧 190ms、一帧 20ms 的 GIF，10fps 抽样只会落在第一帧上；
 *   - 两帧各 10ms 的 GIF 整段只有 20ms，比一个帧间隔还短，fps 滤镜**一帧都吐不出来**（返回 null）；
 *   - 首帧帧时长被写成 **10 秒**的 GIF，动效在 t=10s 才出现，落在 `-t 2` 的窗口之外。
 * 生成脚本把这类归为「输出逐帧相同」跳过是对的，所以这里独立复算一遍，只有抽帧后确实还剩多种
 * 画面的才算真漏。
 *
 * 两个坑：
 *   - **必须带上 `-t maxSeconds`**，否则会把窗口外的动效算进来（就是上面那个首帧 10 秒的 GIF）；
 *   - 别用「总字节 ÷ 源帧数」去切帧：rawvideo 输出默认是 CFR 的，ffmpeg 会按时间戳把帧复制补齐
 *     （实测 2 帧的 GIF 被补成 21 帧），切出来的「帧」根本不是源素材的帧。`-fps_mode passthrough`
 *     才是一帧一帧照原样输出，配合 `scale=128:128` 让每帧字节数固定，切帧就不必猜尺寸。
 */
async function distinctAtFps(file, fps, maxSeconds) {
    const SIZE = 128 * 128 * 4
    try {
        const { stdout } = await run(
            'ffmpeg',
            [
                '-v', 'error', '-i', file,
                '-vf', `fps=${fps},scale=128:128,format=rgba`,
                '-t', String(maxSeconds),
                '-fps_mode', 'passthrough',
                '-frames:v', '120', '-f', 'rawvideo', '-',
            ],
            { maxBuffer: 1 << 26, encoding: 'buffer' }
        )
        const n = Math.floor(stdout.length / SIZE)
        if (n <= 0) return null
        const seen = new Set()
        for (let i = 0; i < n; i++) {
            seen.add(stdout.subarray(i * SIZE, (i + 1) * SIZE).toString('base64'))
        }
        return seen.size
    } catch {
        return null
    }
}

let next = 0
let singleFrame = 0
let missing = 0
let extra = 0
let dead = 0
let staticAtFps = 0
let staticTooShort = 0
await Promise.all(
    Array.from({ length: args.concurrency }, async () => {
        while (next < probeList.length) {
            const c = probeList[next++]
            const frames = await sourceFrames(c.src)
            if (frames === 0) {
                dead++ // 源素材本身解不开，生成脚本也拿不到动图，不算漏
            } else if (frames === 1) {
                singleFrame++
                if (inAnim.has(c.idx)) {
                    extra++
                    console.warn(`△ 单帧源却生成了动图：idx ${c.idx}（${index.items[c.idx][1]}）`)
                }
            } else if (!inAnim.has(c.idx)) {
                const distinct = await distinctAtFps(c.src, anim.fps, anim.maxSeconds)
                if (distinct === null) {
                    // fps 滤镜一帧都吐不出来：源素材整段比一个帧间隔还短，本来就没有动效可放
                    staticTooShort++
                } else if (distinct <= 1) {
                    // 源是多帧，但在我们的帧率、时长窗口内只剩一种画面：静图，生成脚本有意跳过
                    staticAtFps++
                } else {
                    missing++
                    console.warn(
                        `△ 该有动图却没有：idx ${c.idx}（${index.items[c.idx][1]}）源 ${frames} 帧，` +
                            `抽帧后还有 ${distinct} 种画面——这是真的漏了`
                    )
                }
            }
        }
    })
)
console.log(
    `完整性校验：抽查源文件 ${probeList.length} 个（候选共 ${candidates.length}）——` +
        `单帧源 ${singleFrame}，抽帧后只剩一种画面的多帧源 ${staticAtFps}，` +
        `短过一个帧间隔的 ${staticTooShort}（这几类按静图跳过，页面用静态格子），` +
        `真漏生成 ${missing}，单帧却生成了 ${extra}，源解不开 ${dead}`
)

// 反向：anim.json 里的每个 idx，源文件必须存在（否则生成时就配错了行）
let orphan = 0
for (const idx of anim.items) {
    if (!idToFile.has(index.items[idx][0])) {
        orphan++
        if (orphan <= 5) console.error(`✗ idx ${idx} 的源素材不是 .gif：${index.items[idx][0]}`)
    }
}
if (orphan) console.error(`✗ ${orphan} 个动图对不上 GIF 源素材（很可能是索引与源目录不是同一份）`)

// ── 3. 抽样对照：透明性 + 画幅 ──────────────────────────────────────────
/** 源素材里最不透明的那个像素值；255 = 整张图没有透明像素 */
async function sourceAlphaMax(file) {
    try {
        const { stdout } = await run(
            'ffmpeg',
            ['-v', 'error', '-i', file, '-vf', 'format=rgba,alphaextract,format=gray', '-frames:v', '60', '-f', 'rawvideo', '-'],
            { maxBuffer: 1 << 28, encoding: 'buffer' }
        )
        if (stdout.length === 0) return 255
        let min = 255
        for (const v of stdout) if (v < min) min = v
        return min
    } catch {
        return 255 // 无 alpha 平面的源会直接报错，按「不透明」处理
    }
}

/**
 * 源素材那一帧的画幅比（宽/高）。
 *
 * 注意**不能**拿图集格子来比：格子是「整帧等比缩到 128 以内再 pad 成方形」，
 * 而格子里能量的只是内容像素的包围盒，内容通常比整帧小一圈。拿动图的整帧画幅
 * 去比格子的内容包围盒，等于比两个不同的东西，会报出一堆假失败（实测 12 个里 6 个）。
 */
async function sourceAspect(file) {
    try {
        const { stdout } = await run('ffprobe', [
            '-v', 'error', '-select_streams', 'v:0',
            '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file,
        ])
        const [w, h] = stdout.trim().split(',').map(Number)
        return w > 0 && h > 0 ? w / h : null
    } catch {
        return null
    }
}

const pickStep = Math.max(1, Math.floor(anim.items.length / Math.max(1, args.samples || 24)))
const picks = anim.items.filter((_, i) => i % pickStep === 0).slice(0, args.samples || 24)

let opaqueSource = 0
let alphaMissing = 0
let aspectBad = 0
let aspectChecked = 0
let noSource = 0
const aspectLimit = args.aspectSamples > 0 ? args.aspectSamples : picks.length

for (const [k, idx] of picks.entries()) {
    const src = idToFile.get(index.items[idx][0])
    if (!src) {
        noSource++
        continue
    }
    const info = readAnim(animPath(idx))
    const alpha = await sourceAlphaMax(src)
    if (alpha === 255) {
        opaqueSource++ // 源本身就不透明，动图不带 alpha 是对的
    } else if (info.alphaChunks === 0) {
        alphaMissing++
        console.error(`✗ idx ${idx}：源素材有透明像素（alpha 最低 ${alpha}），动图却没有任何 ALPH 分块`)
    }

    if (k < aspectLimit) {
        const srcAspect = await sourceAspect(src)
        if (srcAspect) {
            aspectChecked++
            const animAspect = info.width / info.height
            const dev = Math.abs(animAspect - srcAspect) / srcAspect
            if (dev > args.aspectTolerance) {
                aspectBad++
                console.error(
                    `✗ idx ${idx}：动图 ${info.width}x${info.height}（${animAspect.toFixed(3)}）` +
                        `与源素材（${srcAspect.toFixed(3)}）画幅不符，偏差 ${(dev * 100).toFixed(1)}%` +
                        `——很可能这个动图不是这个贴纸的`
                )
            }
        }
    }
    process.stdout.write(`\r抽样对照 ${k + 1}/${picks.length}   `)
}
process.stdout.write('\r')

console.log(
    `抽样对照：${picks.length} 个 —— 源本身不透明 ${opaqueSource}，动图丢透明 ${alphaMissing}，` +
        `画幅比对 ${aspectChecked} 个不符 ${aspectBad}` +
        (noSource ? `，缺源素材 ${noSource}` : '')
)

// 只有「结构性损坏」「透明底丢了」「动图配错了贴纸」才算失败：
// 完整性那一层依赖源文件解出来的帧数，GIF 上本就不完全可靠，所以逐帧再比一次才下结论。
if (bad || orphan || alphaMissing || aspectBad || missing || extra) {
    console.error('\n校验未通过。注意：若源素材目录不是生成时那一份，抽样会大量误报。')
    process.exit(1)
}
console.log(`\n校验通过：动图与索引一一对应，透明底与画幅都与源素材一致。`)
