<template>
    <div class="w-screen h-screen bg-black" ref="container"></div>
    <!-- 左侧图表面板：任务状态占比饼图 + 巡检任务趋势柱状图 -->
    <div class="absolute top-0 left-0 w-85 pointer-events-none">
        <!-- 饼图 -->
        <div
            class="pointer-events-auto m-3 flex flex-col rounded-lg border border-white/15 bg-black/75 backdrop-blur-md overflow-hidden"
        >
            <div
                class="flex items-center justify-between px-4 py-3 border-b border-white/10"
            >
                <span class="text-white text-base font-semibold tracking-wide"
                    >任务状态占比</span
                >
            </div>
            <div ref="pieChartRef" class="w-full" style="height: 240px"></div>
        </div>
        <!-- 柱状图 -->
        <div
            class="pointer-events-auto m-3 flex flex-col rounded-lg border border-white/15 bg-black/75 backdrop-blur-md overflow-hidden"
        >
            <div
                class="flex items-center justify-between px-4 py-3 border-b border-white/10"
            >
                <span class="text-white text-base font-semibold tracking-wide"
                    >巡检任务趋势</span
                >
            </div>
            <div ref="barChartRef" class="w-full" style="height: 200px"></div>
        </div>
    </div>
    <!-- 右侧巡检任务面板 -->
    <div
        class="absolute top-50 right-0 h-100 w-90 flex flex-col pointer-events-none"
    >
        <div
            class="pointer-events-auto m-3 flex flex-col rounded-lg border border-white/15 bg-black/75 backdrop-blur-md overflow-hidden"
            style="max-height: calc(100vh - 24px)"
        >
            <!-- 面板标题 -->
            <div
                class="flex items-center justify-between px-4 py-3 border-b border-white/10"
            >
                <span class="text-white text-base font-semibold tracking-wide"
                    >自动巡检任务</span
                >
                <span class="text-white/50 text-xs"
                    >共 {{ taskList.length }} 条</span
                >
            </div>
            <!-- 任务列表 -->
            <div class="flex-1 overflow-y-auto custom-scrollbar">
                <div
                    v-for="task in taskList"
                    :key="task.taskId"
                    class="task-row mx-2 my-1.5 rounded-md px-3 py-2.5 cursor-pointer transition-all duration-200 border border-transparent hover:border-white/20 hover:bg-white/5"
                    :class="{
                        'bg-white/8 border-white/15':
                            activeTaskId === task.taskId &&
                            inspectingTaskId !== task.taskId,
                        'inspecting-row': inspectingTaskId === task.taskId,
                    }"
                    @click="handleTaskClick(task)"
                >
                    <!-- 第一行：任务编号 + 状态 -->
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-white/85 text-sm font-medium">{{
                            task.taskId
                        }}</span>
                        <span
                            class="text-xs font-semibold px-2 py-0.5 rounded-full"
                            :style="getStatusStyle(task.status)"
                        >
                            {{ task.status }}
                        </span>
                    </div>
                    <!-- 第二行：机器人名称 -->
                    <div class="flex items-center gap-1.5 mb-1">
                        <span class="text-white/40 text-xs">机器人</span>
                        <span class="text-white/70 text-xs truncate">{{
                            task.robotName
                        }}</span>
                    </div>
                    <!-- 第三行：关联点位（支持多个） -->
                    <div class="flex items-start gap-1.5 mb-1">
                        <span class="text-white/40 text-xs shrink-0 mt-0.5"
                            >点位</span
                        >
                        <div class="flex flex-wrap gap-1">
                            <span
                                v-for="(name, idx) in task.deviceNameList"
                                :key="idx"
                                class="text-white/70 text-xs px-1.5 py-px rounded bg-white/8"
                            >
                                {{ name }}
                            </span>
                        </div>
                    </div>
                    <!-- 第四行：计划时间 -->
                    <div class="flex items-center gap-1.5 mb-1">
                        <span class="text-white/40 text-xs">计划</span>
                        <span class="text-white/60 text-xs">{{
                            task.planTime
                        }}</span>
                    </div>
                    <!-- 第五行：异常备注（仅异常告警/已超时时显示） -->
                    <div
                        v-if="task.remark"
                        class="flex items-start gap-1.5 mt-1.5 pt-1.5 border-t border-white/5"
                    >
                        <span class="text-red-400/70 text-xs shrink-0 mt-0.5"
                            >备注</span
                        >
                        <span class="text-red-300/80 text-xs leading-relaxed">{{
                            task.remark
                        }}</span>
                    </div>
                </div>
                <!-- 空状态 -->
                <div
                    v-if="taskList.length === 0"
                    class="flex items-center justify-center py-16 text-white/30 text-sm"
                >
                    暂无巡检任务
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { gsap } from "gsap";
import { Inspector } from "three/examples/jsm/inspector/Inspector.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import MockData from "@/mock/data.json";
import { OutlinePassConfig } from "@/types/index";
import { useComposerHook } from "@/pages/useComposer";
import "./style.css";
import * as echarts from "echarts/core";
import { PieChart, BarChart } from "echarts/charts";
import {
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
    PieChart,
    BarChart,
    TitleComponent,
    TooltipComponent,
    LegendComponent,
    GridComponent,
    CanvasRenderer,
]);

