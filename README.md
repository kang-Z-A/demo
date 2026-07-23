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

## 三维场景交互说明

### 基础视角控制

| 操作 | 说明 |
|------|------|
| 鼠标左键拖拽 | 旋转视角 |
| 鼠标滚轮 | 缩放场景 |
| 鼠标右键拖拽 | 平移视角 |

### 设备交互

- **双击聚焦设备**：在场景中双击任意设备模型，相机将平滑飞至设备近处并自动高亮该设备（绿色描边），同时在该设备上方弹出视频播放面板，自动播放对应巡检录像。
- **右键取消聚焦**：在场景中右键单击可取消当前聚焦状态——清除设备高亮描边、隐藏视频面板并暂停视频播放。
- **视频面板控制**：点击设备上方的视频面板可切换播放 / 暂停状态。视频面板具有广告牌效果，始终面向相机。

> **提示**：拖拽操作（鼠标按下后移动超过 2px）不会触发右键取消事件，避免误操作。

### 自动巡检

点击右侧“自动巡检任务”面板中的任务行，场景将自动按设备顺序逐个聚焦巡检：

1. 相机平滑飞至第一个设备并高亮
2. 停留 2 秒后切换至下一个设备
3. 全部设备巡检完毕后，最后一个设备的视频面板保持显示
4. 巡检过程中会先终止上一次动画，避免冲突

### 第一人称漫游模式

通过右上角 **Inspector → setting → 漫游模式** 勾选开启。进入漫游模式后：

| 按键 | 操作 |
|------|------|
| `W` / `↑` | 前进 |
| `S` / `↓` | 后退 |
| `A` / `←` | 左移 |
| `D` / `→` | 右移 |
| `Q` | 上升 |
| `E` | 下降 |
| 鼠标移动 | 控制视角方向 |
| `Esc` | 退出指针锁定（浏览器默认行为） |

进入漫游模式后，OrbitControls 将被禁用，鼠标指针锁定，移动鼠标即可环顾四周。再次取消勾选“漫游模式”可退出并恢复 OrbitControls。

### Inspector 调试面板

项目集成了 Three.js Inspector，可通过右上角面板访问以下调试功能：

- **setting → 漫游模式**：切换第一人称漫游
- **setting → 显示设备状态**：以颜色区分设备状态（绿色=正常，红色=异常）
- **setting → 随机修改设备状态**：随机重新分配设备正常/异常状态
- **setting → 随机刷新巡检任务**：自动定时刷新右侧巡检任务列表

## 功能概览

- **三维场景**：基于 Three.js 构建的 3D 可视化场景
- **数据图表**：集成 ECharts，展示任务状态占比饼图与巡检任务趋势柱状图
- **动效交互**：使用 GSAP 驱动的动画效果
- **响应式 UI**：基于 Tailwind CSS 的现代化界面
