<script setup lang="ts">
import type * as THREE_NS from 'three'

// 地台圆片 GLSL 着色器（Vite ?raw 导入，源码见 app/assets/shaders/disc/）
import discVertex from '~/assets/shaders/disc/disc.vert?raw'
import discFragMagic from '~/assets/shaders/disc/magic.frag?raw'
import discFragLines from '~/assets/shaders/disc/lines.frag?raw'
import discFragGalaxy from '~/assets/shaders/disc/galaxy.frag?raw'
import discFragAurora from '~/assets/shaders/disc/aurora.frag?raw'

// ============ 事件与数据 ============
const emit = defineEmits<{ close: [] }>()

interface ModelInfo {
  id: string
  name: string
  nameJp: string
  desc: string
  path: string
  author: string // CC-BY 许可要求署名
  source: string
}

// public/model 下的 glTF 模型（Sketchfab，CC-BY-4.0）
const models: ModelInfo[] = [
  {
    id: 'nagisa',
    name: '古河渚',
    nameJp: '古河渚',
    desc: '《CLANNAD》女主角，"团子大家族"',
    path: '/model/nagisa/scene.gltf',
    author: 'Kuroneko Labs',
    source:
      'https://sketchfab.com/3d-models/clannad-furukawa-nagisa-428437e8f1c74fb994269729ec1a1bc6',
  },
  {
    id: 'going-merry',
    name: '黄金梅丽号',
    nameJp: 'ゴーイング・メリー',
    desc: '《海贼王》草帽一伙的第一艘海贼船',
    path: '/model/going_merry_one_piece/scene.gltf',
    author: 'RadhruinT',
    source: 'https://sketchfab.com/3d-models/going-merry-one-piece-8cf214627e02411387d4df4b815ef28d',
  },
  {
    id: 'one-piece-logo',
    name: '海贼王标志',
    nameJp: 'ONE PIECE',
    desc: '《海贼王》经典骷髅标志',
    path: '/model/one_piece_logo/scene.gltf',
    author: 'eriklys',
    source: 'https://sketchfab.com/3d-models/one-piece-logo-dd8815b7dba6496daac409b036c9e980',
  },
]

const view = ref<'menu' | 'viewer'>('menu') // 模型库 / 查看器 分离
const currentId = ref('')
const loading = ref(false)
const loadError = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const current = computed(() => models.find((m) => m.id === currentId.value))

let cleanupViewer: (() => void) | null = null

// 进入查看器
async function openModel(id: string) {
  cleanupViewer?.() // 切模型时先释放上一个场景
  cleanupViewer = null
  currentId.value = id
  view.value = 'viewer'
  loading.value = true
  loadError.value = false
  await nextTick() // 等待 canvas 挂载
  await initViewer()
}

// 返回模型库
function backToMenu() {
  cleanupViewer?.()
  cleanupViewer = null
  view.value = 'menu'
}

// Esc：查看器返回模型库，模型库关闭场景
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (view.value === 'viewer') backToMenu()
    else emit('close')
  }
}

// ---------- 地台圆片着色器：每次打开查看器随机一种 GLSL 动画 ----------
// 着色器源码抽离至 app/assets/shaders/disc/，通过 ?raw 导入为字符串
// 1. 旋转魔法阵（圆环 + 辐射线 + 方阵 + 三角，分层层正反转）
// 2. 流动光线（正弦波动亮线叠加，青 -> 品红渐变）
// 3. 螺旋星云（双旋臂 + 核心辉光 + 闪烁星点）
// 4. 极光涟漪（同心扩散波纹 + 旋转极光弧带）
const DISC_FRAGMENTS = [discFragMagic, discFragLines, discFragGalaxy, discFragAurora]

let prevHtmlOverflow = '' // 进入前的页面滚动状态
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // 锁定底层 about 页面滚动：滚轮留给查看器缩放
  prevHtmlOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = prevHtmlOverflow
  cleanupViewer?.()
})

