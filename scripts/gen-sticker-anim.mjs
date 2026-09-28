/**
 * 把动图贴纸（源文件是 .gif 的）转成站点内置的动态 WebP，供贴纸数据页播放动效。
 *
 * 为什么不直接用原始 GIF：本次收录的 23,513 个 GIF 合计约 18GB（中位 121KB，最大 58MB），
 * 直接拷进仓库不现实。转成动态 WebP（等比缩到 --size、限帧率、限时长）后约为原来的 3%，
 * 动效本身保留。
 *
 * 产物：
 *   <out>/anim/<idx/1000>/<idx>.webp   第 idx 个贴纸的动图（idx 与 index.json 的下标一致）
 *   <out>/anim.json                    { size, fps, maxSeconds, shard, total, items: [idx, ...] }
 *
 * 单帧 GIF 只是静图，页面用图集里的静态格子即可，不生成动图。
 *
 * 用法：
 *   node scripts/gen-sticker-anim.mjs \
 *     --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
 *     --out docs/public/tiezhi \
 *     --size 128 --quality 55 --fps 10 --max-seconds 2
 *
 * 可重复执行：已生成且校验通过的动图会跳过，中断后原样重跑即可续做。
 */
import { execFile } from 'node:child_process'
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
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
        size: Number(get('size', 128)),
        quality: Number(get('quality', 55)),
        fps: Number(get('fps', 10)),
        maxSeconds: Number(get('max-seconds', 2)),
        // 实测 8 就吃满了（每个 128px 的活儿太小，瓶颈在进程调度），再高没有收益
        concurrency: Number(get('concurrency', 8)),
        limit: Number(get('limit', 0)),
        // 只有源文件是这些扩展名时才当作动图候选
        exts: get('exts', '.gif').split(','),
    }
}

const args = parseArgs()
if (!args.src) {
    console.error('缺少参数：--src <贴纸文件目录>')
    process.exit(1)
}
const SRC = resolve(args.src)
const OUT = resolve(args.out)
const INDEX = join(OUT, 'index.json')
const ANIM = join(OUT, 'anim.json')
const ANIM_DIR = join(OUT, 'anim')
/** 一个子目录放 1000 个：两万多个文件平铺在一个目录里，列举和提交都很难受 */
const SHARD = 1000

for (const p of [SRC, INDEX]) {
    if (!existsSync(p)) {
        console.error(`路径不存在：${p}`)
        process.exit(1)
    }
}
mkdirSync(ANIM_DIR, { recursive: true })

/** idx → 动图路径（分片） */
const animPath = (idx) => join(ANIM_DIR, String(Math.floor(idx / SHARD)), `${idx}.webp`)

const { items } = JSON.parse(readFileSync(INDEX, 'utf8'))
const indexTotal = items.length
console.log(`索引 ${indexTotal} 条；规格 ${args.size}px / q${args.quality} / ${args.fps}fps / ≤${args.maxSeconds}s`)

// ── 1. 建立 sticker_id → 源文件（只收动图候选扩展名）────────────────────
const idToFile = new Map()
for (const shard of readdirSync(SRC, { withFileTypes: true })) {
    if (!shard.isDirectory()) continue
    const shardDir = join(SRC, shard.name)
    for (const f of readdirSync(shardDir)) {
        const dot = f.lastIndexOf('.')
        if (dot <= 0) continue
        if (!args.exts.includes(f.slice(dot).toLowerCase())) continue
        idToFile.set(f.slice(0, dot), join(shardDir, f))
    }
}
const candidates = []
items.forEach(([id], idx) => {
    const src = idToFile.get(id)
    if (src) candidates.push({ idx, id, src })
})
console.log(`动图候选（源为 ${args.exts.join('/')}）：${candidates.length} 个`)

// ── 2. 校验动图 ─────────────────────────────────────────────────────────
/**
 * 校验一张生成好的动图，返回 { frames, alpha, width, height }。
 *
 * 为什么不用 ffprobe：本机的 ffmpeg 6.1 只认静态 WebP，喂它自己刚写出来的动图，得到的是
 * `0,0,unknown` + `image data not found`（浏览器侧完全正常）。所以这里直接按 RIFF 分块读，
 * 顺带比 ffprobe 多出两项能力：能验 alpha 标志、能发现被截断的最后一个分块。
 *
 * VP8X 标志位（按 WebP 容器规范，从高位到低位）：
 *   bit5 ICC / bit4 ALPHA / bit3 EXIF / bit2 XMP / bit1 ANIMATION
 * 注意别记反：**Alpha 是 0x10，Animation 是 0x02**。
 *
 * 「源素材只有一帧」会以 notAnimated 标记抛出：那不是缺陷，只是这张静图本来就没有动效，
 * 页面用图集里的静态格子即可，所以调用方要把它和真正的失败分开计数。
 */