const container = useTemplateRef<HTMLDivElement>("container");

/** 巡检任务列表（响应式） */
const taskList = reactive<typeof MockData.taskList>([]);
/** 当前激活（被点击选中）的任务ID */
const activeTaskId = ref<string | null>(null);
/** 当前正在执行巡检动画序列的任务ID */
const inspectingTaskId = ref<string | null>(null);
/** 巡检动画专用 GSAP Timeline（避免与全局 gsapTimeLine 冲突） */
let inspectionTimeline: gsap.core.Timeline | null = null;
/** 视频播放用的 HTMLVideoElement，用于巡检时在设备上方展示实时视频画面 */
let videoElement: HTMLVideoElement | null = null;
/** 从 videoElement 创建的 Three.js 视频纹理，作为视频平面的贴图 */
let videoTexture: THREE.VideoTexture | null = null;
/** 巡检时设备上方展示的视频平面网格，根据可见性控制显隐 */
let videoPlane: THREE.Mesh | null = null;
/** 自动刷新定时器 */
let refreshTimer: ReturnType<typeof setInterval> | null = null;

/** ECharts 图表容器 DOM 引用 */
const pieChartRef = useTemplateRef<HTMLDivElement>("pieChartRef");
const barChartRef = useTemplateRef<HTMLDivElement>("barChartRef");
/** ECharts 图表实例 */
let pieChartInstance: echarts.ECharts | null = null;
let barChartInstance: echarts.ECharts | null = null;
/** 趋势柱状图数据：从 MockData 初始化，后续由定时器模拟更新 */
const trendDays = ref<string[]>([...MockData.chartData.dayLabels]);
const trendFinish = ref<number[]>([...MockData.chartData.finishData]);
const trendAlarm = ref<number[]>([...MockData.chartData.alarmData]);
/** 饼图初始数据 */
const pieData = ref<{ name: string; value: number }[]>(
    MockData.chartData.statusPie.map((item) => ({ ...item })),
);

/** 任务状态对应的文字颜色映射 */
const statusColorMap: Record<string, { color: string; bg: string }> = {
    待巡检: { color: "#409EFF", bg: "rgba(64,158,255,0.15)" },
    巡检中: { color: "#67C23A", bg: "rgba(103,194,58,0.15)" },
    已完成: { color: "#909399", bg: "rgba(144,147,153,0.15)" },
    异常告警: { color: "#F56C6C", bg: "rgba(245,108,108,0.15)" },
    已超时: { color: "#E6A23C", bg: "rgba(230,162,60,0.15)" },
};

/** 根据状态获取行内样式 */
function getStatusStyle(status: string) {
    const map = statusColorMap[status] || {
        color: "#909399",
        bg: "rgba(144,147,153,0.15)",
    };
    return {
        color: map.color,
        backgroundColor: map.bg,
    };
}

/** 根据deviceId在场景中查找对应的3D模型 */
function findDeviceInScene(deviceId: string): THREE.Object3D | null {
    return scene.getObjectByName(deviceId) || null;
}