// ============ Three.js 查看器 ============
async function initViewer() {
  if (!canvasRef.value || !current.value) return
  const THREE: typeof THREE_NS = await import('three')
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')

  const BG_COLOR = 0x050508
  const ACCENT = 0x22d3ee // 动漫章节配色（青）

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BG_COLOR)
  scene.fog = new THREE.Fog(BG_COLOR, 12, 30)

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(2.6, 1.8, 3.4)

  const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // ---------- 灯光：主光 + 青色轮廓光 + 环境光 ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.85))
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
  keyLight.position.set(3, 5, 4)
  scene.add(keyLight)
  const rimLight = new THREE.DirectionalLight(ACCENT, 1.4)
  rimLight.position.set(-4, 2, -3)
  scene.add(rimLight)

  // ---------- 地台：网格 + 柔光圈，让模型"站"在展台上 ----------
  const grid = new THREE.GridHelper(10, 20, ACCENT, 0x1a2a33)
  ;(grid.material as THREE_NS.Material).transparent = true
  ;(grid.material as THREE_NS.Material).opacity = 0.35
  grid.position.y = -1.6
  scene.add(grid)
  // 地台圆片：随机一种 GLSL 动画着色器
  // color 仅魔法阵着色器使用（中心主题色），其余着色器忽略该 uniform
  const discUniforms = { iTime: { value: 0 }, color: { value: new THREE.Color(ACCENT) } }
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 48),
    new THREE.ShaderMaterial({
      uniforms: discUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: discVertex,
      fragmentShader: DISC_FRAGMENTS[Math.floor(Math.random() * DISC_FRAGMENTS.length)]!,
    }),
  )
  disc.rotation.x = -Math.PI / 2
  disc.position.y = -1.59
  scene.add(disc)

  // ---------- 轨道控制：旋转 + 缩放（查看器内滚轮/双指用于缩放） ----------
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.autoRotate = true // 缓慢自转，展示模型
  controls.autoRotateSpeed = 1.2
  controls.minDistance = 2
  controls.maxDistance = 10
  controls.maxPolarAngle = 1.65 // 不允许钻到地台下方
  controls.target.set(0, 0, 0)

  // ---------- 加载 glTF 模型 ----------
  const loader = new GLTFLoader()
  loader.load(
    current.value.path,
    (gltf) => {
      const model = gltf.scene
      // 归一化：按包围盒居中并缩放到统一展示尺寸
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      model.scale.setScalar(2.6 / maxDim)
      box.setFromObject(model)
      const center = box.getCenter(new THREE.Vector3())
      model.position.sub(center) // 几何中心移到原点
      scene.add(model)
      loading.value = false
    },
    undefined,
    () => {
      loading.value = false
      loadError.value = true
    },
  )

  // ---------- 渲染循环 ----------
  const startTime = performance.now()
  let rafId = 0
  function animate() {
    rafId = requestAnimationFrame(animate)
    discUniforms.iTime.value = (performance.now() - startTime) / 1000 // 驱动地台动画
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  cleanupViewer = () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    controls.dispose()
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of mats) {
          // glTF 材质可能带贴图，一并释放
          const mat = m as THREE_NS.MeshStandardMaterial
          mat.map?.dispose()
          mat.dispose()
        }
      }
    })
    renderer.dispose()
  }
}
</script>

<template>
  <div class="anime-scene">
    <!-- 顶部栏 -->
    <header class="scene-header">
      <button v-if="view === 'viewer'" type="button" class="close-btn" @click="backToMenu">
        <span class="close-arrow">←</span> 模型库
      </button>
      <button v-else type="button" class="close-btn" @click="emit('close')">
        <span class="close-arrow">←</span> 返回
      </button>
      <div class="header-right">
        <div class="scene-title">
          <span class="title-jp">アニメ</span>
          <span class="title-zh">{{ view === 'menu' ? '模型库' : current?.name }}</span>
        </div>
        <!-- 场景遮罩会盖住 about 页的返回首页按钮，这里补一个入口 -->
        <NuxtLink to="/" class="home-link" aria-label="返回首页">首页</NuxtLink>
      </div>
    </header>

    <!-- 模型库：居中的模型菜单 -->
    <transition name="fade">
      <nav v-if="view === 'menu'" class="model-menu" aria-label="模型库">
        <button
          v-for="(model, i) in models"
          :key="model.id"
          type="button"
          class="model-item"
          :style="{ transitionDelay: `${i * 80}ms` }"
          @click="openModel(model.id)"
        >
          <span class="model-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="model-main">
            <span class="model-name">{{ model.name }}</span>
            <span class="model-desc">{{ model.desc }}</span>
          </span>
          <span class="model-jp">{{ model.nameJp }}</span>
        </button>
        <!-- CC-BY 许可署名 -->
        <p class="model-credit">模型来自 Sketchfab，CC-BY-4.0 许可，作者信息见查看器左下角</p>
      </nav>
    </transition>

    <!-- 查看器 -->
    <template v-if="view === 'viewer'">
      <canvas ref="canvasRef" class="scene-canvas" />
      <transition name="fade">
        <p v-if="loading" class="viewer-tip">模型加载中…</p>
        <p v-else-if="loadError" class="viewer-tip">模型加载失败，请稍后重试</p>
      </transition>
      <!-- CC-BY 署名 -->
      <a
        v-if="current"
        class="model-author"
        :href="current.source"
        target="_blank"
        rel="noopener noreferrer"
      >
        「{{ current.name }}」 by {{ current.author }} · CC-BY-4.0
      </a>
      <p class="viewer-hint">拖拽旋转 · 滚轮 / 双指缩放</p>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.anime-scene {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #050508;
  overflow: hidden;
}

