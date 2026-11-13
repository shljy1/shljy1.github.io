uniform float uOpacity;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float alpha = smoothstep(0.5, 0.1, d) * vFade * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vec3(0.9), alpha);
}
