
import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
    title: '简创AIGC官方文档', // 网站标题
    themeConfig: {
        sidebar: [ // 侧边栏配置
            {
                text: '指南', // 导航菜单标题
                items: [
                    { text: '介绍', link: '/docs/guide' }, // 对应 docs/guide.md
                    // {
                    //     text: '二级操作', items: [
                    //         { text: '文档1', link: '/docs/first/guide' }, // 对应 docs/guide.md
                    //         { text: '文档2', link: '/docs/first/api' }     // 对应 docs/api.md
                    //     ]
                    // }
                ]
            }
        ],
    }
})