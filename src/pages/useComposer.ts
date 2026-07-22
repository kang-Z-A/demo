import { OutlinePassConfig, ComposerOptions } from "@/types/index";
import { pass, uniform, time, oscSine, add } from "three/tsl";
import { outline } from "three/addons/tsl/display/OutlineNode.js";
import * as THREE from "three/webgpu";

export function useComposerHook(options: ComposerOptions) {
    const {
        renderer,
        scene,
        camera,
        highlightColor,
        outlinePassConfigs = [{}],
        outlinePassCount = 1,
    } = options;

    // 根据配置数量或 outlinePassCount 确定实际数量
    const actualCount =
        outlinePassConfigs.length > 1
            ? outlinePassConfigs.length
            : outlinePassCount;

    // 存储所有 outlinePass 实例
    const outlinePasses: ReturnType<typeof outline>[] = [];
    // 存储所有 uniform 配置，方便后续动态修改
    const outlineUniforms: {
        edgeStrength: THREE.UniformNode<"float", number>;
        edgeGlow: THREE.UniformNode<"float", number>;
        edgeThickness: THREE.UniformNode<"float", number>;
        pulsePeriod: THREE.UniformNode<"float", number>;
        visibleEdgeColor: THREE.UniformNode<"color", THREE.Color>;
        hiddenEdgeColor: THREE.UniformNode<"color", THREE.Color>;
    }[] = [];

    // 创建多个 outlinePass
    for (let i = 0; i < actualCount; i++) {
        const config = outlinePassConfigs[i] || {};
        const color = config.color ?? highlightColor;

        // 创建当前 outlinePass 的 uniform 配置
        const uniforms = {
            edgeStrength: uniform(config.edgeStrength ?? 16.0),
            edgeGlow: uniform(config.edgeGlow ?? 1.0),
            edgeThickness: uniform(config.edgeThickness ?? 3.0),
            pulsePeriod: uniform(config.pulsePeriod ?? 2.0),
            visibleEdgeColor: uniform(new THREE.Color(color)),
            hiddenEdgeColor: uniform(new THREE.Color(color)),
        };

        outlineUniforms.push(uniforms);

        // 创建 outlinePass
        const outlinePass = outline(scene, camera, {
            edgeGlow: uniforms.edgeGlow,
            edgeThickness: uniforms.edgeThickness,
        });

        outlinePasses.push(outlinePass);
    }

    // 组合所有 outlinePass 的输出节点
    const buildOutlineNodes = () => {
        const outlineNodes: THREE.Node<"vec3">[] = [];

        for (let i = 0; i < outlinePasses.length; i++) {
            const outlinePass = outlinePasses[i];
            const uniforms = outlineUniforms[i];
            const { visibleEdge, hiddenEdge } = outlinePass;

            // 计算呼吸效果
            const period = time.div(uniforms.pulsePeriod).mul(2);
            const osc = oscSine(period).mul(0.5).add(0.5); // osc [ 0.5, 1.0 ]

            // 计算描边颜色
            const outlineColor = visibleEdge
                .mul(uniforms.visibleEdgeColor)
                .add(hiddenEdge.mul(uniforms.hiddenEdgeColor))
                .mul(uniforms.edgeStrength);

            // 根据 pulsePeriod 决定是否使用呼吸效果
            const outlinePulse = uniforms.pulsePeriod
                .greaterThan(0)
                .select(outlineColor.mul(osc), outlineColor);

            outlineNodes.push(outlinePulse);
        }

        return outlineNodes;
    };

    // 场景渲染通道
    const scenePass = pass(scene, camera).toInspector("Color");

    // 构建所有 outline 节点
    const outlineNodes = buildOutlineNodes();

    // 合并所有 outline 节点的输出
    let combinedOutline: THREE.Node<"vec3"> = outlineNodes[0];
    for (let i = 1; i < outlineNodes.length; i++) {
        combinedOutline = add(combinedOutline, outlineNodes[i]);
    }

    // 最终输出节点 = 所有 outline 效果 + 场景
    const outputNode = add(combinedOutline, scenePass);

    // 后处理
    const postProcessing = new THREE.RenderPipeline(renderer);
    postProcessing.outputNode = outputNode;

    /**
     * 更新某个 outlinePass 的配置
     * @param index outlinePass 索引
     * @param config 新的配置
     */
    function updateOutlineConfig(
        index: number,
        config: Partial<OutlinePassConfig>,
    ) {
        if (index < 0 || index >= outlineUniforms.length) {
            console.warn(`outlinePass index ${index} out of range`);
            return;
        }

        const uniforms = outlineUniforms[index];

        if (config.color !== undefined) {
            uniforms.visibleEdgeColor.value = new THREE.Color(config.color);
            uniforms.hiddenEdgeColor.value = new THREE.Color(config.color);
        }
        if (config.edgeStrength !== undefined) {
            uniforms.edgeStrength.value = config.edgeStrength;
        }
        if (config.edgeGlow !== undefined) {
            uniforms.edgeGlow.value = config.edgeGlow;
        }
        if (config.edgeThickness !== undefined) {
            uniforms.edgeThickness.value = config.edgeThickness;
        }
        if (config.pulsePeriod !== undefined) {
            uniforms.pulsePeriod.value = config.pulsePeriod;
        }
    }

    /**
     * 获取某个 outlinePass 的 selected 对象数组，用于设置需要高亮的物体
     * @param index outlinePass 索引
     */
    function getOutlinePassSelected(index: number) {
        if (index < 0 || index >= outlinePasses.length) {
            console.warn(`outlinePass index ${index} out of range`);
            return null;
        }
        return outlinePasses[index].selectedObjects;
    }

    function dispose() {
        postProcessing.dispose();
        outlinePasses.forEach((pass) => pass.dispose());
    }

    return {
        /** 所有 outlinePass 实例 */
        outlinePasses,
        /** 所有 outlinePass 的 uniform 配置 */
        outlineUniforms,
        /** 后处理实例 */
        postProcessing,
        /** 更新某个 outlinePass 的配置 */
        updateOutlineConfig,
        /** 获取某个 outlinePass 的 selectedObjects */
        getOutlinePassSelected,
        dispose,
    };
}