function verifyAnim(file) {
    const notAnimated = (msg) => {
        const e = new Error(msg)
        e.notAnimated = true
        return e
    }
    const buf = readFileSync(file)
    if (buf.length < 30) throw notAnimated(`输出为空（${buf.length} 字节）`)
    if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
        throw notAnimated('不是 WebP 文件')
    }
    let offset = 12
    let vp8x = null
    let frames = 0
    /** 逐帧画面是否完全一样，见下方 notAnimated 判断 */
    let firstPayload = null
    let sameFrames = true
    while (offset + 8 <= buf.length) {
        const id = buf.toString('ascii', offset, offset + 4)
        const len = buf.readUInt32LE(offset + 4)
        if (offset + 8 + len > buf.length) throw new Error(`分块 ${id} 越界，文件被截断`)
        if (id === 'VP8X') {
            // VP8X 载荷：1 字节标志 + 3 字节保留 + 3 字节画布宽-1 + 3 字节画布高-1
            vp8x = {
                flags: buf.readUInt8(offset + 8),
                width: buf.readUIntLE(offset + 12, 3) + 1,
                height: buf.readUIntLE(offset + 15, 3) + 1,
            }
        } else if (id === 'ANMF') {
            frames++
            // ANMF 载荷 = 16 字节帧头（含帧时长）+ 该帧的 VP8/ALPH 子分块。动图 WebP 逐帧独立
            // 编码、不做帧间预测，所以「逐帧画面一样」等价于「逐帧字节一样」。
            const payload = buf.subarray(offset + 8 + 16, offset + 8 + len)
            if (firstPayload === null) firstPayload = payload
            else if (firstPayload.length !== payload.length || firstPayload.compare(payload) !== 0) {
                sameFrames = false
            }
        }
        offset += 8 + len + (len % 2)
    }
    // 没有 VP8X 说明编码器写的是单帧 WebP：源素材只有一帧，不是动图
    if (!vp8x) throw notAnimated('单帧 WebP（源素材只有一帧）')
    if ((vp8x.flags & 0x02) === 0) throw notAnimated('没有 ANIMATION 标志（源素材只有一帧）')
    if (frames <= 1) throw notAnimated(`只有 ${frames} 帧`)
    // 源文件只有一帧、却自带一段时长的 GIF，会被 fps 滤镜按帧率补齐成若干张**一模一样的画面**，
    // 于是静图也变成了「动图」。实测这类约占 GIF 的 1%，若照单全收，页面上会出现一批挂着
    // 「动图」角标却纹丝不动的贴纸。逐帧字节比对能准确挑出它们，且不会误伤真正的动图
    // （真动图只要有一帧不同就不算全同）。
    if (sameFrames) throw notAnimated(`${frames} 帧画面完全相同（源素材是静图）`)
    if (vp8x.width > args.size || vp8x.height > args.size) {
        throw new Error(`画布超标：${vp8x.width}x${vp8x.height}`)
    }
    // alpha 有没有丢由校验脚本对照源素材判断（源本身不透明的动图不该带 alpha），
    // 这里只把结果带出去做统计
    return { frames, alpha: (vp8x.flags & 0x10) !== 0, width: vp8x.width, height: vp8x.height }
}

async function makeAnim(src, out) {
    mkdirSync(dirname(out), { recursive: true })
    await run('ffmpeg', [
        '-loglevel', 'error',
        '-y',
        '-i', src,
        // format=rgba 必须在 scale 之后：不透明源没有 alpha 平面，动图的透明底会变成黑底
        '-vf', `fps=${args.fps},scale=${args.size}:${args.size}:force_original_aspect_ratio=decrease,format=rgba`,
        '-t', String(args.maxSeconds),
        '-c:v', 'libwebp',
        '-loop', '0',
        '-quality', String(args.quality),
        // 4 而不是 6：实测同一张图 286ms vs 1340ms（慢 4.7 倍），体积只差 1.4%。
        // 两万多个文件，这个取舍不用犹豫。
        '-compression_level', '4',
        out,
    ])
}

// ── 3. 生成 ─────────────────────────────────────────────────────────────
/** 已确认可用的动图下标。用内存集合而不是每次都扫盘：索引要反复写，
 *  每次重读两万个文件校验一遍要好几十秒，而这个集合就是校验的结果本身。 */
const doneIdx = new Set()

