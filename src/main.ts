import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index'
import './plugins/dayjs'
import './style.css'

// 添加类型声明以解决类型不匹配
createApp(App).use(router).mount('#app')