/** 点击任务行：按设备顺序逐个聚焦，每个停留2秒 */
function handleTaskClick(task: (typeof MockData.taskList)[0]) {
    activeTaskId.value = task.taskId;

    if (!task.deviceIdList || task.deviceIdList.length === 0) return;

    // 终止上一次巡检动画
    if (inspectionTimeline) {
        inspectionTimeline.kill();
    }
    // 也终止全局 gsapTimeLine 防止冲突
    gsapTimeLine.kill();

    // 标记巡检开始
    inspectingTaskId.value = task.taskId;

    // 创建巡检动画专用 Timeline
    inspectionTimeline = gsap.timeline({
        onComplete: () => {
            inspectingTaskId.value = null;
            inspectionTimeline = null;
            // 巡检结束，最后一个设备的视频平面保持显示，不自动隐藏
        },
    });

    // 巡检开始时先隐藏视频平面
    if (videoPlane) videoPlane.visible = false;

    task.deviceIdList.forEach((deviceId, index) => {
        const device = findDeviceInScene(deviceId);
        if (!device) return;

        device.getWorldPosition(pos);
        const unitVector = new THREE.Vector3()
            .subVectors(pos, camera.position)
            .normalize();
        const targetPos = pos.clone().add(unitVector.multiplyScalar(-5));

        // 切换到下一个设备前，先隐藏上一个设备的视频平面
        if (index > 0) {
            inspectionTimeline!.call(() => {
                if (videoPlane) videoPlane.visible = false;
                if (videoElement) videoElement.pause();
            });
        }

        // 相机移动到目标位
        inspectionTimeline!.to(camera.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 0.8,
            ease: "power2.inOut",
        });
        // Orbit 目标同步移动
        inspectionTimeline!.to(
            orbitControls.target,
            {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                duration: 0.8,
                ease: "power2.inOut",
            },
            "<",
        );
        // 高亮当前设备
        inspectionTimeline!.call(() => highlightObject(device));

        // 每个设备停留 2 秒（最后一个设备不延时，留给 onComplete）
        if (index < task.deviceIdList.length - 1) {
            inspectionTimeline!.to({}, { duration: 2 });
        }
    });

    inspectionTimeline.play();
}

/** 加载模拟数据 */
function loadTaskData() {
    taskList.length = 0;
    taskList.push(...MockData.taskList);
}

/** 初始化 ECharts 饼图（任务状态占比） */
function initPieChart() {
    if (!pieChartRef.value) return;
    if (pieChartInstance) pieChartInstance.dispose();
    pieChartInstance = echarts.init(pieChartRef.value, "dark");
    updatePieChart();
}

/** 更新饼图数据：根据当前 taskList 各状态数量动态计算 */
function updatePieChart() {
    if (!pieChartInstance) return;
    // 统计各状态任务数量
    const statusCount: Record<string, number> = {};
    taskList.forEach((task) => {
        statusCount[task.status] = (statusCount[task.status] || 0) + 1;
    });
    const data = Object.entries(statusCount).map(([name, value]) => ({
        name,
        value,
    }));
    const option: echarts.EChartsCoreOption = {
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: {
            orient: "vertical",
            right: 5,
            top: "center",
            textStyle: { color: "#ccc", fontSize: 11 },
        },
        series: [
            {
                type: "pie",
                radius: ["45%", "75%"],
                center: ["40%", "50%"],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 4,
                    borderColor: "rgba(0,0,0,0.8)",
                    borderWidth: 2,
                },
                label: { show: false },
                emphasis: {
                    label: { show: true, fontSize: 14, fontWeight: "bold" },
                    scaleSize: 8,
                },
                data,
                color: ["#409EFF", "#67C23A", "#909399", "#F56C6C", "#E6A23C"],
            },
        ],
    };
    pieChartInstance.setOption(option);
    pieData.value = data;
}

/** 初始化 ECharts 柱状图（巡检任务趋势） */
function initBarChart() {
    if (!barChartRef.value) return;
    if (barChartInstance) barChartInstance.dispose();
    barChartInstance = echarts.init(barChartRef.value, "dark");
    updateBarChart();
}

