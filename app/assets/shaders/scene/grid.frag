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
