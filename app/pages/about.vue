<script setup lang="ts">
import type * as THREE_NS from "three"

definePageMeta({
  layout: false, // 全屏 3D 体验，隐藏站点导航与页脚
})

// ============ 章节数据 ============
interface Chapter {
  id: string
  title: string
  subtitle: string
  items: string[]
  color: number // 装饰几何体与粒子配色
  shape: "torusKnot" | "icosa" | "octa" | "torus" | "dodeca" | "cone" | "box" | "sphere"
}

const chapters: Chapter[] = [
  {
    id: "intro",
    title: "关于我",
    subtitle: "ABOUT ME",
    items: ["向下滚动，穿越我的星系"],
    color: 0x7dd3fc,
    shape: "torusKnot",
  },
  {
    id: "work",
    title: "工作",
    subtitle: "WORK",
    items: [
      "我是一名前端开发者，目前在宁波工作，对 Web 技术充满热情",
      "从 2021 年开始编程，一直在不断学习和成长",
      "我相信好的代码不仅要能运行，还要优雅、可维护",
      "框架：Vue / React / UniApp",
      "语言：TypeScript / JavaScript / GLSL / Sass",
      "知识：Vite / ECharts / Three.js / Cesium / WebGL",
    ],
    color: 0x818cf8,
    shape: "icosa",
  },
  {
    id: "games",
    title: "游戏",
    subtitle: "GAMES",
    items: [
      "英雄联盟",
      "魔兽争霸3",
      "DOTA2",
      "埃尔登法环",
      "杀戮尖塔",
      "狼人杀",
      "雀魂",
    ],
    color: 0xf472b6,
    shape: "octa",
  },
  {
    id: "movies",
    title: "影视",
    subtitle: "MOVIES",
    items: [
      "《剑雨》",
      "《肖申克的救赎》",
      "《陆小凤传奇》",
      "《请回答1988》",
      "《仙剑一》",
      "90、00年代的港剧",
    ],
    color: 0xfbbf24,
    shape: "torus",
  },
  {
    id: "music",
    title: "音乐",
    subtitle: "MUSIC",
    items: ["《杀破狼》", "《会呼吸的痛》", "《富士山下》", "徐良 / 许嵩 / 汪苏泷 / 本兮"],
    color: 0x34d399,
    shape: "dodeca",
  },
  {
    id: "books",
    title: "书籍",
    subtitle: "BOOKS",
    items: ["《城南旧事》", "《三体》", "《春秋》", "《红楼梦》"],
    color: 0xf87171,
    shape: "box",
  },
  {
    id: "anime",
    title: "动漫",
    subtitle: "ANIME",
    items: ["《CLANNAD》", "《海贼王》", "《叛逆的鲁鲁修》", "《未来日记》"],
    color: 0x22d3ee,
    shape: "cone",
  },
  {
    id: "hobbies",
    title: "爱好",
    subtitle: "HOBBIES",
    items: ["各种棋牌、桌游", "篮球", "唱歌（虽然五音不全）", "喜欢推理和解谜"],
    color: 0xa78bfa,
    shape: "sphere",
  },
]

const canvasRef = ref<HTMLCanvasElement | null>(null)
const progress = ref(0) // 0 ~ 1 滚动进度
const activeIndex = ref(0)
const showHint = ref(true)
const isCoarsePointer = ref(false) // 触屏设备：禁用轨道控制，保留滑动翻章
const showMusic = ref(false) // 日语歌单漫游场景
const musicIndex = chapters.findIndex((c) => c.id === "music") // 音乐章节索引
let cleanupScene: (() => void) | null = null // 场景资源清理函数

onBeforeUnmount(() => cleanupScene?.())

// 页面总高度 = 章节数 * 100vh，滚动驱动相机前进
const pageHeight = computed(() => `${chapters.length * 100}vh`)

// 点击右侧导航点，平滑滚动到对应章节
function scrollToChapter(index: number) {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const target = (index / (chapters.length - 1)) * maxScroll
  window.scrollTo({ top: target, behavior: "smooth" })
}

