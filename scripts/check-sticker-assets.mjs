/**
 * 校验 scripts/gen-sticker-assets.mjs 的产物：图集里的每一格，是不是真的对应索引里的那个贴纸。
 *
 * 为什么需要单独校验：图集方案最大的风险不是"图片不清楚"，而是**静默错位**——
 * 图集生成失败时可能照样输出一张看起来正常的图，页面就会把 A 的标题配 B 的图。
 * 之前用 `-vf tile` 就踩过这个坑（第 0 格出现的是第 12 个贴纸），而且 ffmpeg 不报错。
 *
 * 三层校验：
 *   1. 结构：每张图集尺寸必须是 cols*tile，体积不得低于下限
 *   2. 空白格：图集里全透明、但源素材其实有内容的格子（预览是白板，属于真缺陷）
 *   3. 抽样比对：按**页面用的同一套公式**从图集裁出格子，与源素材渲染的参考图比 PSNR，
 *      同时把"相邻格"当干扰项一起比。只有「本格明显比相邻格更像参考图」才算通过。
 *
 * 比对时必须**先合成到灰底**再算 PSNR。带 alpha 的图直接比是没意义的：
 * 全透明区域的 RGB 是任意值，一张图和它的正确副本会因为透明区的差异得到个位数 dB，
 * 从而报出一堆假失败（白色线条图在白底上也看不见，所以用中灰）。
 *
 * 用法：
 *   node scripts/check-sticker-assets.mjs \
 *     --src "E:/workspace/WorkBuddy/jianying-crawler/output/贴纸文件" \
 *     --out docs/public/tiezhi \
 *     --samples 24
 *
 * 需要本机装有 ffmpeg / ffprobe，并且能访问源素材目录。
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
        samples: Number(get('samples', 24)),
        // 通过线：本格 PSNR 要比相邻格高出这么多 dB
        margin: Number(get('margin', 3)),
        // 必须与生成脚本一致：动图首帧空白时，最多往后看多少帧
        frames: Number(get('frames', 60)),
    }
}

const args = parseArgs()
if (!args.src) {
    console.error('缺少参数：--src <贴纸文件目录>（需要源素材才能比对）')
    process.exit(1)
}

const SRC = resolve(args.src)
const OUT = resolve(args.out)
const INDEX = join(OUT, 'index.json')
const ATLAS_DIR = join(OUT, 'atlas')

for (const p of [SRC, INDEX]) {
    if (!existsSync(p)) {
        console.error(`路径不存在：${p}`)
        process.exit(1)
    }
}

const { tile: TILE, cols: COLS, atlasPerFile: PER_ATLAS, items } = JSON.parse(
    readFileSync(INDEX, 'utf8')
)
const total = items.length
const ATLAS_SIZE = COLS * TILE
const atlasCount = Math.ceil(total / PER_ATLAS)
// 与生成脚本、页面三处必须一致
const PAD = Math.max(3, String(Math.max(atlasCount - 1, 0)).length)
const atlasName = (a) => `${String(a).padStart(PAD, '0')}.webp`
// 必须与生成脚本的 TILE_FILTER 一致：format=rgba 放在 pad 前，保证补边透明
const tileFilter = `scale=${TILE}:${TILE}:force_original_aspect_ratio=decrease,` +
    `format=rgba,` +
    `pad=${TILE}:${TILE}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`

console.log(`索引 ${total} 条；图集 ${atlasCount} 张，每张 ${PER_ATLAS} 格，单格 ${TILE}px`)

const tmp = mkdtempSync(join(tmpdir(), 'tiezhi-check-'))
const cleanup = (dir) => {
    try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 })
    } catch {
        /* 清理失败不影响结论 */
    }
}

const idToFile = new Map()
for (const shard of readdirSync(SRC, { withFileTypes: true })) {
    if (!shard.isDirectory()) continue
    const shardDir = join(SRC, shard.name)
    for (const f of readdirSync(shardDir)) {
        const dot = f.lastIndexOf('.')
        if (dot > 0) idToFile.set(f.slice(0, dot), join(shardDir, f))
    }
}