/** 写 anim.json。跑到一半就中断时，至少已生成的这部分页面上是能用的 */
function writeIndex() {
    const items = [...doneIdx].sort((a, b) => a - b)
    writeFileSync(
        ANIM,
        JSON.stringify({
            size: args.size,
            fps: args.fps,
            maxSeconds: args.maxSeconds,
            shard: SHARD,
            total: indexTotal,
            items,
        })
    )
    return items
}

let built = 0
let staticOnes = 0
let deadSource = 0
let opaque = 0

const todo = []
let skipped = 0
for (const c of candidates) {
    const out = animPath(c.idx)
    if (existsSync(out)) {
        try {
            await verifyAnim(out)
            skipped++
            doneIdx.add(c.idx)
            continue
        } catch (e) {
            if (e.notAnimated) {
                // 上一版脚本按帧数生成时留下的「全是同一帧」的伪动图，直接删掉，别白重编一遍
                rmSync(out, { force: true })
                staticOnes++
                continue
            }
            // 断点续跑不能只看文件在不在：中断会留下截断文件
            console.warn(`\n⚠️ 已存在的动图校验不通过，将重做：${out} —— ${e.message}`)
        }
    }
    todo.push({ ...c, out })
}
if (args.limit > 0) todo.length = Math.min(todo.length, args.limit)
console.log(`待生成 ${todo.length} 个（跳过 ${skipped} 个）`)
const failures = []
let next = 0
const pool = async (size) => {
    await Promise.all(
        Array.from({ length: Math.min(size, todo.length) }, async () => {
            while (next < todo.length) {
                const t = todo[next++]
                try {
                    await makeAnim(t.src, t.out)
                    const info = await verifyAnim(t.out)
                    if (!info.alpha) opaque++
                    doneIdx.add(t.idx)
                    built++
                    // 每 500 个刷一次索引：两万个文件要跑十几分钟，中途断掉不至于一无所获
                    if (built % 500 === 0) writeIndex()
                    process.stdout.write(
                        `\r已生成动图 ${built}（跳过 ${skipped}，算不上动图 ${staticOnes}，失败 ${failures.length}）   `
                    )
                } catch (e) {
                    const wrote = existsSync(t.out) ? statSync(t.out).size : 0
                    rmSync(t.out, { force: true }) // 半成品留着会被下一轮的续跑逻辑当成成功
                    // 「源素材只有一帧」不是缺陷：这张本来就没有动效，页面继续用静态格子。
                    // 判断放在编码之后做，是因为源文件的 nb_frames / avg_frame_rate 对 GIF 并不
                    // 可靠（实测有报 32 帧、10fps 而实际时长对不上的），而输出的 ANMF 帧数是铁证。
                    if (e.notAnimated) {
                        staticOnes++
                        continue
                    }
                    // ffmpeg 一个包都没写出来 = 源素材它根本解不开，跟编码参数无关。
                    // 实测确有此例：有一个 .gif 其实是动画 WebP，本机 ffmpeg 读不了动画 WebP。
                    // 页面照样退回静态格子，所以只提示不判失败。
                    if (wrote === 0) {
                        deadSource++
                        console.warn(`\n△ idx ${t.idx} ${t.id}：源素材解不出画面，跳过（${t.src}）`)
                        continue
                    }
                    const msg = String(e.stderr || e.message || e).split('\n').filter(Boolean).pop()
                    // 失败的文件已经删掉了，事后无从查起，所以当下就报出来
                    console.error(`\n✗ idx ${t.idx} ${t.id}\n   源 ${t.src}\n   ${msg}`)
                    failures.push({ idx: t.idx, id: t.id, src: t.src, msg })
                }
            }
        })
    )
}
await pool(args.concurrency)

// ── 4. 写索引 ───────────────────────────────────────────────────────────
const animIdx = writeIndex()
let bytes = 0
for (const i of animIdx) bytes += statSync(animPath(i)).size

console.log(
    `\n完成：动图 ${animIdx.length} 个（本次新生成 ${built}，跳过 ${skipped}，` +
        `源只有一帧算不上动图 ${staticOnes}，源解不出画面 ${deadSource}，其中不透明动图 ${opaque}）`
)
console.log(`目录：${ANIM_DIR}（${(bytes / 1048576).toFixed(1)} MB）`)
console.log(`索引：${ANIM}（${(statSync(ANIM).size / 1024).toFixed(0)} KB）`)

if (failures.length) {
    console.error(`\n⚠️ ${failures.length} 个动图生成失败（页面会退回静态首帧）：`)
    for (const f of failures.slice(0, 10)) {
        console.error(`   idx ${f.idx} ${f.id} —— ${f.src}\n      ${f.msg}`)
    }
    if (failures.length > 10) console.error(`   …另有 ${failures.length - 10} 个`)
    process.exit(1)
}