onMounted(async () => {
  if (!canvasRef.value) return
  // 动态引入，避免 SSR 阶段加载 three
  const THREE: typeof THREE_NS = await import("three")
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js")

  // ---------- 基础场景 ----------
  const BG_COLOR = 0x06060f
  const SPACING = 14 // 章节间距（世界单位）
  const VIEW_DIST = 10 // 相机与章节的最小距离（窄屏自动拉远）
  let viewDist = VIEW_DIST // 实际生效距离（随屏幕宽高比自适应）
  const LOOK_Y = 0.3 // 注视点高度（偏低，配合内容上移使构图居中）
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(BG_COLOR)
  scene.fog = new THREE.Fog(BG_COLOR, 13, 38)

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    120,
  )
  camera.position.set(0, LOOK_Y, 6)

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // ---------- 轨道控制器：拖拽旋转视角（仅非触屏设备启用） ----------
  // 触屏设备上单指拖拽被 OrbitControls 占用会导致页面无法下滑，
  // 因此手机端不创建控制器，视角固定、纯滚动驱动
  const isCoarse = window.matchMedia("(pointer: coarse)").matches
  isCoarsePointer.value = isCoarse
  let controls: InstanceType<typeof OrbitControls> | null = null
  if (!isCoarse) {
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true // 阻尼惯性
    controls.dampingFactor = 0.06
    controls.enablePan = false
    controls.enableZoom = false // 滚轮用于滚动翻章，避免冲突
    controls.rotateSpeed = 0.4
    controls.target.set(0, LOOK_Y, -4)
  }

  // ---------- 工具：平滑阶梯 ----------
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
  const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = clamp01((x - edge0) / (edge1 - edge0))
    return t * t * (3 - 2 * t)
  }

  // ---------- 工具：文字 -> CanvasTexture 平面 ----------
  const PX2WORLD = 1 / 64 // 像素到世界单位的缩放

  function makeTextPlane(
    text: string,
    opts: {
      fontSize: number
      color: string
      weight?: string
      lineHeight?: number
      glow?: string // 辉光颜色
      gradientTo?: string // 纵向渐变终点色（从 color 渐变到它）
      letterSpacing?: number // 字距（px），Chrome 99+ 生效
    },
  ) {
    const { fontSize, color, weight = "normal", lineHeight = 1.4, glow, gradientTo } = opts
    const letterSpacing = opts.letterSpacing ?? 0
    const dpr = Math.min(window.devicePixelRatio, 2)
    const font = `${weight} ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`

    // 设置字距（设置 canvas 尺寸会重置上下文状态，需在测量前后各设一次）
    const applySpacing = (ctx: CanvasRenderingContext2D) => {
      ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${letterSpacing}px`
    }

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    ctx.font = font
    applySpacing(ctx)
    const textWidth = ctx.measureText(text).width + letterSpacing * text.length
    canvas.width = Math.ceil(textWidth * dpr) + 4
    canvas.height = Math.ceil(fontSize * lineHeight * dpr) + 4

    ctx.scale(dpr, dpr)
    ctx.font = font
    applySpacing(ctx)
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    if (glow) {
      ctx.shadowColor = glow
      ctx.shadowBlur = fontSize * 0.5
    }
    // 纵向渐变或纯色填充
    if (gradientTo) {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height / dpr)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, gradientTo)
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = color
    }
    ctx.fillText(text, canvas.width / dpr / 2, canvas.height / dpr / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const w = (canvas.width / dpr) * PX2WORLD
    const h = (canvas.height / dpr) * PX2WORLD
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material)
    return { mesh, material, w, h }
  }

  // ---------- 工具：文字 -> 粒子点云（离屏 canvas 像素采样） ----------
  function makeTextParticles(
    text: string,
    opts: { fontSize: number; colorFrom: string; colorTo: string },
  ) {
    const { fontSize, colorFrom, colorTo } = opts
    const font = `bold ${fontSize}px "Microsoft YaHei", "SimHei", sans-serif`

    // 离屏 canvas 渲染文字
    const canvas = document.createElement("canvas")
    const cctx = canvas.getContext("2d")!
    cctx.font = font
    const tw = Math.ceil(cctx.measureText(text).width) + 8
    const th = Math.ceil(fontSize * 1.4)
    canvas.width = tw
    canvas.height = th
    cctx.font = font
    cctx.textAlign = "center"
    cctx.textBaseline = "middle"
    // 纵向渐变：白 -> 章节色
    const gradient = cctx.createLinearGradient(0, 0, 0, th)
    gradient.addColorStop(0, colorFrom)
    gradient.addColorStop(1, colorTo)
    cctx.fillStyle = gradient
    cctx.fillText(text, tw / 2, th / 2)

    // 像素采样：不透明的像素点转换为粒子
    const data = cctx.getImageData(0, 0, tw, th).data
    const STEP = 2 // 采样步长（像素）
    const positions: number[] = []
    const colors: number[] = []
    const randoms: number[] = []
    for (let y = 0; y < th; y += STEP) {
      for (let x = 0; x < tw; x += STEP) {
        const i = (y * tw + x) * 4
        if (data[i + 3]! > 128) {
          positions.push((x - tw / 2) * PX2WORLD, -(y - th / 2) * PX2WORLD, 0)
          colors.push(data[i]! / 255, data[i + 1]! / 255, data[i + 2]! / 255)
          randoms.push(Math.random())
        }
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute("aColor", new THREE.Float32BufferAttribute(colors, 3))
    geo.setAttribute("aRand", new THREE.Float32BufferAttribute(randoms, 1))

    const uniforms = {
      uAssemble: { value: 0 }, // 0 = 四散，1 = 聚合成字
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    }
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute vec3 aColor;
        attribute float aRand;
        uniform float uAssemble;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        void main() {
          float spread = 1.0 - uAssemble;
          vec3 pos = position;
          // 散开状态：沿 z 抛散并带 xy 抖动；聚合后轻微呼吸浮动
          pos.z += (aRand - 0.5) * 10.0 * spread
                 + sin(uTime * 1.6 + aRand * 6.2831) * 0.05 * uAssemble;
          pos.x += (fract(aRand * 7.13) - 0.5) * 4.0 * spread;
          pos.y += (fract(aRand * 3.71) - 0.5) * 4.0 * spread;
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = 5.0 * uPixelRatio * (10.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uOpacity;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.15, d) * uOpacity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const points = new THREE.Points(geo, material)
    points.frustumCulled = false // 散开动画会超出原始包围球，关闭剔除
    return { points, uniforms }
  }

  // ---------- 工具：章节装饰几何体 ----------
  function makeShape(shape: Chapter["shape"], color: number) {
    let geo: THREE_NS.BufferGeometry
    switch (shape) {
      case "torusKnot":
        geo = new THREE.TorusKnotGeometry(1.1, 0.32, 128, 16)
        break
      case "icosa":
        geo = new THREE.IcosahedronGeometry(1.4, 0)
        break
      case "octa":
        geo = new THREE.OctahedronGeometry(1.5, 0)
        break
      case "torus":
        geo = new THREE.TorusGeometry(1.2, 0.42, 16, 48)
        break
      case "dodeca":
        geo = new THREE.DodecahedronGeometry(1.4, 0)
        break
      case "cone":
        geo = new THREE.ConeGeometry(1.2, 2, 6)
        break
      case "box":
        geo = new THREE.BoxGeometry(1.7, 1.7, 1.7)
        break
      default:
        geo = new THREE.SphereGeometry(1.3, 16, 12)
    }
    return new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0 }),
    )
  }

  // ---------- 构建章节 ----------
  interface Entry {
    object: THREE_NS.Object3D
    baseY: number
    delay: number // 错峰入场
    setAppear: (a: number) => void // 入场进度 0~1 -> 透明度/聚合度
  }
  interface ChapterNode {
    group: THREE_NS.Group
    decor: THREE_NS.Mesh
    decorMat: THREE_NS.MeshBasicMaterial
    entries: Entry[]
    color: THREE_NS.Color
    z: number
  }
  const nodes: ChapterNode[] = []
  // 标题粒子的 uniforms 集合，用于每帧更新时间
  const particleUniforms: { uTime: { value: number } }[] = []

  // 窄屏缩小字号，避免文字超出视野
  const isNarrow = window.innerWidth < 640
  const TITLE_SIZE = isNarrow ? 60 : 96
  const SUB_SIZE = isNarrow ? 22 : 30
  const ITEM_SIZE = isNarrow ? 21 : 30

  chapters.forEach((chapter, ci) => {
    const group = new THREE.Group()
    const z = -ci * SPACING
    group.position.z = z
    group.position.y = 0.4 // 内容整体上移，构图居中
    const entries: Entry[] = []
    const colorHex = `#${chapter.color.toString(16).padStart(6, "0")}`

    // 主标题（粒子聚合效果）
    const title = makeTextParticles(chapter.title, {
      fontSize: TITLE_SIZE,
      colorFrom: "#ffffff",
      colorTo: colorHex,
    })
    title.points.position.y = 2.3
    particleUniforms.push(title.uniforms)
    entries.push({
      object: title.points,
      baseY: 2.3,
      delay: 0,
      setAppear: (a) => {
        title.uniforms.uAssemble.value = a
        title.uniforms.uOpacity.value = a
      },
    })
    group.add(title.points)

    // 英文副标题：章节色 + 辉光 + 宽字距
    const sub = makeTextPlane(chapter.subtitle, {
      fontSize: SUB_SIZE,
      color: colorHex,
      weight: "300",
      glow: colorHex,
      letterSpacing: 12,
    })
    sub.mesh.position.y = 1.35
    entries.push({
      object: sub.mesh,
      baseY: 1.35,
      delay: 0.06,
      setAppear: (a) => (sub.material.opacity = a),
    })
    group.add(sub.mesh)

    // 条目，逐行向下排布，并加入左右交错的漂浮感
    let y = 0.55
    chapter.items.forEach((item, ii) => {
      // 白 -> 章节色 的纵向渐变，与粒子标题呼应
      const line = makeTextPlane(item, {
        fontSize: ITEM_SIZE,
        color: "#ffffff",
        gradientTo: colorHex,
      })
      const xOffset = ii % 2 === 0 ? -0.35 : 0.35
      line.mesh.position.set(xOffset, y, 0)
      entries.push({
        object: line.mesh,
        baseY: y,
        delay: 0.1 + ii * 0.07,
        setAppear: (a) => (line.material.opacity = a),
      })
      group.add(line.mesh)
      y -= line.h + 0.28
    })

    // 装饰线框几何体，置于文字后方
    const decor = makeShape(chapter.shape, chapter.color)
    decor.position.z = -3.2
    decor.scale.setScalar(1.6)
    group.add(decor)

    scene.add(group)
    nodes.push({
      group,
      decor,
      decorMat: decor.material as THREE_NS.MeshBasicMaterial,
      entries,
      color: new THREE.Color(chapter.color),
      z,
    })
  })

  // ---------- 粒子星空 ----------
  const PARTICLE_COUNT = 900
  const totalDepth = (chapters.length - 1) * SPACING + 30
  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const colors = new Float32Array(PARTICLE_COUNT * 3)
  const palette = chapters.map((c) => new THREE.Color(c.color))
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40
    positions[i * 3 + 1] = (Math.random() - 0.5) * 24
    positions[i * 3 + 2] = 10 - Math.random() * totalDepth
    const c = palette[Math.floor(Math.random() * palette.length)] ?? palette[0]!
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  const particleGeo = new THREE.BufferGeometry()
  particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3))
  const particleMat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const particles = new THREE.Points(particleGeo, particleMat)
  scene.add(particles)

  // ---------- 交互状态 ----------
  let targetZ = 6 // 相机行进目标（由滚动驱动）
  let travelZ = 6 // 平滑后的行进位置
  const lookTarget = new THREE.Vector3() // 控制器注视点复用对象

  function onScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    const p = maxScroll > 0 ? clamp01(window.scrollY / maxScroll) : 0
    progress.value = p
    showHint.value = p < 0.02
    activeIndex.value = Math.round(p * (chapters.length - 1))
    // 滚动进度映射为行进位置：始终停在当前章节正前方 viewDist 个单位
    targetZ = viewDist - p * (chapters.length - 1) * SPACING
  }
  // 窄屏（手机竖屏）自动拉远相机，保证内容完整可见
  function computeViewDist() {
    const aspect = window.innerWidth / window.innerHeight
    const halfWidthNeeded = 4.2 // 内容最大半宽（标题与最长条目）
    const min = halfWidthNeeded / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect)
    viewDist = Math.max(VIEW_DIST, min)
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    computeViewDist()
    onScroll() // 距离变化后重新计算行进目标
  }
  window.addEventListener("scroll", onScroll, { passive: true })
  window.addEventListener("resize", onResize)
  computeViewDist()
  onScroll()

  // ---------- 渲染循环 ----------
  const startTime = performance.now()
  let rafId = 0
  function animate() {
    rafId = requestAnimationFrame(animate)
    const t = (performance.now() - startTime) / 1000

    // 行进位置平滑跟随滚动目标
    travelZ += (targetZ - travelZ) * 0.06

    if (controls) {
      // 注视点锁定在行进位置前方的章节中心：
      // 相机与注视点同步平移，保留用户拖拽产生的轨道偏移
      lookTarget.set(0, LOOK_Y, travelZ - viewDist)
      const delta = lookTarget.clone().sub(controls.target)
      camera.position.add(delta)
      controls.target.copy(lookTarget)
      controls.update() // 应用阻尼与旋转
    } else {
      // 触屏设备：固定视角，仅随滚动前进
      camera.position.set(0, LOOK_Y, travelZ)
      camera.lookAt(0, LOOK_Y, travelZ - viewDist)
    }

    // 粒子整体缓慢旋转与呼吸
    particles.rotation.z = t * 0.012
    particleMat.opacity = 0.6 + Math.sin(t * 0.8) * 0.2

    // 标题粒子呼吸动画的时间推进
    for (const u of particleUniforms) {
      u.uTime.value = t
    }

    // 章节动画：聚焦度驱动淡入、上浮、缩放
    for (const node of nodes) {
      const dist = Math.abs(travelZ - viewDist - node.z)
      const focus = 1 - smoothstep(0, SPACING * 0.75, dist)

      node.group.scale.setScalar(0.92 + focus * 0.08)
      node.group.rotation.y = Math.sin(t * 0.4 + node.z) * 0.03

      // 文字错峰入场：透明度/聚合度 + 垂直位移
      for (const entry of node.entries) {
        const appear = smoothstep(0, 0.3, focus - entry.delay)
        entry.setAppear(appear)
        entry.object.position.y = entry.baseY - (1 - appear) * 0.7
      }

      // 装饰几何体持续旋转，靠近时显现
      node.decor.rotation.x = t * 0.25
      node.decor.rotation.y = t * 0.32
      node.decorMat.opacity = focus * 0.28
    }

    renderer.render(scene, camera)
  }
  animate()

  // ---------- 资源清理 ----------
  cleanupScene = () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener("scroll", onScroll)
    window.removeEventListener("resize", onResize)
    controls?.dispose()
    scene.traverse((obj) => {
      // 同时清理文字平面（Mesh）与标题粒子（Points）
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose()
        const mat = obj.material as THREE_NS.Material & { map?: THREE_NS.Texture | null }
        mat.map?.dispose()
        mat.dispose()
      }
    })
    particleGeo.dispose()
    particleMat.dispose()
    renderer.dispose()
  }
})
</script>

