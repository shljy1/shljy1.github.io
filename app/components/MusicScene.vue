<script setup lang="ts">
import type * as THREE_NS from 'three'

// 场景 GLSL 着色器（Vite ?raw 导入，源码见 app/assets/shaders/scene/）
import skyVertex from '~/assets/shaders/scene/sky.vert?raw'
import skyFragment from '~/assets/shaders/scene/sky.frag?raw'
import gridVertex from '~/assets/shaders/scene/grid.vert?raw'
import gridFragment from '~/assets/shaders/scene/grid.frag?raw'
import dustVertex from '~/assets/shaders/scene/dust.vert?raw'
import dustFragment from '~/assets/shaders/scene/dust.frag?raw'
import linesVertex from '~/assets/shaders/scene/lines.vert?raw'
import linesFragment from '~/assets/shaders/scene/lines.frag?raw'

// ============ 事件与数据 ============
const emit = defineEmits<{ close: [] }>()

interface LyricLine {
  jp: string
  romaji: string
  zh?: string
}
interface Song {
  id: string
  title: string
  titleJp: string
  artist: string
  lyrics: LyricLine[]
}

const songs = ref<Song[]>([])
const currentId = ref('')
const loading = ref(true)
const view = ref<'menu' | 'lyrics'>('menu') // 歌单页 / 歌词页 分离
const canvasRef = ref<HTMLCanvasElement | null>(null)
const lyricsRef = ref<HTMLElement | null>(null)

const current = computed(() => songs.value.find((s) => s.id === currentId.value))

// 进入歌词页
function selectSong(id: string) {
  currentId.value = id
  view.value = 'lyrics'
  nextTick(() => lyricsRef.value?.scrollTo({ top: 0 }))
}

// 返回歌单页
function backToMenu() {
  view.value = 'menu'
}

// ---------- 假名注音解析：漢字（かな）/ 漢字(かな) -> ruby 片段 ----------
interface RubySeg {
  text: string
  ruby?: string
}
function parseJp(text: string): RubySeg[] {
  const segs: RubySeg[] = []
  // 兼容全角（）与半角 () 注音
  const re = /([^\s（）()]+)[(（]([^（）()]+)[)）]/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) })
    segs.push({ text: m[1]!, ruby: m[2]! })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ text: text.slice(last) })
  return segs
}

// Esc：歌词页返回歌单，歌单页关闭场景
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (view.value === 'lyrics') backToMenu()
    else emit('close')
  }
}

