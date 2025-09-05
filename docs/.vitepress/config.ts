
import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    lang: 'zh-CN', // 语言
    title: '简创AIGC官方文档', // 网站标题
    themeConfig: {
        logo: '/logo.png', // 网站图标
        outlineTitle: '当前页导航', // 右侧大纲标题
        // 文档页脚（上一页/下一页）
        docFooter: {
            prev: '上一页',
            next: '下一页'
        },
        sidebar: [ // 侧边栏配置
            {
                text: '指南', // 导航菜单标题
                collapsed: false,
                items: [
                    { text: '介绍', link: '/docs/guide' }, // 对应 docs/guide.md
                    { text: '快速开始', link: '/docs/guide1' }, // 对应 docs/guide/getting-started.md
                ]
            },
            {
                text: '指南2', // 导航菜单标题
                collapsed: false,
                items: [
                    { text: '快速开始2', link: '/docs/guide2' }, // 对应 docs/guide/getting-started.md
                    { text: '快速开始3', link: '/docs/guide3' }, // 对应 docs/guide/getting-started.md
                ]
            }
        ],
        footer: {
            // 版权前显示的信息
            // message: 'Released under the MIT License.',
            // 实际的版权文本
            copyright: '版权所有 © 2025 简创AIGC'
        }
    }
})