<template>
  <div class="about-3d relative" :style="{ height: pageHeight }">
    <!-- Three.js 画布（固定全屏） -->
    <canvas ref="canvasRef" class="fixed inset-0 h-full w-full" />

    <!-- 顶部滚动进度条 -->
    <div class="fixed left-0 top-0 z-20 h-0.5 w-full bg-white/5">
      <div
        class="h-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-amber-300 transition-[width] duration-150"
        :style="{ width: `${progress * 100}%` }"
      />
    </div>

    <!-- 返回首页 -->
    <NuxtLink to="/" class="back-home" aria-label="返回首页">
      <span class="back-home-arrow">←</span>
      <span>返回首页</span>
    </NuxtLink>

    <!-- 右侧章节导航 -->
    <nav class="chapter-nav" aria-label="章节导航">
      <button
        v-for="(chapter, i) in chapters"
        :key="chapter.id"
        type="button"
        class="nav-item"
        :class="{ active: activeIndex === i }"
        @click="scrollToChapter(i)"
      >
        <span class="nav-label">{{ chapter.title }}</span>
        <span class="nav-dot" />
      </button>
    </nav>

    <!-- 音乐章节：日语歌单入口 -->
    <transition name="fade">
      <button
        v-if="activeIndex === musicIndex && !showMusic"
        type="button"
        class="music-entry"
        @click="showMusic = true"
      >
        🎧 日语歌单 · 点击进入漫游
      </button>
    </transition>

    <!-- 日语歌单：场景漫游 + 自定义着色器 -->
    <MusicScene v-if="showMusic" @close="showMusic = false" />

    <!-- 底部滚动提示 -->
    <transition name="fade">
      <div
        v-if="showHint"
        class="fixed bottom-10 left-1/2 z-20 -translate-x-1/2 text-center text-white/60"
      >
        <p class="text-sm tracking-[0.3em] [text-shadow:0_1px_6px_rgba(0,0,0,0.9)]">
          {{ isCoarsePointer ? "下滑探索" : "向下滚动 · 拖拽旋转视角" }}
        </p>
        <div class="scroll-arrow mx-auto mt-3">↓</div>
      </div>
    </transition>

    <!-- 可访问性：对屏幕阅读器保留原始内容 -->
    <div class="sr-only">
      <h1>关于我</h1>
      <section v-for="chapter in chapters" :key="chapter.id">
        <h2>{{ chapter.title }}</h2>
        <ul>
          <li v-for="item in chapter.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* 页面容器：无布局时兜底深色背景，避免加载白闪 */
