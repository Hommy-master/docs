// import type { EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'
// import MyCode from './Code.vue'

export default {
    ...DefaultTheme,
    // // 继承默认主题，并覆盖Code组件
    // enhanceApp({ app }: EnhanceAppContext) {
    //     app.component('VPCode', MyCode)
    // }
}