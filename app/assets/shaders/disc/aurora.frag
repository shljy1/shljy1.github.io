// 极光涟漪（同心扩散波纹 + 旋转极光弧带）
uniform float iTime;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  float r = length(uv);
  float ang = atan(uv.y, uv.x);

  // 同心涟漪：从中心向外扩散
  float wave = pow(sin(r * 14.0 - iTime * 2.4) * 0.5 + 0.5, 3.0)
             * smoothstep(1.0, 0.2, r);

  // 极光弧带：三条角向亮带，缓慢扭动
  float band = sin(ang * 3.0 + iTime * 0.8 + sin(r * 5.0 - iTime)) * 0.5 + 0.5;
  band = smoothstep(0.55, 0.95, band)
       * smoothstep(0.9, 0.35, r)
       * smoothstep(0.05, 0.3, r);

  vec3 col = vec3(0.01, 0.03, 0.05);
  col += wave * vec3(0.1, 0.8, 0.7) * 0.8;
  col += band * mix(vec3(0.2, 0.9, 0.5), vec3(0.3, 0.4, 1.0), r) * 0.9;

  float rim = smoothstep(1.0, 0.92, r);
  gl_FragColor = vec4(col, rim);
}