.about-3d {
  background: #06060f;
}

/* 返回首页按钮 */
.back-home {
  position: fixed;
  left: 1.25rem;
  top: 1.25rem;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgb(255 255 255 / 15%);
  background: rgb(0 0 0 / 55%);
  box-shadow: 0 4px 24px rgb(0 0 0 / 50%);
  backdrop-filter: blur(12px);
  color: rgb(255 255 255 / 80%);
  font-size: 14px;
  letter-spacing: 0.1em;
  text-decoration: none;
  text-shadow: 0 1px 4px rgb(0 0 0 / 90%);
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    color: #fff;
    border-color: rgb(125 211 252 / 60%);
    box-shadow: 0 0 16px rgb(125 211 252 / 30%);

    .back-home-arrow {
      transform: translateX(-3px);
    }
  }
}

.back-home-arrow {
  transition: transform 0.2s ease;
}

/* 右侧章节导航：默认只显示圆点，悬停时展开文字 */
.chapter-nav {
  position: fixed;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgb(255 255 255 / 15%);
  background: rgb(0 0 0 / 55%);
  box-shadow: 0 4px 24px rgb(0 0 0 / 50%);
  backdrop-filter: blur(12px);
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 6px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover,
  &.active {
    background: rgb(255 255 255 / 12%);
  }
}

