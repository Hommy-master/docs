
import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    lang: 'zh-CN', // 语言
    title: '简创AIGC官方文档', // 网站标题
    themeConfig: {
        logo: '/logo.png', // 网站图标
        // 文档页脚（上一页/下一页）
        docFooter: {
            prev: '上一页',
            next: '下一页'
        },
        sidebar: [ // 侧边栏配置
            {
                text: '指南', // 导航菜单标题
                items: [
                    { text: '介绍', link: '/docs/guide' }, // 对应 docs/guide.md
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