/** 更新柱状图数据 */
function updateBarChart() {
    if (!barChartInstance) return;
    const option: echarts.EChartsCoreOption = {
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
        },
        legend: {
            data: ["已完成", "异常告警"],
            top: 0,
            textStyle: { color: "#ccc", fontSize: 11 },
        },
        grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            top: 30,
            containLabel: true,
        },
        xAxis: {
            type: "category",
            data: trendDays.value,
            axisLabel: { color: "#999" },
            axisLine: { lineStyle: { color: "#333" } },
        },
        yAxis: {
            type: "value",
            axisLabel: { color: "#999" },
            splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
        },
        series: [
            {
                name: "已完成",
                type: "bar",
                data: trendFinish.value,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: "#67C23A" },
                        { offset: 1, color: "rgba(103,194,58,0.3)" },
                    ]),
                    borderRadius: [4, 4, 0, 0],
                },
                barWidth: "35%",
            },
            {
                name: "异常告警",
                type: "bar",
                data: trendAlarm.value,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: "#F56C6C" },
                        { offset: 1, color: "rgba(245,108,108,0.3)" },
                    ]),
                    borderRadius: [4, 4, 0, 0],
                },
                barWidth: "35%",
            },
        ],
    };
    barChartInstance.setOption(option);
}

/** 模拟实时推送：更新趋势数据并刷新任务状态 */
function simulateRealtimePush() {
    // 柱状图横坐标固定周一~周五不变，仅随机波动数值模拟数据变化
    trendFinish.value = trendFinish.value.map(
        () => Math.floor(Math.random() * 10) + 10,
    );
    trendAlarm.value = trendAlarm.value.map(() =>
        Math.floor(Math.random() * 4),
    );

    // 更新任务状态数据
    taskList.forEach((task) => {
        const num = Math.random();
        if (num < 0.33) task.status = "巡检中";
        else if (num < 0.66) task.status = "已完成";
        else task.status = "异常告警";
        if (task.status === "异常告警" && !task.remark) {
            task.remark = "巡检过程中检测到设备参数异常";
        } else if (task.status !== "异常告警") {
            task.remark = "";
        }
    });

    updatePieChart();
    updateBarChart();
}

/** 启动定时刷新（每5秒模拟后端实时数据推送，联动更新任务列表+图表+3D设备） */
function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
        simulateRealtimePush();
    }, 3000);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}
const scene = new THREE.Scene();
const renderer = new THREE.WebGPURenderer({
    antialias: true,
    alpha: true,
    logarithmicDepthBuffer: true,
});
let camera: THREE.PerspectiveCamera;
let orbitControls: OrbitControls;
let inspector: Inspector;
let pointerLockControls: PointerLockControls;

const highlightColor = "#00ff00";
let composerApi: ReturnType<typeof useComposerHook>;

function changeOutlinePass(
    models: THREE.Object3D[],
    outlinePassOptions: OutlinePassConfig,
    index = 0,
) {
    if (composerApi && composerApi.outlinePasses.length > index) {
        composerApi.updateOutlineConfig(index, {
            edgeStrength: outlinePassOptions.edgeStrength ?? 16, // 描边强度
            edgeGlow: outlinePassOptions.edgeGlow ?? 1, // 描边光晕
            edgeThickness: outlinePassOptions.edgeThickness ?? 3.0, // 描边厚度
            pulsePeriod: outlinePassOptions.pulsePeriod ?? 2.0, // 描边呼吸频率
            color: outlinePassOptions.color ?? highlightColor, // 描边颜色（可见和不可见部分）
        });
        // 设置需要高亮的物体
        composerApi.outlinePasses[index].selectedObjects = models;
    }
}

const gsapTimeLine = gsap.timeline();

function addLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 环境光
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfffdf6, 2);
    directionalLight.position.set(30, 15, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = Math.pow(2, 12); // 降级为4096以提升性能
    directionalLight.shadow.mapSize.height = Math.pow(2, 12);
    // directionalLight.shadow.blurSamples = 8; // 增加模糊采样数量以获得更柔和的阴影边缘
    const length = 20;
    directionalLight.shadow.camera.left = -length;
    directionalLight.shadow.camera.right = length;
    directionalLight.shadow.camera.top = length;
    directionalLight.shadow.camera.bottom = -length;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.radius = 2;
    directionalLight.shadow.bias = -0.005;
    scene.add(directionalLight);
}

