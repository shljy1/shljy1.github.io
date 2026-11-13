varying vec3 vDir;
void main() {
  vDir = position; // 球面方向即采样方向
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
