
import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    title: '简创AIGC官方文档', // 网站标题
    lang: 'zh-CN',
    locales: { root: { label: '简体中文', lang: 'zh-CN' } },
    themeConfig: {
        logo: '/logo.png', // 网站图标

        // 汉化 begin
        outlineTitle: '当前页导航', // 右侧大纲标题
        // 文档页脚（上一页/下一页）
        docFooter: {
            prev: '上一页',
            next: '下一页'
        },
        lastUpdatedText: '最后更新于',
        darkModeSwitchLabel: '主题切换',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        // 汉化 end

        // 侧边栏配置
        sidebar: [
            {
                text: '<span class="icon">🎬</span>剪映小助手', // 导航菜单标题
                // collapsed: false, // 这个字段可以确保有折叠功能
                items: [
                    { text: '<span class="icon sub-icon">📝</span>add_audios.md', link: '/docs/add_audios' },
                    { text: '<span class="icon sub-icon">📝</span>add_images.md', link: '/docs/add_images' },
                    { text: '<span class="icon sub-icon">📝</span>add_sticker.md', link: '/docs/add_sticker' },
                    { text: '<span class="icon sub-icon">📝</span>add_videos.md', link: '/docs/add_videos' },
                    { text: '<span class="icon sub-icon">📝</span>create_draft.md', link: '/docs/create_draft' },
                    { text: '<span class="icon sub-icon">📝</span>gen_video.md', link: '/docs/gen_video' },
                    { text: '<span class="icon sub-icon">📝</span>get_draft.md', link: '/docs/get_draft' },
                    { text: '<span class="icon sub-icon">📝</span>save_draft.md', link: '/docs/save_draft' },
                ]
            },
            // {
            //     text: '指南2', // 导航菜单标题
            //     collapsed: false,
            //     items: [
            //         { text: '快速开始2', link: '/docs/guide2' },
            //         { text: '快速开始3', link: '/docs/guide3' },
            //     ]
            // }
        ],
        footer: {
            // 版权前显示的信息
            // message: 'Released under the MIT License.',
            // 实际的版权文本
            copyright: '版权所有 © 2025 简创AIGC'
        }
    }
})