// ============ Three.js 场景 ============
let cleanupScene: (() => void) | null = null
let prevHtmlOverflow = '' // 进入前的页面滚动状态
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = prevHtmlOverflow // 还原页面滚动
  cleanupScene?.()
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)

  // 锁定底层 about 页面滚动：滚轮不再驱动章节相机
  prevHtmlOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'

  // 拉取歌单（由 public/music/*.txt 转成的 JSON）
  try {
    const data = await $fetch<Song[]>('/music/songs.json')
    songs.value = data
  } finally {
    loading.value = false
  }

  if (!canvasRef.value) return
  const THREE: typeof THREE_NS = await import('three')
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')

  // ---------- 基础场景 ----------
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x030303, 20, 90)

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300)
  camera.position.set(0, 2.2, 9)

  const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // 慢速自动旋转 + 可拖拽，营造"漫游"感
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.6, -8)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = false
  controls.enableZoom = false
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.35
  controls.minPolarAngle = 0.7 // 限制俯仰，保持在地平线附近
  controls.maxPolarAngle = 1.62

  // ============================================================
  // 自定义着色器 1：水墨云雾天空球（FBM 噪声，黑白灰）
  // GLSL 源码见 app/assets/shaders/scene/sky.{vert,frag}
  // ============================================================
  const skyUniforms = {
    uTime: { value: 0 },
    uDim: { value: 1 }, // 歌词页压暗天空，便于阅读
    uStars: { value: 0 }, // 歌词页切换为星空（0=水墨云雾，1=星空）
  }
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, // 从球体内部看
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 48, 32), skyMat)
  scene.add(sky)

  // ============================================================
  // 自定义着色器 2：向前飞驰的白线网格地面（漫游速度感）
  // GLSL 源码见 app/assets/shaders/scene/grid.{vert,frag}
  // ============================================================
  const gridUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 }, // 歌词页淡出网格
  }
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: gridUniforms,
    vertexShader: gridVertex,
    fragmentShader: gridFragment,
  })
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), gridMat)
  grid.rotation.x = -Math.PI / 2
  grid.position.y = -1.5
  scene.add(grid)

  // ============================================================
  // 自定义着色器 3：迎面飞过的白色尘埃（顶点着色器驱动）
  // GLSL 源码见 app/assets/shaders/scene/dust.{vert,frag}
  // ============================================================
  const DUST_COUNT = 600
  const dustPos = new Float32Array(DUST_COUNT * 3)
  const dustSeed = new Float32Array(DUST_COUNT)
  for (let i = 0; i < DUST_COUNT; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 60
    dustPos[i * 3 + 1] = Math.random() * 18 - 1
    dustPos[i * 3 + 2] = Math.random() * 80 // 初始深度，着色器中滚动
    dustSeed[i] = Math.random()
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(dustSeed, 1))
  const dustUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uOpacity: { value: 1 }, // 歌词页淡出尘埃
  }
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: dustUniforms,
    vertexShader: dustVertex,
    fragmentShader: dustFragment,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  scene.add(dust)

  // ============================================================
  // 自定义着色器 4：流动光线（歌词页专属）
  // 参考 Shadertoy 流动线条：6 条正弦波动的亮线叠加。
  // 置于左右两侧的竖直平面上（纵向流动），不占文字后方，
  // 避免干扰阅读；窄屏（手机）自然超出视野，不会遮挡歌词
  // GLSL 源码见 app/assets/shaders/scene/lines.{vert,frag}
  // ============================================================

  // 左右两侧各一块竖直平面。
  // 挂到相机上：相机自动旋转时平面同步跟随，屏幕上看似静止，
  // 不会像背景板一样持续向一侧偏移
  const linesHolder = new THREE.Group()
  camera.add(linesHolder)
  scene.add(camera) // 相机子节点需要相机加入场景才会被渲染
  const linesUniformSets: { uTime: { value: number }; uOpacity: { value: number } }[] = []
  const makeSideLines = (x: number, phase: number) => {
    const uniforms = {
      uTime: { value: 0 },
      uOpacity: { value: 0 }, // 歌单页隐藏，进入歌词页淡入
      uPhase: { value: phase },
    }
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
      vertexShader: linesVertex,
      fragmentShader: linesFragment,
    })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(12, 44), mat)
    // 相机坐标系：z=-23 为视距，x=±18 落在屏幕两侧（窄屏自然出画）
    mesh.position.set(x, 0, -23)
    linesHolder.add(mesh)
    linesUniformSets.push(uniforms)
  }
  makeSideLines(-18, 0.0)
  makeSideLines(18, 2.4)

  // ---------- 渲染循环 ----------
  const startTime = performance.now()
  let rafId = 0
  // uniform 向目标值平滑过渡
  const lerpTo = (u: { value: number }, target: number) => {
    u.value += (target - u.value) * 0.06
  }
  function animate() {
    rafId = requestAnimationFrame(animate)
    const t = (performance.now() - startTime) / 1000
    skyUniforms.uTime.value = t
    gridUniforms.uTime.value = t
    dustUniforms.uTime.value = t
    for (const u of linesUniformSets) u.uTime.value = t

    // 歌单页 = 云雾 + 网格 + 尘埃；歌词页 = 星空 + 两侧流动光线 + 压暗天空
    const inMenu = view.value === 'menu'
    lerpTo(gridUniforms.uOpacity, inMenu ? 1 : 0)
    lerpTo(dustUniforms.uOpacity, inMenu ? 1 : 0)
    for (const u of linesUniformSets) lerpTo(u.uOpacity, inMenu ? 0 : 1)
    lerpTo(skyUniforms.uStars, inMenu ? 0 : 1)
    lerpTo(skyUniforms.uDim, inMenu ? 1 : 0.5)

    controls.update() // 自动旋转 + 阻尼
    renderer.render(scene, camera)
  }
  animate()

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  cleanupScene = () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    controls.dispose()
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose()
        ;(obj.material as THREE_NS.Material).dispose()
      }
    })
    renderer.dispose()
  }
})
</script>