// ── 工具：alpha / 取帧 / 渲染（与生成脚本同一套规则）────────────────────
async function alphaMax(file) {
    try {
        const { stdout } = await run(
            'ffmpeg',
            [
                '-loglevel', 'error', '-y', '-i', file,
                // 先 format=rgba：不透明图没有 alpha 平面，直接 alphaextract 会一个包都产不出来
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
 * 参考图：与生成脚本 makeTile 完全一致的规则。
 * 首帧是全透明的动图要退回到"内容最饱满的那帧"，否则拿空白首帧去比对必然误报。
 */
async function renderRef(srcFile, out) {
    const render = (input) =>
        run('ffmpeg', [
            '-loglevel', 'error', '-y', '-i', input,
            '-vf', tileFilter, '-frames:v', '1', out,
        ])

    await render(srcFile)
    if (args.frames <= 1 || (await alphaMax(out)) > 0) return true

    const dir = mkdtempSync(join(tmp, 'frames-'))
    try {
        await run('ffmpeg', [
            '-loglevel', 'error', '-y', '-i', srcFile,
            '-frames:v', String(args.frames), join(dir, '%03d.png'),
        ])
        const files = readdirSync(dir).sort()
        if (files.length <= 1) return true

        const SIDE = 32
        const { stdout } = await run(
            'ffmpeg',
            [
                '-loglevel', 'error', '-y', '-i', join(dir, '%03d.png'),
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
            if (score >= bestScore && score > 0) {
                bestScore = score
                best = k
            }
        }
        if (best >= 0) await render(join(dir, files[best]))
        return best >= 0 || (await alphaMax(out)) > 0
    } finally {
        cleanup(dir)
    }
}

/** 把带 alpha 的图合成到中灰底上，再拿去比 PSNR 才有意义 */
async function flatten(file, out) {
    await run('ffmpeg', [
        '-loglevel', 'error', '-y',
        '-f', 'lavfi', '-i', `color=c=0x808080:s=${TILE}x${TILE}`,
        '-i', file,
        '-filter_complex', '[1]format=rgba[c];[0][c]overlay=format=auto,format=rgb24',
        '-frames:v', '1', out,
    ])
}

async function psnr(f1, f2) {
    // psnr 的汇总走 stderr
    const res = await run('ffmpeg', [
        '-hide_banner', '-i', f1, '-i', f2, '-lavfi', 'psnr', '-f', 'null', '-',
    ]).catch((e) => ({ stderr: e.stderr ?? '' }))
    const m = /average:([0-9.]+|inf)/.exec(res.stderr ?? '')
    if (!m) return NaN
    return m[1] === 'inf' ? 999 : Number(m[1])
}

/** 页面公式：返回该下标所在的图集与格内坐标 */
function locate(i) {
    const a = Math.floor(i / PER_ATLAS)
    const slot = i % PER_ATLAS
    return {
        file: join(ATLAS_DIR, atlasName(a)),
        col: slot % COLS,
        row: Math.floor(slot / COLS),
    }
}

// ── 1. 全量结构校验：尺寸 + 体积下限 ────────────────────────────────────
let bad = 0
for (let a = 0; a < atlasCount; a++) {
    const f = join(ATLAS_DIR, atlasName(a))
    if (!existsSync(f)) {
        console.error(`✗ 图集缺失：${f}`)
        bad++
        continue
    }
    const { stdout } = await run('ffprobe', [
        '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,pix_fmt',
        '-of', 'csv=p=0', f,
    ])
    const [wStr, hStr, pixFmt] = stdout.trim().split(',').map((x) => x.trim())
    const w = Number(wStr)
    const h = Number(hStr)
    if (w !== ATLAS_SIZE || h !== ATLAS_SIZE) {
        console.error(`✗ 尺寸异常：${f} 期望 ${ATLAS_SIZE}x${ATLAS_SIZE}，实际 ${w}x${h}`)
        bad++
        continue
    }
    // 没有 alpha 的图集，透明区域会被编码成实心黑 —— 页面上就是一格格黑方块
    if (pixFmt !== 'yuva420p') {
        console.error(`✗ 缺少 alpha 通道：${f} pix_fmt=${pixFmt}，透明区域会变黑`)
        bad++
        continue
    }
    // 下限取得很保守：只要能排除"几乎全空"的图集即可
    const floor = 40 * PER_ATLAS
    const { size } = statSync(f)
    if (size < floor) {
        console.error(`✗ 体积异常：${f} 仅 ${size} B（下限 ${floor} B），疑似拼图失败`)
        bad++
    }
}
console.log(bad ? `结构校验：${bad} 张异常` : '结构校验：全部通过')

// ── 2. 空白格审计：图集里全透明、但源素材其实有内容的格子 ────────────────
// 每张图集只解码一次 rawvideo，在 JS 里扫 alpha，比逐格调用 ffmpeg 快两个数量级。
const blankCells = []
for (let a = 0; a < atlasCount; a++) {
    const f = join(ATLAS_DIR, atlasName(a))
    if (!existsSync(f)) continue
    const { stdout } = await run(
        'ffmpeg',
        ['-loglevel', 'error', '-y', '-i', f, '-vf', 'format=rgba', '-frames:v', '1',
            '-f', 'rawvideo', '-'],
        { encoding: 'buffer', maxBuffer: 1 << 26 }
    )
    if (stdout.length !== ATLAS_SIZE * ATLAS_SIZE * 4) continue
    for (let slot = 0; slot < PER_ATLAS; slot++) {
        const i = a * PER_ATLAS + slot
        if (i >= total) break
        const col = slot % COLS
        const row = Math.floor(slot / COLS)
        let maxA = 0
        for (let y = 0; y < TILE && maxA === 0; y++) {
            let off = ((row * TILE + y) * ATLAS_SIZE + col * TILE) * 4 + 3
            for (let x = 0; x < TILE; x++, off += 4) {
                if (stdout[off] > maxA) maxA = stdout[off]
            }
        }
        if (maxA === 0) blankCells.push(i)
    }
    if (a % 100 === 0) process.stdout.write(`\r空白格审计 ${a}/${atlasCount}…`)
}
process.stdout.write(`\r空白格审计完成，共 ${blankCells.length} 个全透明格        \n`)

let blankOk = 0
let blankSourceDead = 0
let blankReal = 0
for (const i of blankCells) {
    const srcFile = idToFile.get(items[i][0])
    const ref = join(tmp, `blank-${i}.png`)
    if (!srcFile) {
        blankSourceDead++
        continue
    }
    let ok = false
    try {
        ok = await renderRef(srcFile, ref)
    } catch {
        blankSourceDead++
        continue
    }
    if (ok && (await alphaMax(ref)) > 0) {
        blankReal++
        if (blankReal <= 10) {
            console.error(`✗ 空白预览：idx ${i}（${items[i][1]}）源素材有内容，图集里却是空的`)
        }
    } else {
        blankSourceDead++
    }
}
console.log(
    `空白格审计：${blankCells.length} 个全透明格 —— 源素材本身无内容/无法解码 ${blankSourceDead}，` +
        `真缺陷 ${blankReal}`
)

// ── 3. 抽样比对：图集格子 vs 源素材 ─────────────────────────────────────
// 抽样下标：均匀分布 + 必须覆盖图集边界（每张图集的首格/末格最容易出错）
const picks = new Set()
picks.add(0)
picks.add(total - 1)
for (let a = 0; a < atlasCount; a += Math.max(1, Math.floor(atlasCount / 8))) {
    picks.add(a * PER_ATLAS)                     // 每张图集第一格
    if (a * PER_ATLAS + PER_ATLAS - 1 < total) picks.add(a * PER_ATLAS + PER_ATLAS - 1) // 最后一格
}
const step = Math.max(1, Math.floor(total / args.samples))
for (let i = 0; i < total; i += step) picks.add(i)

const list = [...picks].filter((i) => i >= 0 && i < total).sort((a, b) => a - b)
let pass = 0
let weak = 0
let fail = 0
let noSource = 0

for (const i of list) {
    const srcFile = idToFile.get(items[i][0])
    if (!srcFile) {
        noSource++
        continue
    }
    const refRaw = join(tmp, `ref-${i}.png`)
    try {
        await renderRef(srcFile, refRaw)
    } catch {
        noSource++
        continue
    }
    const ref = join(tmp, `refg-${i}.png`)
    await flatten(refRaw, ref)

    const me = locate(i)
    const mineRaw = join(tmp, `me-${i}.png`)
    await run('ffmpeg', [
        '-loglevel', 'error', '-y', '-i', me.file,
        '-vf', `crop=${TILE}:${TILE}:${me.col * TILE}:${me.row * TILE}`,
        '-frames:v', '1', mineRaw,
    ])
    const mineFlat = join(tmp, `meg-${i}.png`)
    await flatten(mineRaw, mineFlat)
    const mine = await psnr(ref, mineFlat)

    // 干扰项：相邻下标所在的格
    const nb = locate(i + 1 < total ? i + 1 : i - 1)
    const nbRaw = join(tmp, `nb-${i}.png`)
    await run('ffmpeg', [
        '-loglevel', 'error', '-y', '-i', nb.file,
        '-vf', `crop=${TILE}:${TILE}:${nb.col * TILE}:${nb.row * TILE}`,
        '-frames:v', '1', nbRaw,
    ])
    const nbFlat = join(tmp, `nbg-${i}.png`)
    await flatten(nbRaw, nbFlat)
    const other = await psnr(ref, nbFlat)

    if (mine > other + args.margin) {
        pass++
    } else if (mine > other) {
        weak++
        console.warn(`△ idx ${i}：本格 ${mine.toFixed(2)}dB，相邻格 ${other.toFixed(2)}dB（差距偏小）`)
    } else {
        fail++
        console.error(
            `✗ idx ${i}（图集 ${atlasName(Math.floor(i / PER_ATLAS))} 格 ${me.row},${me.col}）：` +
                `本格 ${mine.toFixed(2)}dB 反而不如相邻格 ${other.toFixed(2)}dB`
        )
    }
}

cleanup(tmp)

console.log(
    `\n比对 ${pass + weak + fail} 个抽样下标：通过 ${pass}，差距偏小 ${weak}，错位 ${fail}` +
        (noSource ? `，缺源素材 ${noSource}` : '')
)
if (bad || fail || blankReal) {
    console.error('\n校验未通过。注意：若源素材目录不是生成时那一份，抽样会大量误报。')
    process.exit(1)
}
console.log('校验通过：图集格子与索引一一对应。')