/**防止拖拽事件触发点击事件 */
let beforeX: number, beforeY: number, afterX: number, afterY: number;
/** 存储 mousedown 事件处理函数引用，用于 onUnmounted 时移除监听 */
const onMouseDown = (e: MouseEvent) => {
    [beforeX, beforeY] = [e.offsetX, e.offsetY];
};
/** 存储 mouseup 事件处理函数引用，用于 onUnmounted 时移除监听 */
const onMouseUp = (e: MouseEvent) => {
    [afterX, afterY] = [e.offsetX, e.offsetY];
};
function contextmenuEvent(event: MouseEvent) {
    event.preventDefault();
    if (Math.abs(afterX - beforeX) > 2 || Math.abs(afterY - beforeY) > 2)
        return;
    if (videoPlane) videoPlane.visible = false;
    if (videoElement) videoElement.pause();
    return recoverMaterial();
}

const recoverMaterial = (includeOutline: boolean = false) => {
    if (!includeOutline) {
        //清除高亮描边
        if (composerApi) {
            composerApi.outlinePasses.forEach((item) => {
                item.selectedObjects = [];
            });
        }
    }
};

function addEventListeners() {
    if (!container.value) return;
    container.value.addEventListener("dblclick", addRaycaster);
    container.value.addEventListener("click", clickVideoPlaneToggle);
    container.value.addEventListener("contextmenu", contextmenuEvent);
    container.value.addEventListener("mousedown", onMouseDown);
    container.value.addEventListener("mouseup", onMouseUp);
}

const pos = new THREE.Vector3();
function addRaycaster(event: MouseEvent) {
    event.preventDefault();

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        const object = intersects[0].object;
        console.log("射线拾取到物体：", object);

        object.getWorldPosition(pos);
        const unitVector = new THREE.Vector3()
            .subVectors(pos, camera.position)
            .normalize();
        const pos2 = pos.clone().add(unitVector.multiplyScalar(-5));

        if (!orbitControls) return;
        gsapTimeLine.kill();
        gsapTimeLine.to(camera.position, {
            x: pos2.x,
            y: pos2.y,
            z: pos2.z,
            duration: 0.5,
            ease: "power2.inOut",
        });
        gsapTimeLine.to(
            orbitControls!.target,
            {
                x: pos.x,
                y: pos.y,
                z: pos.z,
                duration: 0.5,
                ease: "power2.inOut",
            },
            "<",
        ); // "<" 表示与前一个动画同时开始，实现同步
        highlightObject(object);
        gsapTimeLine.play();
    }
}

/**
 * 点击视频平面切换播放/暂停状态
 * 通过射线检测判断点击是否命中视频平面，若命中则切换 videoElement 的播放状态
 */
function clickVideoPlaneToggle(event: MouseEvent) {
    if (!videoPlane || !videoPlane.visible || !videoElement) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(videoPlane);
    if (intersects.length > 0) {
        event.stopPropagation();
        if (videoElement.paused) {
            videoElement.play();
        } else {
            videoElement.pause();
        }
    }
}

function videoCanPlayHandler() {
    if (!videoElement || !videoPlane) return;

    videoPlane.visible = true;
    videoElement.play();

    videoElement.removeEventListener("loadeddata", videoCanPlayHandler);
}

function highlightObject(object: THREE.Object3D) {
    if (composerApi) {
        changeOutlinePass([object], {
            color: highlightColor,
        });
    }
    ElMessage.success(`选中设备${object.name}`);

    if (videoPlane && videoElement) {
        const devicePos = new THREE.Vector3();
        object.getWorldPosition(devicePos);
        videoPlane.position.copy(devicePos);
        videoPlane.position.y += 1.5;

        // 根据设备 deviceId（即 object.name）动态加载对应的 mp4 视频源
        const deviceId = object.name;

        // 切换新视频源：先隐藏平面，等待视频加载完毕后再显示
        videoPlane.visible = false;

        const targetSrc = `/${deviceId}.mp4`;

        // 销毁旧纹理，重新创建 VideoTexture 并赋值给平面材质，避免仅替换 src 失效
        if (videoTexture) {
            videoTexture.dispose();
        }
        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.colorSpace = THREE.SRGBColorSpace;

        // 将新纹理挂载到平面材质上
        (videoPlane.material as THREE.MeshBasicNodeMaterial).map =
            videoTexture;
        (videoPlane.material as THREE.MeshBasicNodeMaterial).needsUpdate = true;

        videoElement.addEventListener("loadeddata", videoCanPlayHandler);
        videoElement.src = targetSrc;
        videoElement.load();
    }
}

