// 螺旋星云（双旋臂 + 核心辉光 + 闪烁星点）
uniform float iTime;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  float r = length(uv);
  float a = atan(uv.y, uv.x);

  // 双旋臂：角向正弦 + 径向收紧，随时间缓慢旋转
  float arm = sin(a * 2.0 - r * 7.0 + iTime * 0.6);
  float arms = smoothstep(0.2, 0.9, arm) * smoothstep(1.0, 0.15, r);

  // 银心辉光
  float core = exp(-r * 4.0) * 1.2;

  // 稀疏星点，缓慢闪烁
  vec2 cell = floor(uv * 40.0);
  float star = step(0.985, hash(cell))
             * (0.5 + 0.5 * sin(iTime * 2.0 + hash(cell + 7.7) * 6.2831));

  vec3 col = vec3(0.02, 0.03, 0.08);
  col += arms * mix(vec3(0.1, 0.5, 0.7), vec3(0.6, 0.3, 0.9), r);
  col += core * vec3(0.9, 0.7, 0.5);
  col += star * vec3(0.9) * smoothstep(1.0, 0.6, r);

  float rim = smoothstep(1.0, 0.92, r);
  gl_FragColor = vec4(col, rim);
}
