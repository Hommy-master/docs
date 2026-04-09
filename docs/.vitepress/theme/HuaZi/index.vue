<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { huaZiData, type HuaZiItem } from './data'

import './index.less'

// 状态
const allData = ref<HuaZiItem[]>([])
const loading = ref(true)
const searchTerm = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(40)
const previewImage = ref<string | null>(null)
const copiedId = ref<string | null>(null)

// 每页显示选项
const ITEMS_PER_PAGE_OPTIONS = [20, 40, 60, 100]

// 加载数据
onMounted(() => {
  // 模拟异步加载数据
  setTimeout(() => {
    allData.value = huaZiData
    loading.value = false
  }, 100)
})

// 过滤数据
const filteredData = computed(() => {
  if (!searchTerm.value.trim()) {
    return allData.value
  }
  const term = searchTerm.value.toLowerCase()
  return allData.value.filter((item) => {
    const title = item.common_attr?.title || ''
    return title.toLowerCase().includes(term)
  })
})

// 当前页数据
const currentPageData = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value
  const endIndex = startIndex + itemsPerPage.value
  return filteredData.value.slice(startIndex, endIndex)
})

// 总页数
const totalPages = computed(() => {
  return Math.ceil(filteredData.value.length / itemsPerPage.value)
})

// 搜索时重置页码
watch([searchTerm, itemsPerPage], () => {
  currentPage.value = 1
})

// 复制花字 ID（成功提示展示名称）
const handleCopy = async (id: string, title: string) => {
  try {
    await navigator.clipboard.writeText(id)
    copiedId.value = id
    const name = title.trim() || id
    alert(`复制花字 ${name} 成功`)
    setTimeout(() => {
      copiedId.value = null
    }, 2000)
  } catch {
    alert('复制失败')
  }
}

// 页码变化
const handlePageChange = (page: number) => {
  currentPage.value = page
}

// 上一页/下一页
const handlePrevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const handleNextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

// 生成页码按钮
const pageNumbers = computed(() => {
  const pages: number[] = []
  const maxVisiblePages = 5
  let startPage = Math.max(1, currentPage.value - Math.floor(maxVisiblePages / 2))
  const endPage = Math.min(totalPages.value, startPage + maxVisiblePages - 1)

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }
  return pages
})

// 打开预览
const openPreview = (imageUrl: string) => {
  previewImage.value = imageUrl
}

// 关闭预览
const closePreview = () => {
  previewImage.value = null
}
</script>

<template>
  <div class="huazi-viewer">
    <!-- 头部 -->
    <div class="huazi-header">
      <h1>花字数据查看器</h1>
      <p>浏览和搜索所有花字素材</p>
    </div>
    <div class="huazi-search">      
      <div class="huazi-search-box">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="搜索花字标题..."
          class="search-input"
        />
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="huazi-content">
      <div v-if="loading" class="huazi-loading">
        加载中...
      </div>
      <div v-else-if="filteredData.length === 0" class="huazi-empty">
        没有找到匹配的花字
      </div>
      <div v-else class="huazi-grid">
        <div
          v-for="item in currentPageData"
          :key="item.common_attr.id"
          class="huazi-card"
        >
          <div>
            <div
              class="huazi-card-image"
              @click="openPreview(item.common_attr?.cover_url?.static_img || '')"
            >
              <img 
                v-if="item.common_attr?.cover_url?.small" 
                :src="item.common_attr.cover_url.small" 
                :alt="item.common_attr.title" 
              />
              <span v-else>无图片</span>
            </div>
            <div class="huazi-card-title">{{ item.common_attr.title }}</div>
          </div>
          <div class="huazi-card-actions">
            <button
              :class="['huazi-copy-btn', { copied: copiedId === item.common_attr.id }]"
              @click="handleCopy(item.common_attr.id, item.common_attr.title ?? '')"
              title="复制花字id"
            >
              {{ copiedId === item.common_attr.id ? '✓' : '📋' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="filteredData.length > 0" class="huazi-pagination">
      <button
        @click="handlePrevPage"
        :disabled="currentPage === 1"
        class="page-btn"
      >
        上一页
      </button>
      <div class="huazi-page-numbers">
        <button
          v-for="page in pageNumbers"
          :key="page"
          :class="{ active: page === currentPage }"
          @click="handlePageChange(page)"
          class="page-number-btn"
        >
          {{ page }}
        </button>
      </div>
      <span class="huazi-page-info">
        第 {{ currentPage }} 页，共 {{ totalPages }} 页
      </span>
      <div class="huazi-page-size">
        <span>每页显示：</span>
        <select
          v-model="itemsPerPage"
          class="page-select"
        >
          <option
            v-for="num in ITEMS_PER_PAGE_OPTIONS"
            :key="num"
            :value="num"
          >
            {{ num }}
          </option>
        </select>
      </div>
      <button
        @click="handleNextPage"
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        下一页
      </button>
    </div>

    <!-- 图片预览模态框 -->
    <div v-if="previewImage" class="huazi-preview-modal" @click="closePreview">
      <div class="modal-content" @click.stop>
        <button class="modal-close" @click="closePreview">×</button>
        <img :src="previewImage" alt="预览" class="modal-image" />
      </div>
    </div>
  </div>
</template>
