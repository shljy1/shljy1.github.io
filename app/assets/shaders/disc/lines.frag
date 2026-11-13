// 流动光线（正弦波动亮线叠加，青 -> 品红渐变）
uniform float iTime;
varying vec2 vUv;

float S(float a, float b, float x) {
  return smoothstep(a, b, x);
}

vec3 Line(vec2 uv, float speed, float height, vec3 col) {
  uv.y += S(1.0, 0.0, abs(uv.x)) * sin(iTime * speed + uv.x * height) * 0.2;
  float line = S(0.06 * S(0.2, 0.9, abs(uv.x)), 0.0, abs(uv.y) - 0.004);
  return line * col * S(1.0, 0.3, abs(uv.x));
}

void main() {
  vec2 uv = (vUv - 0.5) * vec2(2.4, 2.0);
  vec3 acc = vec3(0.0);
  for (float i = 0.0; i <= 5.0; i += 1.0) {
    float t = i / 5.0;
    vec3 c = mix(vec3(0.13, 0.77, 0.93), vec3(0.85, 0.3, 1.0), t); // 青 -> 品红
    acc += Line(uv, 1.0 + t, 4.0 + t, c);
  }
  float rim = smoothstep(1.0, 0.9, length((vUv - 0.5) * 2.0));
  float a = max(acc.r, max(acc.g, acc.b));
  gl_FragColor = vec4(acc, a * rim);
}
