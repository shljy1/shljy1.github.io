<script setup lang="ts">
import type * as THREE_NS from 'three'

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
  // ============================================================
  const skyUniforms = {
    uTime: { value: 0 },
    uDim: { value: 1 }, // 歌词页压暗天空，便于阅读
  }
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, // 从球体内部看
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position; // 球面方向即采样方向
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uDim;
      varying vec3 vDir;

      // 经典 hash / noise / fbm
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = p * 2.0 + vec2(100.0);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vDir);

        // 纯黑底色，地平线处微微提亮
        float base = mix(0.045, 0.0, smoothstep(0.0, 0.55, dir.y));

        // 云雾：中低纬度缓慢流动的 FBM，黑白灰如宣纸上的墨
        float band = smoothstep(0.02, 0.2, dir.y) * smoothstep(0.8, 0.3, dir.y);
        float flow = fbm(vec2(dir.x * 2.6 + uTime * 0.045, dir.y * 6.0 - uTime * 0.07));
        float cloud = pow(flow, 2.6) * band * 1.5;

        // 星星：方向网格 hash，稀疏冷白，缓慢闪烁
        vec2 cell = floor(dir.xz / max(dir.y + 0.25, 0.12) * 36.0);
        float star = step(0.994, hash(cell));
        float twinkle = 0.5 + 0.5 * sin(uTime * 1.6 + hash(cell + 7.7) * 6.2831);
        float stars = star * twinkle * smoothstep(0.05, 0.4, dir.y) * 0.8;

        float gray = (base + cloud + stars) * uDim;
        gl_FragColor = vec4(vec3(gray), 1.0);
      }
    `,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 48, 32), skyMat)
  scene.add(sky)

  // ============================================================
  // 自定义着色器 2：向前飞驰的白线网格地面（漫游速度感）
  // ============================================================
  const gridUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 1 }, // 歌词页淡出网格
  }
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: gridUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vDist;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDist = length(wp.xz); // 到原点的距离，用于远处淡出
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying float vDist;

      void main() {
        // uv 向相机方向滚动 => 视觉上前移
        vec2 scrolled = vec2(vUv.x, vUv.y + uTime * 0.045);
        vec2 coord = scrolled * 90.0;

        // 抗锯齿网格线
        vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
        float line = 1.0 - min(min(grid.x, grid.y), 1.0);

        // 距离淡出 + 地平线一条银亮带
        float fade = 1.0 - smoothstep(12.0, 85.0, vDist);
        float horizon = smoothstep(30.0, 85.0, vDist) * 0.3;

        float gray = (line * fade * 0.55 + horizon) * uOpacity;
        gl_FragColor = vec4(vec3(gray), gray * 0.9);
      }
    `,
  })
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), gridMat)
  grid.rotation.x = -Math.PI / 2
  grid.position.y = -1.5
  scene.add(grid)

  // ============================================================
  // 自定义着色器 3：迎面飞过的白色尘埃（顶点着色器驱动）
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
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vFade;
      void main() {
        vec3 pos = position;
        // 沿 -z 循环滚动：粒子不断从远处飞向相机
        pos.z = 10.0 - mod(position.z + uTime * (6.0 + aSeed * 6.0), 80.0);
        vFade = smoothstep(-70.0, -20.0, pos.z) * smoothstep(9.0, 4.0, pos.z);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = (2.0 + aSeed * 3.0) * uPixelRatio * (8.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.1, d) * vFade * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vec3(0.9), alpha);
      }
    `,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  scene.add(dust)

  // ============================================================
  // 自定义着色器 4：流动光线（歌词页专属）
  // 参考 Shadertoy 流动线条：6 条正弦波动的亮线叠加。
  // 置于左右两侧的竖直平面上（纵向流动），不占文字后方，
  // 避免干扰阅读；窄屏（手机）自然超出视野，不会遮挡歌词
  // ============================================================
  const linesVertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `
  const linesFragmentShader = /* glsl */ `
    uniform float uTime;
    uniform float uOpacity;
    uniform float uPhase; // 两侧相位错开，流动不同步
    varying vec2 vUv;

    // smoothstep 简写（对应 Shadertoy 里的 S 宏）
    float S(float a, float b, float x) {
      return smoothstep(a, b, x);
    }

    // 单条流动光线：正弦波动 + 中心亮线向两侧渐隐
    vec3 Line(vec2 uv, float speed, float height, vec3 col) {
      float t = uTime + uPhase;
      uv.y += S(1.0, 0.0, abs(uv.x)) * sin(t * speed + uv.x * height) * 0.2;
      float line = S(0.06 * S(0.2, 0.9, abs(uv.x)), 0.0, abs(uv.y) - 0.004);
      return line * col * S(1.0, 0.3, abs(uv.x));
    }

    void main() {
      // 交换坐标轴：光线沿竖直方向（上下）流动，横向波动
      vec2 uv = vec2((vUv.y - 0.5) * 1.75, vUv.x - 0.5);
      vec3 acc = vec3(0.0);
      for (float i = 0.0; i <= 5.0; i += 1.0) {
        float t = i / 5.0;
        acc += Line(uv, 1.0 + t, 4.0 + t, vec3(0.25 + t * 0.75));
      }
      acc *= uOpacity;
      float a = max(acc.r, max(acc.g, acc.b));
      gl_FragColor = vec4(acc, a);
    }
  `

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
      vertexShader: linesVertexShader,
      fragmentShader: linesFragmentShader,
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

    // 歌单页 = 云雾 + 网格 + 尘埃；歌词页 = 两侧流动光线 + 压暗天空
    const inMenu = view.value === 'menu'
    lerpTo(gridUniforms.uOpacity, inMenu ? 1 : 0)
    lerpTo(dustUniforms.uOpacity, inMenu ? 1 : 0)
    for (const u of linesUniformSets) lerpTo(u.uOpacity, inMenu ? 0 : 1)
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
