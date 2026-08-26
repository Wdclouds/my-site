// Nova FM 3D 场景就绪状态（MusicView 海报遮罩与 PanoramaSphere 共用）
import { reactive } from 'vue'

export const novaStatus = reactive({
  ready: false, // 车舱已加载并完成首帧编译
})