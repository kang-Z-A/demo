<template>
    <div class="w-screen h-screen bg-black" ref="container"></div>
    <div class="absolute top-0 left-0">
        
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
            composerApi.outlinePasses.forEach((item) => {
                item.selectedObjects = [];
            });
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
        changeOutlinePass([object], {
            color: highlightColor,
        });
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
        const newNormalDevices: THREE.Object3D[] = [], newAlarmDevices: THREE.Object3D[] = [];
        allDevices.forEach(device => {
        const isNormal = Math.random() > 0.5
            if (isNormal) newNormalDevices.push(device)
            else newAlarmDevices.push(device)
        })

      changeOutlinePass(newAlarmDevices, { color: "#ff0000" }, 1);
      changeOutlinePass(newNormalDevices, { color: highlightColor }, 0);
    },
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

    settingControls.add(setttings, "randomStatus")
        .name("随机修改设备状态")
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
    addSettings();
});
</script>
