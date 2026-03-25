---
layout: page
title: 花字数据
---

<script setup>
import { defineAsyncComponent } from 'vue'

const Huazi = defineAsyncComponent(() => import('../.vitepress/theme/HuaZi/index.vue'))
</script>

<ClientOnly>
  <Huazi />
</ClientOnly>