/**场景初始化 */
function init() {
    const containerWidth = container.value!.clientWidth;
    const containerHeight = container.value!.clientHeight;

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(containerWidth, containerHeight);
    renderer.shadowMap.enabled = true; // 渲染器阴影渲染
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 阴影类型
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;

    // 先挂载 canvas 到 DOM
    container.value?.appendChild(renderer.domElement);

    inspector = new Inspector();
    renderer.inspector = inspector;
    inspector.init();

    camera = new THREE.PerspectiveCamera(
        60,
        containerWidth / containerHeight,
        0.1,
        10000,
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = false;

    addLight();
    composerApi = useComposerHook({
        renderer,
        camera,
        scene,
        highlightColor,
        outlinePassCount: 2,
        outlinePassConfigs: [{}],
    });

    addEventListeners();

    renderer.setAnimationLoop(animate);
}

function animate() {
    camera.updateProjectionMatrix();

    if (setttings.roaming) {
        if (!pointerLockControls) usePointerLockControls();
        firstViewMoveWatcher();
    } else {
        orbitControls?.update();
    }

    // 视频平面广告牌效果：每帧让平面的 +Z 方向始终朝向相机
    if (videoPlane && videoPlane.visible) {
        const dir = new THREE.Vector3()
            .subVectors(camera.position, videoPlane.position)
            .normalize();
        videoPlane.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            dir,
        );
    }

    if (composerApi) {
        composerApi.postProcessing.render();
    } else {
        renderer.render(scene, camera);
    }
}

function addBox(position: THREE.Vector3, color: THREE.Color, name: string) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardNodeMaterial({
        color: color,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);
    mesh.name = name;
    scene.add(mesh);
    return mesh;
}

function addPlane() {
    const geo = new THREE.PlaneGeometry(10, 10);
    const mat = new THREE.MeshStandardNodeMaterial({
        color: new THREE.Color("#ffffff"),
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(0, 0, -1);
    scene.add(mesh);
}

/**
 * 创建巡检时设备上方展示的视频平面
 * 使用 HTMLVideoElement + VideoTexture 驱动，根据设备 deviceId 动态加载对应的 mp4 视频
 * 平面初始隐藏，巡检动画中按需显隐；每帧通过 animate 中的朝向更新实现广告牌效果
 */
function createVideoPlane() {
    // 创建隐藏的 video 元素，用于解码 mp4 视频流
    videoElement = document.createElement("video");
    videoElement.loop = true;
    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.crossOrigin = "anonymous";
    videoElement.style.display = "none";
    document.body.appendChild(videoElement);

    // 基于 video 元素创建视频纹理，用于驱动平面材质
    videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    // 创建视频平面网格，初始宽高默认 16:9，加载具体视频后通过 loadedmetadata 动态调整
    const geo = new THREE.PlaneGeometry(2, 1.125);
    const mat = new THREE.MeshBasicNodeMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        depthTest: false,
    });
    videoPlane = new THREE.Mesh(geo, mat);
    videoPlane.visible = false;
    videoPlane.renderOrder = 999;
    scene.add(videoPlane);
}

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let jump = false;
let down = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let target = new THREE.Vector3(),
    cameraTarget2 = {
        last: new THREE.Vector3(),
        current: new THREE.Vector3(),
    };
