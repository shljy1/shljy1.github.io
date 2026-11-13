varying vec2 vUv;
varying float vDist;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDist = length(wp.xz); // 到原点的距离，用于远处淡出
  gl_Position = projectionMatrix * viewMatrix * wp;
}
