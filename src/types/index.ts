import * as THREE from "three/webgpu";

/**
 * 单个 outlinePass 的配置项
 */
export type OutlinePassConfig = {
  /** 高亮颜色 */
  color?: string | number;
  /** 描边强度，默认 16 */
  edgeStrength?: number;
  /** 描边光晕，默认 1 */
  edgeGlow?: number;
  /** 描边厚度，默认 3 */
  edgeThickness?: number;
  /** 呼吸频率，默认 2，设为 0 关闭呼吸效果 */
  pulsePeriod?: number;
};

export type ComposerOptions = {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** 默认高亮颜色，会应用到所有未单独配置颜色的 outlinePass */
  highlightColor: string | number;
  outlinePassCount:number,
  /** 各个 outlinePass 的独立配置，数组长度决定 outlinePass 数量 */
  outlinePassConfigs?: OutlinePassConfig[];
};