let firstExit = true;
const firstViewSpeed = 20;
/** 漫游模式键盘按下事件处理函数引用，用于 onUnmounted 时移除 document 级监听 */
let pointerLockKeyDown: ((event: KeyboardEvent) => void) | null = null;
/** 漫游模式键盘松开事件处理函数引用，用于 onUnmounted 时移除 document 级监听 */
let pointerLockKeyUp: ((event: KeyboardEvent) => void) | null = null;
/**第一人称视角移动时，监听前后帧视角偏移程度，防止退出时相机朝向偏移 */
function firstViewMoveWatcher() {
    const time = performance.now();
    if (pointerLockControls!.isLocked === true) {
        firstExit = true;
        const delta = (time - prevTime) / 1000;
        //如果时间步长大于0.25，则不进行移动，对于fps小于4的设备，这个功能将无法正常使用
        if (delta > 0.25) {
            prevTime = time;
            return;
        }

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= velocity.y * 10.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.y = Number(jump) - Number(down);
        direction.normalize(); // this ensures consistent movements in all directions

        // const speed = 20.0;
        if (moveForward || moveBackward)
            velocity.z -= direction.z * firstViewSpeed * delta;
        if (moveLeft || moveRight)
            velocity.x -= direction.x * firstViewSpeed * delta;
        if (jump || down) velocity.y -= direction.y * firstViewSpeed * delta;

        pointerLockControls!.moveRight(-velocity.x * delta);
        pointerLockControls!.moveForward(-velocity.z * delta);

        // console.log('velocity.y And delta', velocity.y, delta);
        // console.log('velocity.z And delta', velocity.z, delta);
        // console.log('velocity.x And delta', velocity.x, delta);
        pointerLockControls!.object.position.y += velocity.y * delta; // new behavior

        const cameraPosition = camera.position.clone();
        const vec = new THREE.Vector3();
        camera.getWorldDirection(vec);
        // console.log('vec', vec);
        target = cameraPosition.clone().add(vec);
        cameraTarget2.last = cameraTarget2.current.clone();
        cameraTarget2.current = target.clone();
        // console.log('current', cameraTarget2.current)
    } else if (!setttings.roaming && firstExit) {
        //防止退出时相机朝向偏移
        // const offset = Math.abs(cameraTarget2.last.angleTo(cameraTarget2.current))

        const cameraPosition = camera.position.clone();
        const vec = new THREE.Vector3();
        camera.getWorldDirection(vec);
        target = cameraPosition.clone().add(vec);
        const offset = Math.abs(target.angleTo(cameraTarget2.last));

        console.log("offset", offset, cameraTarget2.last);

        if (offset > 0.0001) {
            //视角纠正
            camera.lookAt(cameraTarget2.last);
        }

        firstExit = false;
    }

    prevTime = time;
}
function usePointerLockControls() {
    if (!pointerLockControls) {
        pointerLockControls = new PointerLockControls(
            camera,
            renderer.domElement,
        );
        scene.add(pointerLockControls.object);
    }

    const onKeyDown = function (event: KeyboardEvent) {
        switch (event.code) {
            case "ArrowUp":
            case "KeyW":
                moveForward = true;
                break;

            case "ArrowLeft":
            case "KeyA":
                moveLeft = true;
                break;

            case "ArrowDown":
            case "KeyS":
                moveBackward = true;
                break;

            case "ArrowRight":
            case "KeyD":
                moveRight = true;
                break;

            case "KeyQ":
                jump = true;
                break;
            case "KeyE":
                down = true;
                break;
        }
    };

    const onKeyUp = function (event: KeyboardEvent) {
        switch (event.code) {
            case "ArrowUp":
            case "KeyW":
                moveForward = false;
                break;

            case "ArrowLeft":
            case "KeyA":
                moveLeft = false;
                break;

            case "ArrowDown":
            case "KeyS":
                moveBackward = false;
                break;

            case "ArrowRight":
            case "KeyD":
                moveRight = false;
                break;
            case "KeyQ":
                jump = false;
                break;
            case "KeyE":
                down = false;
                break;
        }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    // 存储引用以便 onUnmounted 时移除
    pointerLockKeyDown = onKeyDown;
    pointerLockKeyUp = onKeyUp;
    startPointerLockControls();
}

function startPointerLockControls() {
    if (pointerLockControls && setttings.roaming) {
        pointerLockControls.lock();
    }
}

function listenerAboutPointerLockControlsClick(init: boolean) {
    if (!container.value) throw new Error("Cannot find container");
    if (init) {
        container.value.addEventListener("click", startPointerLockControls);
    } else {
        container.value.removeEventListener("click", startPointerLockControls);
    }
}

let normalDevices: THREE.Object3D[] = [],
    alarmDevices: THREE.Object3D[] = [];

const setttings = {
    roaming: false,
    showStatus: false,
    randomStatus: () => {
        const allDevices = [...normalDevices, ...alarmDevices];
        const newNormalDevices: THREE.Object3D[] = [],
            newAlarmDevices: THREE.Object3D[] = [];
        allDevices.forEach((device) => {
            const isNormal = Math.random() > 0.5;
            if (isNormal) newNormalDevices.push(device);
            else newAlarmDevices.push(device);
        });

        changeOutlinePass(newAlarmDevices, { color: "#ff0000" }, 1);
        changeOutlinePass(newNormalDevices, { color: highlightColor }, 0);
    },
    startRefreshTask: false,
};

/**添加GUI */
function addSettings() {
    const settingControls = inspector.createParameters("setting");
    settingControls
        .add(setttings, "roaming")
        .name("漫游模式")
        .onChange((val) => {
            orbitControls.enabled = !val;
            val && startPointerLockControls();
            if (!pointerLockControls) usePointerLockControls();
            else listenerAboutPointerLockControlsClick(val);
        });

    settingControls
        .add(setttings, "showStatus")
        .name("显示设备状态")
        .onChange((val) => {
            if (val) {
                changeOutlinePass(alarmDevices, { color: "#ff0000" }, 1);
                changeOutlinePass(normalDevices, { color: highlightColor }, 0);
            } else {
                recoverMaterial();
            }
        });

    settingControls.add(setttings, "randomStatus").name("随机修改设备状态");

    settingControls
        .add(setttings, "startRefreshTask")
        .name("随机刷新巡检任务")
        .onChange((val) => {
            if (val) startAutoRefresh();
            else stopAutoRefresh();
        });
}

onMounted(() => {
    init();
    const positions = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 2, 0),
        new THREE.Vector3(2, 0, 0),
    ];
    const colors = [
        new THREE.Color("#ff00ff"),
        new THREE.Color("#00ff00"),
        new THREE.Color("#0000ff"),
    ];

    for (let i = 0; i < MockData.deviceList.length; i++) {
        const device = MockData.deviceList[i];
        const model = addBox(positions[i], colors[i], device.deviceId);

        if (device.status === "alarm") {
            alarmDevices.push(model);
        } else if (device.status === "normal") {
            normalDevices.push(model);
        }
    }
    addPlane();
    createVideoPlane();
    addSettings();

    // 加载巡检任务数据
    loadTaskData();
    // 初始化 ECharts 图表（默认静态，通过 GUI "图表数据实时更新" 控制动态刷新）
    initPieChart();
    initBarChart();
});

