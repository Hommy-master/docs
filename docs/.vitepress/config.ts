import { defineConfig } from 'vitepress'
import llmstxt, { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms'

function subIcon(emoji: string, slug: string) {
    return `<span class="icon sub-icon">${emoji}</span>${slug}`
}

/** 默认进入中文文档；页内 Language Switch 可切英文 */
function docItem(slug: string, emoji: string) {
    return { text: subIcon(emoji, slug), link: `/docs/${slug}.zh` }
}

function category(title: string, slugs: string[], emoji: string) {
    return {
        text: title,
        collapsed: false,
        items: slugs.map((s) => docItem(s, emoji)),
    }
}

export default defineConfig({
    title: '简创AIGC官方文档',
    description: '简创AIGC剪映小助手API文档，提供完整的API接口说明、使用示例和最佳实践指南，帮助开发者快速集成和使用我们的视频自动化创作服务。',
    lang: 'zh-CN',
    locales: { root: { label: '简体中文', lang: 'zh-CN' } },
    lastUpdated: true,
    cleanUrls: false,
    ignoreDeadLinks: false,
    rewrites: {
        'api/:category/:page': 'docs/:page',
    },
    markdown: {
        config(md) {
            md.use(copyOrDownloadAsMarkdownButtons)
        },
    },
    vite: {
        plugins: [
            llmstxt({
                generateLLMsTxt: false,
                generateLLMsFullTxt: true,
                generateLLMFriendlyDocsForEachPage: true,
                ignoreFiles: ['page/huazi.md'],
                ignoreFilesPerOutput: {
                    llmsFullTxt: [
                        'docs/*.md',
                        '!docs/*.zh.md',
                        'guide/*.md',
                        '!guide/*.zh.md',
                    ],
                },
            }),
        ],
    },
    themeConfig: {
        logo: '/logo.png',
        outline: { label: '当前页导航' },
        docFooter: {
            prev: '上一页',
            next: '下一页',
        },
        lastUpdated: { text: '最后更新于' },
        darkModeSwitchLabel: '主题切换',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        llms: {
            copyText: '复制本页',
            copiedText: '已复制',
            viewMarkdownText: '查看 Markdown',
            openInAIText: '在 {provider} 中打开',
        },
        sidebar: [
            {
                text: '<span class="icon">🎬</span>剪映小助手',
                items: [
                    {
                        text: '<span class="icon">🤖</span>模型调用',
                        collapsed: false,
                        items: [
                            { text: subIcon('📘', '调用指南'), link: '/guide/llm-guide.zh' },
                            { text: subIcon('📄', '精简契约'), link: '/guide/llm-contract.zh' },
                        ],
                    },
                    category(
                        '<span class="icon">📋</span>草稿与导出',
                        [
                            'create_draft',
                            'get_draft',
                            'save_draft',
                            'gen_video',
                            'gen_video_status',
                            'easy_create_material',
                        ],
                        '📋'
                    ),
                    category(
                        '<span class="icon">🎞️</span>添加素材',
                        [
                            'add_audios',
                            'add_beauty',
                            'add_captions',
                            'add_effects',
                            'add_filters',
                            'add_images',
                            'add_keyframes',
                            'add_masks',
                            'add_mask_keyframes',
                            'add_sticker',
                            'add_text_style',
                            'add_videos',
                        ],
                        '📝'
                    ),
                    category(
                        '<span class="icon">🔍</span>查询与工具',
                        [
                            'get_audio_duration',
                            'get_image_animations',
                            'get_text_animations',
                            'get_text_effects',
                            'get_url',
                            'search_sticker',
                        ],
                        '🔍'
                    ),
                    category(
                        '<span class="icon">📦</span>数据结构说明',
                        [
                            'audio_infos',
                            'audio_timelines',
                            'caption_infos',
                            'effect_infos',
                            'filter_infos',
                            'imgs_infos',
                            'keyframes_infos',
                            'timelines',
                            'video_infos',
                        ],
                        '📦'
                    ),
                    category(
                        '<span class="icon">🔤</span>字符串工具',
                        ['str_list_to_objs', 'objs_to_str_list', 'str_to_list'],
                        '🔤'
                    ),
                    { text: '<span class="icon sub-icon">🎨</span>花字数据', link: '/page/huazi' },
                ],
            },
        ],
        footer: {
            copyright: '版权所有 © 2025 简创AIGC',
        },
    },
    head: [
        ['link', { rel: 'describedby', href: '/llms.txt' }],
        [
            'style',
            {},
            `
            :root {
                --vp-layout-max-width: 100%;
                --vp-c-brand: #348feb;
                --vp-c-brand-light: #54a6f2;
                --vp-c-brand-dark: #1a6bc5;
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

            /* 首页网格布局样式 */
            .grid-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }

            .grid-item {
                border: 1px solid var(--vp-c-divider);
                border-radius: 8px;
                padding: 20px;
                transition: box-shadow 0.3s ease;
            }

            .grid-item:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .grid-item h3 {
                margin-top: 0;
                color: var(--vp-c-brand);
            }

            .grid-item ul {
                padding-left: 20px;
            }

            .grid-item li {
                margin-bottom: 8px;
            }

            .grid-item a {
                color: var(--vp-c-text-2);
                text-decoration: none;
            }

            .grid-item a:hover {
                color: var(--vp-c-brand);
                text-decoration: underline;
            }

            /* 图标样式 */
            .icon {
                margin-right: 8px;
            }

            /* 侧边栏图标样式 */
            .sub-icon {
                margin-right: 8px;
                font-size: 0.9em;
            }
        `,
        ],
    ],
})
