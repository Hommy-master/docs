---
layout: page
title: 贴纸数据
---

<script setup>
import { defineAsyncComponent } from 'vue'

const TieZhi = defineAsyncComponent(() => import('../.vitepress/theme/TieZhi/index.vue'))
</script>

<ClientOnly>
  <TieZhi />
</ClientOnly>