.scene-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* ---------- 顶部栏 ---------- */
.scene-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
}

.close-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  background: rgb(0 0 0 / 55%);
  backdrop-filter: blur(12px);
  color: rgb(255 255 255 / 75%);
  font-size: 14px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    color: #fff;
    border-color: rgb(255 255 255 / 60%);
    box-shadow: 0 0 16px rgb(255 255 255 / 18%);

    .close-arrow {
      transform: translateX(-3px);
    }
  }
}

.close-arrow {
  transition: transform 0.2s;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.scene-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  color: #fff;
}

.title-jp {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.2em;
}

.title-zh {
  font-size: 13px;
  letter-spacing: 0.35em;
  color: rgb(255 255 255 / 50%);

  @media (max-width: 640px) {
    display: none;
  }
}

.home-link {
  padding: 6px 14px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  background: rgb(0 0 0 / 55%);
  backdrop-filter: blur(12px);
  color: rgb(255 255 255 / 60%);
  font-size: 13px;
  letter-spacing: 0.15em;
  text-decoration: none;
  transition: color 0.2s, border-color 0.2s;

  @media (hover: hover) {
    &:hover {
      color: #fff;
      border-color: rgb(255 255 255 / 60%);
    }
  }
}

/* ---------- 模型库菜单 ---------- */
.model-menu {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 80px 24px 60px;
  overflow-y: auto;

  // 内容少时居中、内容多时可完整滚动
  &::before,
  &::after {
    content: '';
    display: block;
    margin: auto;
  }

  @media (max-width: 640px) {
    padding: 72px 14px 48px;
  }
}

.model-item {
  display: flex;
  align-items: center;
  gap: 18px;
  width: min(620px, 92vw);
  padding: 20px 28px;
  border: none;
  border-bottom: 1px solid rgb(255 255 255 / 12%);
  background: transparent;
  text-align: left;
  cursor: pointer;
  animation: item-in 0.6s ease both;
  transition:
    opacity 0.4s ease,
    transform 0.4s ease,
    border-color 0.25s;

  @media (hover: hover) {
    &:hover {
      border-bottom-color: rgb(34 211 238 / 70%);
      transform: translateX(8px);

      .model-name {
        color: #fff;
        letter-spacing: 0.12em;
      }
    }
  }

  @media (max-width: 640px) {
    width: 100%;
    padding: 16px 14px;
    gap: 12px;
  }
}

@keyframes item-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.model-no {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: rgb(255 255 255 / 35%);
  letter-spacing: 0.1em;
}

.model-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.model-name {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgb(255 255 255 / 88%);
  transition:
    color 0.25s,
    letter-spacing 0.35s ease;

  @media (max-width: 640px) {
    font-size: 18px;
  }
}

.model-desc {
  font-size: 13px;
  color: rgb(255 255 255 / 42%);
}

.model-jp {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  letter-spacing: 0.15em;
  color: rgb(34 211 238 / 60%);

  @media (max-width: 640px) {
    display: none; // 小屏空间留给中文名
  }
}

.model-credit {
  margin-top: 24px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgb(255 255 255 / 30%);
}

/* ---------- 查看器 ---------- */
.viewer-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  transform: translate(-50%, -50%);
  color: rgb(255 255 255 / 55%);
  font-size: 14px;
  letter-spacing: 0.3em;
  pointer-events: none;
}

.model-author {
  position: absolute;
  left: 16px;
  bottom: 14px;
  z-index: 2;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: rgb(255 255 255 / 35%);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: rgb(34 211 238 / 80%);
  }
}

.viewer-hint {
  position: absolute;
  bottom: 14px;
  left: 50%;
  z-index: 2;
  transform: translateX(-50%);
  font-size: 12px;
  letter-spacing: 0.3em;
  color: rgb(255 255 255 / 30%);
  pointer-events: none;
  white-space: nowrap;
}

/* ---------- 过场 ---------- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
