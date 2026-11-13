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
