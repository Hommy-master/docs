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
                    { text: '<span class="icon sub-icon">📝</span>add_audios', link: '/docs/add_audios' },
                    { text: '<span class="icon sub-icon">📝</span>add_captions', link: '/docs/add_captions' },
                    { text: '<span class="icon sub-icon">📝</span>add_effects', link: '/docs/add_effects' },
                    { text: '<span class="icon sub-icon">📝</span>add_images', link: '/docs/add_images' },
                    { text: '<span class="icon sub-icon">📝</span>add_keyframes', link: '/docs/add_keyframes' },
                    { text: '<span class="icon sub-icon">📝</span>add_masks', link: '/docs/add_masks' },
                    { text: '<span class="icon sub-icon">📝</span>add_sticker', link: '/docs/add_sticker' },
                    { text: '<span class="icon sub-icon">📝</span>add_text_style', link: '/docs/add_text_style' },
                    { text: '<span class="icon sub-icon">📝</span>add_videos', link: '/docs/add_videos' },
                    { text: '<span class="icon sub-icon">📝</span>create_draft', link: '/docs/create_draft' },
                    { text: '<span class="icon sub-icon">📝</span>easy_create_material', link: '/docs/easy_create_material' },
                    { text: '<span class="icon sub-icon">📝</span>gen_video', link: '/docs/gen_video' },
                    { text: '<span class="icon sub-icon">📝</span>gen_video_status', link: '/docs/gen_video_status' },
                    { text: '<span class="icon sub-icon">📝</span>get_audio_duration', link: '/docs/get_audio_duration' },
                    { text: '<span class="icon sub-icon">📝</span>get_draft', link: '/docs/get_draft' },
                    { text: '<span class="icon sub-icon">📝</span>get_image_animations', link: '/docs/get_image_animations' },
                    { text: '<span class="icon sub-icon">📝</span>get_text_animations', link: '/docs/get_text_animations' },
                    { text: '<span class="icon sub-icon">📝</span>save_draft', link: '/docs/save_draft' },
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
    },
    // 添加自定义CSS实现全屏效果
    head: [
        ['style', {}, `
            :root {
                --vp-layout-max-width: 100%;
            }
            .VPDoc:not(.has-sidebar) .container {
                max-width: 100% !important;
            }
            .VPDoc:not(.has-sidebar) .content {
                max-width: 100% !important;
            }
            .VPDoc.has-aside .content-container {
                max-width: 100% !important;
            }
            .content-container {
                max-width: 100% !important;
            }
        `]
    ]
})