<template>
    <div class="w-screen h-screen bg-black" ref="container"></div>
</template>
<script setup lang="ts">
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { pass, uniform, time, oscSine } from "three/tsl";
import { outline } from "three/addons/tsl/display/OutlineNode.js";
import { gsap } from "gsap";
import { Inspector } from "three/examples/jsm/inspector/Inspector.js";

const container = useTemplateRef<HTMLDivElement>("container");
const scene = new THREE.Scene();
const renderer = new THREE.WebGPURenderer({
    antialias: true,
    alpha: true,
    logarithmicDepthBuffer: true,
});
let camera: THREE.PerspectiveCamera;
let orbitControls: OrbitControls;
let inspector: Inspector;

const highlightColor = "#00ff00";
/**后处理模块 */
function useComposerHook() {
    const edgeStrength = uniform(16.0);
    const edgeGlow = uniform(1.0);
    const edgeThickness = uniform(3.0);
    const pulsePeriod = uniform(2.0);
    const visibleEdgeColor = uniform(new THREE.Color(highlightColor));
    const hiddenEdgeColor = uniform(new THREE.Color(highlightColor));

    let outlinePass = outline(scene, camera, {
        edgeGlow,
        edgeThickness,
    });
    const { visibleEdge, hiddenEdge } = outlinePass;

    const period = time.div(pulsePeriod).mul(2);
    const osc = oscSine(period).mul(0.5).add(0.5); // osc [ 0.5, 1.0 ]

    const outlineColor = visibleEdge
        .mul(visibleEdgeColor)
        .add(hiddenEdge.mul(hiddenEdgeColor))
        .mul(edgeStrength);
    const outlinePulse = pulsePeriod
        .greaterThan(0)
        .select(outlineColor.mul(osc), outlineColor);

    // postprocessing
    const scenePass = pass(scene, camera).toInspector("Color");

    const renderPipeline = new THREE.RenderPipeline(renderer);
    renderPipeline.outputNode = outlinePulse.add(scenePass);

    return {
        outlinePass,
        renderPipeline,
    };
}
let composerApi: ReturnType<typeof useComposerHook>;

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
function contextmenuEvent(event: MouseEvent) {
    event.preventDefault();
    if (Math.abs(afterX - beforeX) > 2 || Math.abs(afterY - beforeY) > 2)
        return;
    return recoverMaterial();
}

const recoverMaterial = (includeOutline: boolean = false) => {
    if (!includeOutline) {
        //清除高亮描边
        if (composerApi) {
            composerApi.outlinePass.selectedObjects = [];
        }
    }
};

function addEventListeners() {
    if (!container.value) return;
    container.value.addEventListener("dblclick", addRaycaster);
    container.value.addEventListener("contextmenu", contextmenuEvent);
    //控制拖拽时不触发点击事件
    container.value.addEventListener("mousedown", (e: MouseEvent) => {
        [beforeX, beforeY] = [e.offsetX, e.offsetY];
    });
    container.value.addEventListener("mouseup", (e: MouseEvent) => {
        [afterX, afterY] = [e.offsetX, e.offsetY];
    });
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
        const pos2 = pos.clone().add(unitVector.multiplyScalar(-3));

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

function highlightObject(object: THREE.Object3D) {
    if (composerApi) {
        composerApi.outlinePass.selectedObjects = [object];
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

    orbitControls = new OrbitControls(camera, container.value);
    orbitControls.enableDamping = false;

    addLight();
    composerApi = useComposerHook();

    addEventListeners();

    renderer.setAnimationLoop(animate);
}

function animate() {
    camera.updateProjectionMatrix();
    orbitControls?.update();

    if (composerApi) {
        composerApi.renderPipeline.render();
    } else {
        renderer.render(scene, camera);
    }
}

function addBox() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardNodeMaterial({
        color: new THREE.Color("#ff00ff"),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(0, 0, 0);
    scene.add(mesh);
}

function addPlane() {
    const geo = new THREE.PlaneGeometry(10, 10);
    const mat = new THREE.MeshStandardNodeMaterial({
        color: new THREE.Color("#ffffff"),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(0, 0, -1);
    scene.add(mesh);
}

const roamingParams = {
    enable: false,
};

/**添加漫游模式 */
function addRoaming() {
    const roamingControls = inspector.createParameters("漫游模式");
    roamingControls
        .add(roamingParams, "enable")
        .name("是否开启")
        .onChange((val) => {
            orbitControls.enabled = !val;
            console.log("设置后 enabled:", orbitControls.enabled);
        });
}

onMounted(() => {
    init();
    addBox();
    addPlane();
    addRoaming();
});
</script>
<style></style>
