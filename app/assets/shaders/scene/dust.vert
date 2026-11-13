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