.nav-label {
  display: block;
  max-width: 0; // 默认收起，只留圆点
  opacity: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.15em;
  color: rgb(255 255 255 / 80%);
  text-shadow: 0 1px 4px rgb(0 0 0 / 90%);
  transition: max-width 0.35s ease, margin-right 0.35s ease, opacity 0.25s ease;

  // 悬停导航时展开文字，并留出与圆点的间距
  .chapter-nav:hover & {
    max-width: 5em;
    margin-right: 12px;
    opacity: 1;
  }

  .nav-item.active & {
    color: #fff;
  }
}

.nav-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgb(255 255 255 / 40%);
  transition: all 0.3s ease;

  .nav-item:hover & {
    background: rgb(255 255 255 / 90%);
  }

  .nav-item.active & {
    background: #7dd3fc;
    transform: scale(1.5);
    box-shadow: 0 0 10px rgb(125 211 252 / 90%);
  }
}

/* 手机端：导航更紧凑 */
@media (width < 768px) {
  .chapter-nav {
    right: 0.5rem;
    padding: 8px 6px;
    gap: 2px;
    border: none;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }
}

/* 音乐章节：日语歌单入口按钮 */
.music-entry {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 10px 22px;
  border: 1px solid rgb(52 211 153 / 40%);
  border-radius: 999px;
  background: rgb(0 0 0 / 55%);
  box-shadow: 0 0 20px rgb(52 211 153 / 15%);
  backdrop-filter: blur(12px);
  color: rgb(52 211 153 / 90%);
  font-size: 14px;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;

  &:hover {
    color: #6ee7b7;
    border-color: rgb(52 211 153 / 80%);
    box-shadow: 0 0 28px rgb(52 211 153 / 35%);
    transform: translateX(-50%) translateY(-2px);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.scroll-arrow {
  animation: bounce-down 1.6s ease-in-out infinite;
  font-size: 18px;
}

@keyframes bounce-down {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  50% {
    transform: translateY(8px);
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
