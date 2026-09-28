<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

import './index.less'

/** 索引格式见 scripts/gen-sticker-assets.mjs */
type StickerItem = [string, string]
interface IndexPayload {
  tile: number
  cols: number
  atlasPerFile: number
  total: number
  items: StickerItem[]
}
/** 动图索引格式见 scripts/gen-sticker-anim.mjs */
interface AnimPayload {
  size: number
  fps: number
  maxSeconds: number
  /** 每个子目录放多少个动图，两万多个文件平铺一个目录太难受 */
  shard: number
  total: number
  items: number[]
}
/** 带上原数组下标，图集位置必须按「原始序号」算，不能用筛选后的下标 */
interface Row {
  id: string
  title: string
  idx: number
  /** 预拼的小写检索串，避免每次输入都对 7.9 万条重算 */
  key: string
}

// 状态
const rows = ref<Row[]>([])
const tile = ref(160)
const cols = ref(10)
const atlasPerFile = ref(100)
const loading = ref(true)
const loadError = ref('')
const searchTerm = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(40)
const previewIndex = ref<number | null>(null)
const copiedId = ref<string | null>(null)
const jumpTo = ref('')
const toast = ref('')
/** 有动图的贴纸下标（原始 idx）。ref(Set) 会被 Vue 深转成响应式集合，has/delete 都能触发更新 */
const animSet = ref(new Set<number>())
const animShard = ref(1000)
/** 系统偏好减少动态效果时不自动播放，动图只在点开预览时才动 */
const reduceMotion = ref(false)

const ITEMS_PER_PAGE_OPTIONS = [20, 40, 60, 100]

// ── 缩略图尺寸（图集按格子裁切，必须用整数像素才能对准）──────────────────
const thumbSize = ref(160)
function syncThumbSize() {
  const w = typeof window === 'undefined' ? 1280 : window.innerWidth
  thumbSize.value = w >= 960 ? tile.value : w >= 576 ? 128 : 104
}

// ── 数据加载 ────────────────────────────────────────────────────────────
onMounted(async () => {
  reduceMotion.value =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  // 动图索引只影响「卡片能不能动」，取不到就整页退回静态图集，不影响浏览
  fetch('/tiezhi/anim.json')
    .then((res) => (res.ok ? res.json() : null))
    .then((data: AnimPayload | null) => {
      if (!data?.items?.length) return
      animShard.value = data.shard || 1000
      animSet.value = new Set(data.items)
    })
    .catch(() => {})
  try {
    const res = await fetch('/tiezhi/index.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: IndexPayload = await res.json()
    tile.value = data.tile
    cols.value = data.cols
    atlasPerFile.value = data.atlasPerFile
    rows.value = (data.items ?? []).map((it, idx) => {
      const id = it[0]
      const title = it[1] ?? ''
      return { id, title, idx, key: `${title}\u0000${id}`.toLowerCase() }
    })
    syncThumbSize()
    window.addEventListener('resize', syncThumbSize)
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', syncThumbSize)
  window.removeEventListener('keydown', onKeydown)
})

// ── 图集定位 ────────────────────────────────────────────────────────────
// 第 idx 个贴纸：图集 = floor(idx / atlasPerFile)，格 = idx % atlasPerFile
// 格内：列 = 格 % cols，行 = floor(格 / cols)
// 显示时把整张图集缩放到 cols*size，再平移让目标格对齐，因此格子边长恒为 size
const atlasCount = computed(() => Math.ceil(rows.value.length / atlasPerFile.value))
const atlasPad = computed(() =>
  Math.max(3, String(Math.max(atlasCount.value - 1, 0)).length)
)

function atlasUrl(idx: number) {
  const n = Math.floor(idx / atlasPerFile.value)
  return `/tiezhi/atlas/${String(n).padStart(atlasPad.value, '0')}.webp`
}

/** 贴纸方框的尺寸，静态格子与动图共用同一套尺寸，两种卡片才能对齐 */
function boxStyle(size: number) {
  return { width: `${size}px`, height: `${size}px` }
}

function cellStyle(idx: number, size: number) {
  const slot = idx % atlasPerFile.value
  const col = slot % cols.value
  const row = Math.floor(slot / cols.value)
  return {
    ...boxStyle(size),
    backgroundImage: `url(${atlasUrl(idx)})`,
    backgroundSize: `${cols.value * size}px ${cols.value * size}px`,
    backgroundPosition: `-${col * size}px -${row * size}px`,
  }
}

// ── 动图 ────────────────────────────────────────────────────────────────
function hasAnim(idx: number) {
  return animSet.value.has(idx)
}

/** 网格里是否播放动图：动图文件按需加载，滚到哪儿才拉哪几张 */
function playInGrid(idx: number) {
  return hasAnim(idx) && !reduceMotion.value
}

function animUrl(idx: number) {
  return `/tiezhi/anim/${Math.floor(idx / animShard.value)}/${idx}.webp`
}

/**
 * 动图缺失或解码失败时退回静态格子：索引里有、文件却没有的情况（部署漏传、
 * 中途中断）不能让用户看到一张破图，直接从可播集合里摘掉即可。
 */
function onAnimError(idx: number) {
  animSet.value.delete(idx)
}

// ── 搜索 / 分页 ─────────────────────────────────────────────────────────
const filtered = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return rows.value
  // 标题和 ID 都能搜——按 ID 精确查是这一页最常见的用法
  return rows.value.filter((r) => r.key.includes(term))
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / itemsPerPage.value))
)