<template>
  <div class="music-scene">
    <!-- 3D 漫游画布 -->
    <canvas ref="canvasRef" class="scene-canvas" />

    <!-- 顶部栏 -->
    <header class="scene-header">
      <button v-if="view === 'lyrics'" type="button" class="close-btn" @click="backToMenu">
        <span class="close-arrow">←</span> 歌单
      </button>
      <button v-else type="button" class="close-btn" @click="emit('close')">
        <span class="close-arrow">←</span> 返回
      </button>
      <div class="header-right">
        <div class="scene-title">
          <span class="title-jp">音楽</span>
          <span class="title-zh">{{ view === 'menu' ? '歌单' : current?.titleJp }}</span>
        </div>
        <!-- 场景遮罩会盖住 about 页的返回首页按钮，这里补一个入口 -->
        <NuxtLink to="/" class="home-link" aria-label="返回首页">首页</NuxtLink>
      </div>
    </header>

    <!-- 歌单页：居中的歌名菜单 -->
    <transition name="fade">
      <nav v-if="view === 'menu'" class="song-menu" aria-label="歌单">
        <p v-if="loading" class="menu-loading">加载中…</p>
        <button
          v-for="(song, i) in songs"
          :key="song.id"
          type="button"
          class="song-item"
          :style="{ transitionDelay: `${i * 80}ms` }"
          @click="selectSong(song.id)"
        >
          <span class="song-no">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="song-title-jp">{{ song.titleJp }}</span>
          <span class="song-divider" />
          <span class="song-artist">{{ song.artist }}</span>
        </button>
      </nav>
    </transition>

    <!-- 歌词页 -->
    <transition name="fade">
      <section v-if="view === 'lyrics' && current" ref="lyricsRef" class="lyrics-panel">
        <h2 class="lyrics-heading">
          <ruby
            >{{ current.titleJp }}<rt>{{ current.title }}</rt></ruby
          >
        </h2>
        <p class="lyrics-artist">{{ current.artist }}</p>
        <div class="lyrics-divider" />
        <div v-for="(line, i) in current.lyrics" :key="i" class="lyric-line">
          <!-- 日语原文（带假名注音 ruby），纯罗马音歌曲无此行 -->
          <p v-if="line.jp" class="line-jp">
            <template v-for="(seg, j) in parseJp(line.jp)" :key="j">
              <ruby v-if="seg.ruby"
                >{{ seg.text }}<rt>{{ seg.ruby }}</rt></ruby
              >
              <span v-else>{{ seg.text }}</span>
            </template>
          </p>
          <p v-if="line.romaji" class="line-romaji" :class="{ 'line-primary': !line.jp }">
            {{ line.romaji }}
          </p>
          <p v-if="line.zh" class="line-zh">{{ line.zh }}</p>
        </div>
        <div class="lyrics-end">◆</div>
      </section>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
.music-scene {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #030303;
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
  z-index: 3; // 高于菜单/歌词层，保证按钮可点
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
    display: none; // 手机端顶部栏空间紧张，隐藏副标题
  }
}

// 返回首页入口：与关闭按钮同款的小胶囊
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

/* ---------- 歌单页：居中菜单 ---------- */
.song-menu {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 80px 24px 60px;
  overflow-y: auto;
  pointer-events: none; // 容器不拦截点击/拖拽，仅按钮可点

  // 歌曲超过一屏时：justify-content: center 会把顶部条目裁掉且无法滚动到，
  // 改用首尾 auto 外边距实现"内容少时居中、内容多时可完整滚动"
  &::before,
  &::after {
    content: '';
    display: block;
    margin: auto;
  }

  // 手机端：容器恢复接收触摸，否则 gap/空白处触摸穿透到画布，
  // 被 OrbitControls 拦截导致列表无法滑动
  @media (pointer: coarse) {
    pointer-events: auto;
    touch-action: pan-y; // 只允许纵向滚动手势
  }

  @media (max-width: 640px) {
    padding: 72px 12px 48px; // 收窄侧边距，把宽度留给歌名
    gap: 2px;
  }
}

.menu-loading {
  color: rgb(255 255 255 / 45%);
  letter-spacing: 0.3em;
}