onUnmounted(() => {
    // 停止渲染循环
    renderer.setAnimationLoop(null);

    // 终止所有动画时间线
    gsapTimeLine.kill();
    inspectionTimeline?.kill();

    // 停止定时任务
    stopAutoRefresh();

    // 移除容器 DOM 事件监听
    const el = container.value;
    if (el) {
        el.removeEventListener("dblclick", addRaycaster);
        el.removeEventListener("click", clickVideoPlaneToggle);
        el.removeEventListener("contextmenu", contextmenuEvent);
        el.removeEventListener("mousedown", onMouseDown);
        el.removeEventListener("mouseup", onMouseUp);
        el.removeEventListener("click", startPointerLockControls);
    }

    // 移除漫游模式的全局键盘监听
    if (pointerLockKeyDown)
        document.removeEventListener("keydown", pointerLockKeyDown);
    if (pointerLockKeyUp)
        document.removeEventListener("keyup", pointerLockKeyUp);

    // 销毁后处理管线与控制器
    composerApi?.dispose();
    orbitControls?.dispose();
    pointerLockControls?.unlock();
    pointerLockControls?.dispose();

    // 遍历场景，销毁网格的几何体、材质及其上的贴图纹理（含视频纹理）
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const mat = child.material as THREE.Material & {
                map?: THREE.Texture;
                envMap?: THREE.Texture;
            };
            mat.map?.dispose();
            mat.envMap?.dispose();
            mat.dispose();
        }
    });

    // 移除手动挂载到 document.body 的视频 DOM 元素
    videoElement?.remove();

    // 移除渲染器 canvas 并销毁渲染器
    renderer.domElement?.remove();
    renderer.dispose();

    // 销毁图表实例
    pieChartInstance?.dispose();
    barChartInstance?.dispose();
});
</script>