const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filtered.value.slice(start, start + itemsPerPage.value)
})

watch([searchTerm, itemsPerPage], () => {
  currentPage.value = 1
})

watch(totalPages, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
})

const pageNumbers = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  const end = Math.min(totalPages.value, start + maxVisible - 1)
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function handlePageChange(page: number) {
  currentPage.value = Math.min(Math.max(1, Math.floor(page)), totalPages.value)
}

function handleJump() {
  const n = Number(jumpTo.value)
  if (Number.isFinite(n) && n > 0) {
    handlePageChange(n)
    jumpTo.value = ''
    nextTick(() => document.querySelector('.tiezhi-grid')?.scrollTo({ top: 0 }))
  }
}

// ── 复制 ────────────────────────────────────────────────────────────────
function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => {
    if (toast.value === msg) toast.value = ''
  }, 1800)
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 走到下面的兜底方案 */
  }
  // 非 HTTPS / 旧浏览器的兜底
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

async function handleCopy(id: string, title: string) {
  const ok = await copyText(id)
  if (!ok) {
    showToast('复制失败，请手动选择 ID 复制')
    return
  }
  copiedId.value = id
  showToast(`已复制「${title || id}」的 ID`)
  setTimeout(() => {
    if (copiedId.value === id) copiedId.value = null
  }, 1600)
}

// ── 预览 ────────────────────────────────────────────────────────────────
const previewRow = computed(() =>
  previewIndex.value === null ? null : filtered.value[previewIndex.value] ?? null
)

function openPreview(indexInPage: number) {
  previewIndex.value = (currentPage.value - 1) * itemsPerPage.value + indexInPage
  window.addEventListener('keydown', onKeydown)
}

function closePreview() {
  previewIndex.value = null
  window.removeEventListener('keydown', onKeydown)
}

function stepPreview(delta: number) {
  if (previewIndex.value === null) return
  const next = previewIndex.value + delta
  if (next >= 0 && next < filtered.value.length) previewIndex.value = next
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closePreview()
  else if (e.key === 'ArrowLeft') stepPreview(-1)
  else if (e.key === 'ArrowRight') stepPreview(1)
}
</script>