.song-item {
  display: flex;
  align-items: baseline;
  gap: 18px;
  width: min(680px, 92vw); // 放宽行宽，容纳长歌名
  padding: 18px 28px;
  border: none;
  border-bottom: 1px solid rgb(255 255 255 / 12%);
  background: transparent;
  cursor: pointer;
  pointer-events: auto; // 容器穿透后恢复按钮可点
  transition:
    opacity 0.4s ease,
    transform 0.4s ease,
    border-color 0.25s;

  // 入场依次浮现
  animation: item-in 0.6s ease both;

  // 仅支持悬停的设备启用（触屏点按会残留 hover 态）
  @media (hover: hover) {
    &:hover {
      border-bottom-color: rgb(255 255 255 / 70%);
      transform: translateX(8px);

      .song-title-jp {
        color: #fff;
        letter-spacing: 0.16em;
      }
    }
  }

  // ---------- 手机端适配 ----------
  @media (max-width: 640px) {
    width: 100%;
    padding: 13px 14px;
    gap: 10px;
    flex-wrap: wrap; // 歌手名放不下时折到第二行
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

.song-no {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: rgb(255 255 255 / 35%);
  letter-spacing: 0.1em;

  @media (max-width: 640px) {
    font-size: 11px;
  }
}

.song-title-jp {
  min-width: 0; // 允许在 flex 中收缩换行
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1.5;
  color: rgb(255 255 255 / 85%);
  transition:
    color 0.25s,
    letter-spacing 0.35s ease;

  @media (max-width: 640px) {
    font-size: 18px;
    letter-spacing: 0.04em; // 小屏收窄字距，长歌名更易放下
  }
}

.song-divider {
  flex: 1 0 12px; // 长标题换行时分隔仍占位

  @media (max-width: 640px) {
    display: none; // 手机端歌手名折行，不再需要弹性分隔
  }
}

.song-artist {
  flex-shrink: 0; // 歌手名不收缩、不换行
  font-size: 12px;
  letter-spacing: 0.1em;
  white-space: nowrap;
  color: rgb(255 255 255 / 40%);

  @media (max-width: 640px) {
    flex-basis: 100%; // 独占第二行
    font-size: 11px;
  }
}

/* ---------- 歌词页 ---------- */
.lyrics-panel {
  position: absolute;
  inset: 0;
  z-index: 1;
  margin: 0 auto;
  width: min(620px, 88vw);
  padding: 100px 24px 90px;
  overflow-y: auto;
  text-align: center;
  mask-image: linear-gradient(to bottom, transparent, #000 8%, #000 90%, transparent);

  // 隐藏滚动条
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.lyrics-heading {
  font-size: 30px;
  letter-spacing: 0.12em;
  color: #fff;

  rt {
    font-size: 13px;
    letter-spacing: 0.3em;
    color: rgb(255 255 255 / 45%);
  }
}

.lyrics-artist {
  margin-top: 8px;
  font-size: 13px;
  letter-spacing: 0.3em;
  color: rgb(255 255 255 / 45%);
}

.lyrics-divider {
  width: 32px;
  height: 1px;
  margin: 28px auto 0;
  background: rgb(255 255 255 / 35%);
}

.lyric-line {
  margin-top: 36px;
}

.line-jp {
  font-size: 21px;
  line-height: 2;
  color: rgb(255 255 255 / 95%);

  ruby {
    ruby-align: center;
  }

  rt {
    font-size: 10px;
    color: rgb(255 255 255 / 50%);
    transform: translateY(-2px);
  }
}

.line-romaji {
  margin-top: 2px;
  font-size: 13px;
  font-style: italic;
  color: rgb(255 255 255 / 38%);
}

// 无日语原文时，罗马音升为主行
.line-primary {
  font-size: 19px;
  font-style: normal;
  line-height: 2;
  color: rgb(255 255 255 / 90%);
}

.line-zh {
  margin-top: 5px;
  font-size: 14px;
  color: rgb(255 255 255 / 55%);
}

.lyrics-end {
  margin-top: 48px;
  font-size: 12px;
  color: rgb(255 255 255 / 30%);
}

/* ---------- 底部提示 ---------- */
.scene-hint {
  position: absolute;
  bottom: 18px;
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
