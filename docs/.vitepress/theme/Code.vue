<!-- 文件路径：.vitepress/theme/Code.vue -->
<script setup>
import { useData } from 'vitepress'
// 正确：导入整个默认主题，而不是其内部的具体文件
import DefaultTheme from 'vitepress/theme'

const { lang } = useData()

// 定义您需要汉化的文本
const messages = {
  'zh-CN': {
    copy: '复制代码',
    copied: '已复制'
  },
  'en-US': {
    copy: 'Copy code',
    copied: 'Copied'
  }
}

const text = messages[lang.value] || messages['zh-CN']
</script>

<template>
  <!-- 继承默认的Code组件 -->
  <DefaultTheme.Code>
    <!-- 通过覆盖 #copy-button 插槽来自定义按钮 -->
    <template #copy-button="{ copied, copy }">
      <button
        :title="text.copy" 
        @click="copy"
      >
        <span v-if="copied">{{ text.copied }}</span>
        <span v-else>{{ text.copy }}</span>
      </button>
    </template>
  </DefaultTheme.Code>
</template>