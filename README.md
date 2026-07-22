# three.js + Vue 3 + TypeScript 三维可视化 Demo

基于 Vue 3、Three.js、ECharts、Element Plus 与 Tailwind CSS 构建的三维可视化展示项目，集成 GSAP 动效与数据图表面板。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Vue 3](https://vuejs.org/) (Composition API) |
| 构建工具 | [Vite](https://vitejs.dev/) |
| 语言 | [TypeScript](https://www.typescriptlang.org/) |
| 3D 渲染 | [Three.js](https://threejs.org/) |
| 动画引擎 | [GSAP](https://gsap.com/) |
| 图表库 | [ECharts](https://echarts.apache.org/) |
| UI 组件库 | [Element Plus](https://element-plus.org/) |
| CSS 框架 | [Tailwind CSS](https://tailwindcss.com/) v4 |
| 路由 | [Vue Router](https://router.vuejs.org/)（文件系统路由生成） |
| 时间处理 | [dayjs](https://dayjs.dev/) |
| 自动导入 | unplugin-auto-import / unplugin-vue-components / unplugin-vue-router |

## 快速启动

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

项目默认运行在 `http://localhost:5173`。

### 构建生产版本

```bash
pnpm build
```

### 预览生产构建

```bash
pnpm preview
```

## 项目结构

```
src/
├── assets/       # 静态资源
├── mock/         # 模拟数据
├── pages/        # 页面组件
│   ├── home.vue  # 主页面（3D 可视化 + 图表面板）
│   ├── style.css
│   └── useComposer.ts
├── plugins/      # 插件配置（dayjs 等）
├── router/       # 路由配置
├── types/        # TypeScript 类型声明
├── App.vue       # 根组件
├── main.ts       # 入口文件
└── style.css     # 全局样式
```

## 功能概览

- **三维场景**：基于 Three.js 构建的 3D 可视化场景
- **数据图表**：集成 ECharts，展示任务状态占比饼图与巡检任务趋势柱状图
- **动效交互**：使用 GSAP 驱动的动画效果
- **响应式 UI**：基于 Tailwind CSS 的现代化界面