<template>
  <div class="tiezhi-viewer">
    <!-- 头部 -->
    <header class="tiezhi-header">
      <h1>贴纸数据查看器</h1>
      <p>浏览、搜索全部贴纸素材，一键复制贴纸 ID</p>
      <p class="tiezhi-note">动图贴纸可查看动效，实际效果以剪映内为准。</p>
    </header>

    <!-- 工具条 -->
    <div class="tiezhi-toolbar">
      <div class="tiezhi-search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchTerm"
          type="search"
          placeholder="搜索贴纸标题或 ID..."
          class="search-input"
        />
        <button v-if="searchTerm" class="search-clear" @click="searchTerm = ''">×</button>
      </div>
      <div class="tiezhi-meta">
        <template v-if="!loading && !loadError">
          共 <strong>{{ filtered.length.toLocaleString() }}</strong> 个贴纸
          <span v-if="searchTerm">（已筛选）</span>
        </template>
        <div class="tiezhi-page-size">
          <span>每页</span>
          <select v-model="itemsPerPage" class="page-select">
            <option v-for="n in ITEMS_PER_PAGE_OPTIONS" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 内容 -->
    <div class="tiezhi-content">
      <div v-if="loading" class="tiezhi-state">正在加载贴纸索引…</div>
      <div v-else-if="loadError" class="tiezhi-state error">
        加载失败：{{ loadError }}<br />请确认 <code>/tiezhi/index.json</code> 与
        <code>/tiezhi/atlas/</code> 已生成。
      </div>
      <div v-else-if="filtered.length === 0" class="tiezhi-state">没有找到匹配的贴纸</div>

      <div v-else class="tiezhi-grid">
        <div v-for="(row, i) in currentPageData" :key="row.id" class="tiezhi-card">
          <div
            class="tiezhi-thumb"
            :style="
              playInGrid(row.idx) ? boxStyle(thumbSize) : cellStyle(row.idx, thumbSize)
            "
            role="img"
            :aria-label="row.title"
            @click="openPreview(i)"
          >
            <!-- 有动图就播动图，没有才用图集里的静态格子 -->
            <img
              v-if="playInGrid(row.idx)"
              class="tiezhi-thumb-anim"
              :src="animUrl(row.idx)"
              :alt="row.title"
              loading="lazy"
              decoding="async"
              @error="onAnimError(row.idx)"
            />
            <span class="tiezhi-thumb-idx">{{ row.idx + 1 }}</span>
            <span v-if="hasAnim(row.idx)" class="tiezhi-thumb-tag">动图</span>
          </div>
          <div class="tiezhi-card-body">
            <div class="tiezhi-card-title" :title="row.title">
              {{ row.title || '（无标题）' }}
            </div>
            <div class="tiezhi-card-id" :title="row.id">{{ row.id }}</div>
          </div>
          <button
            :class="['tiezhi-copy-btn', { copied: copiedId === row.id }]"
            title="复制贴纸 ID"
            @click="handleCopy(row.id, row.title)"
          >
            {{ copiedId === row.id ? '✓ 已复制' : '📋 复制ID' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="!loading && !loadError && filtered.length > 0" class="tiezhi-pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="handlePageChange(1)">
        首页
      </button>
      <button
        class="page-btn"
        :disabled="currentPage === 1"
        @click="handlePageChange(currentPage - 1)"
      >
        上一页
      </button>

      <button
        v-for="page in pageNumbers"
        :key="page"
        :class="['page-number-btn', { active: page === currentPage }]"
        @click="handlePageChange(page)"
      >
        {{ page }}
      </button>

      <button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="handlePageChange(currentPage + 1)"
      >
        下一页
      </button>
      <button
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="handlePageChange(totalPages)"
      >
        末页
      </button>

      <span class="tiezhi-page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>

      <div class="tiezhi-jump">
        <span>跳至</span>
        <input
          v-model="jumpTo"
          class="jump-input"
          inputmode="numeric"
          placeholder="页码"
          @keyup.enter="handleJump"
        />
        <button class="page-btn" @click="handleJump">Go</button>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <div v-if="previewRow" class="tiezhi-modal" @click="closePreview">
      <button class="modal-close" @click="closePreview" aria-label="关闭">×</button>
      <button
        class="modal-nav prev"
        :disabled="previewIndex === 0"
        @click.stop="stepPreview(-1)"
        aria-label="上一个"
      >
        ‹
      </button>

      <div class="modal-content" @click.stop>
        <div class="modal-stage">
          <!-- 放大约 2 倍是为了看清细节；格子本身是 tile 像素，放大不会增加信息量 -->
          <img
            v-if="hasAnim(previewRow.idx)"
            class="modal-anim"
            :style="boxStyle(tile * 2)"
            :src="animUrl(previewRow.idx)"
            :alt="previewRow.title"
            @error="onAnimError(previewRow.idx)"
          />
          <div v-else class="modal-image" :style="cellStyle(previewRow.idx, tile * 2)" />
        </div>
        <div class="modal-info">
          <div class="modal-title">{{ previewRow.title || '（无标题）' }}</div>
          <div class="modal-id" @click="handleCopy(previewRow.id, previewRow.title)">
            <span class="modal-id-label">ID</span>
            <code>{{ previewRow.id }}</code>
          </div>
          <div class="modal-actions">
            <button
              :class="['tiezhi-copy-btn', { copied: copiedId === previewRow.id }]"
              @click="handleCopy(previewRow.id, previewRow.title)"
            >
              {{ copiedId === previewRow.id ? '✓ 已复制' : '📋 复制贴纸 ID' }}
            </button>
            <span class="modal-counter">
              {{ previewIndex + 1 }} / {{ filtered.length.toLocaleString() }}
            </span>
          </div>
          <div class="modal-hint">← → 切换，Esc 关闭</div>
        </div>
      </div>

      <button
        class="modal-nav next"
        :disabled="previewIndex >= filtered.length - 1"
        @click.stop="stepPreview(1)"
        aria-label="下一个"
      >
        ›
      </button>
    </div>

    <!-- 轻提示 -->
    <Transition name="tiezhi-toast">
      <div v-if="toast" class="tiezhi-toast">{{ toast }}</div>
    </Transition>
  </div>
</template>
