uniform float uTime;
uniform float uDim;
uniform float uStars;
varying vec3 vDir;

// 经典 hash / noise / fbm
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + vec2(100.0);
    a *= 0.5;
  }
  return v;
}

// ---------- 星空用 3D 噪声（移植自 Shadertoy 星云） ----------
float hash1(float n) {
  return fract(cos(n) * 41415.92653);
}
float noise3(vec3 x) {
  vec3 p = floor(x);
  vec3 f = smoothstep(0.0, 1.0, fract(x));
  float n = p.x + p.y * 57.0 + 113.0 * p.z;
  return mix(
    mix(mix(hash1(n + 0.0), hash1(n + 1.0), f.x),
        mix(hash1(n + 57.0), hash1(n + 58.0), f.x), f.y),
    mix(mix(hash1(n + 113.0), hash1(n + 114.0), f.x),
        mix(hash1(n + 170.0), hash1(n + 171.0), f.x), f.y),
    f.z
  );
}
const mat3 m3 = mat3(0.00, 1.60, 1.20, -1.60, 0.72, -0.96, -1.20, -0.96, 1.28);
// 低频分形噪声：星尘大尺度分布
float fbmslow(vec3 p) {
  float f = 0.5000 * noise3(p); p = m3 * p * 1.2;
  f += 0.2500 * noise3(p); p = m3 * p * 1.3;
  f += 0.1666 * noise3(p); p = m3 * p * 1.4;
  f += 0.0834 * noise3(p);
  return f;
}
// 分形布朗运动：星云细节
float fbm3(vec3 p) {
  float f = 0.0, a = 1.0, s = 0.0;
  f += a * noise3(p); p = m3 * p * 1.149; s += a; a *= 0.75;
  f += a * noise3(p); p = m3 * p * 1.41;  s += a; a *= 0.75;
  f += a * noise3(p); p = m3 * p * 1.51;  s += a; a *= 0.65;
  f += a * noise3(p); p = m3 * p * 1.21;  s += a; a *= 0.35;
  f += a * noise3(p); p = m3 * p * 1.41;  s += a; a *= 0.75;
  f += a * noise3(p);
  return f / s;
}

void main() {
  vec3 dir = normalize(vDir);

  // 纯黑底色，地平线处微微提亮
  float base = mix(0.045, 0.0, smoothstep(0.0, 0.55, dir.y));

  // 云雾：中低纬度缓慢流动的 FBM，黑白灰如宣纸上的墨
  float band = smoothstep(0.02, 0.2, dir.y) * smoothstep(0.8, 0.3, dir.y);
  float flow = fbm(vec2(dir.x * 2.6 + uTime * 0.045, dir.y * 6.0 - uTime * 0.07));
  float cloud = pow(flow, 2.6) * band * 1.5;

  // 星星：方向网格 hash，稀疏冷白，缓慢闪烁
  vec2 cell = floor(dir.xz / max(dir.y + 0.25, 0.12) * 36.0);
  float star = step(0.994, hash(cell));
  float twinkle = 0.5 + 0.5 * sin(uTime * 1.6 + hash(cell + 7.7) * 6.2831);
  float stars = star * twinkle * smoothstep(0.05, 0.4, dir.y) * 0.8;

  float gray = base + cloud + stars;

  // 歌词页：切换为星空（移植自 Shadertoy 星云，
  // 含旋涡云盘/星点/雾带/银心辉光与绕场飞行）
  if (uStars > 0.001) {
    float st = uTime * 0.1; // 与原版一致的时间尺度
    vec3 rd = dir; // 球面方向即视线方向

    // 原版绕场一周的巡游相机
    vec3 campos = vec3(500.0, 850.0, -cos((st - 1.4) / 2.0) * 2000.0);
    vec3 light = normalize(vec3(0.0) - campos);
    float sundot = clamp(dot(light, rd), 0.0, 1.0);

    // 星系中心辉光 + 月晕
    float glow = 1.0;
    vec3 ncol = glow * 1.2 * min(vec3(1.0), vec3(2.0, 1.0, 0.5) * pow(sundot, 100.0));
    ncol += 0.3 * vec3(0.8, 0.9, 1.2) * pow(sundot, 8.0);

    // 亮星：两层高频噪声相乘，得到稀疏星点
    vec3 star2 = 85.5 * vec3(pow(fbmslow(rd.xyz * 312.0), 7.0))
                        * vec3(pow(fbmslow(rd.zxy * 440.3), 8.0));

    // 缓慢漂移的背景雾
    vec3 cpos = 1500.0 * rd + vec3(831.0 - st * 30.0, 321.0, 1000.0);
    ncol += vec3(0.4, 0.5, 1.0) * (fbmslow(cpos * 0.0035) - 0.5);
    cpos += vec3(831.0 - st * 33.0, 321.0, 999.0);
    ncol += vec3(0.6, 0.3, 0.6) * 10.0 * pow(fbmslow(cpos * 0.0045), 10.0);
    cpos += vec3(3831.0 - st * 39.0, 221.0, 999.0);
    ncol += 0.03 * vec3(0.6, 0.0, 0.0) * 10.0 * pow(fbmslow(cpos * 0.0145), 2.0);
    cpos = 1500.0 * rd + vec3(831.0, 321.0, 999.0);
    ncol += star2 * fbm3(cpos * 0.0021);

    // 旋涡云盘：双层圆盘叠加（星云主体）
    vec2 shift = vec2(st * 100.0, st * 180.0);
    vec4 sum = vec4(0.0);
    float c0 = campos.y / rd.y;
    vec3 cpos2 = campos - c0 * rd;
    float radius = length(cpos2.xz) / 1000.0;

    if (radius < 1.8) {
      // 外层亮云盘：旋涡扭转 + 星尘增亮/暗洞
      for (int q = 10; q > -10; q--) {
        if (sum.w > 0.999) continue;
        float c = (float(q) * 8.0 - campos.y) / rd.y;
        vec3 cp2 = campos + c * rd;
        float see = dot(normalize(cp2), normalize(campos));
        vec3 shine = mix(vec3(1.3, 1.2, 1.2), vec3(0.0), smoothstep(0.0, 1.0, see));
        float r = length(cp2.xz) / 999.0;
        if (r > 1.0) continue;
        float rot = 3.0 * r - st;
        cp2.xz = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * cp2.xz;
        cp2 += vec3(831.0 + shift.x, 321.0 + float(q) * mix(250.0, 50.0, r) - shift.x * 0.2, 1330.0 + shift.y);
        cp2 *= mix(0.0025, 0.0028, r);
        float a = smoothstep(0.5, 1.0, fbm3(cp2));
        a *= 1.3 * pow(smoothstep(1.0, 0.0, r), 0.3);
        vec3 dustcolor = mix(vec3(2.0, 1.3, 1.0), vec3(0.1, 0.2, 0.3), pow(r, 0.5));
        vec3 localcolor = mix(dustcolor, shine, a);
        float gstar = 2.0 * pow(noise3(cp2 * 21.40), 22.0);
        float gstar2 = 3.0 * pow(noise3(cp2 * 26.55), 34.0);
        float gholes = pow(noise3(cp2 * 11.55), 14.0);
        localcolor += vec3(1.0, 0.6, 0.3) * gstar;
        localcolor += vec3(1.0, 1.0, 0.7) * gstar2;
        localcolor -= gholes;
        a = (1.0 - sum.w) * a;
        sum += vec4(localcolor * a, a);
      }
      // 内层暗云盘：遮挡星光，形成尘埃暗带
      for (int q = 0; q < 20; q++) {
        if (sum.w > 0.999) continue;
        float c = (float(q) * 4.0 - campos.y) / rd.y;
        vec3 cp2 = campos + c * rd;
        float r = length(cp2.xz) / 200.0;
        if (r > 1.0) continue;
        float rot = 3.2 * r - st * 1.1;
        cp2.xz = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * cp2.xz;
        cp2 += vec3(831.0 + shift.x, 321.0 + float(q) * mix(250.0, 50.0, r) - shift.x * 0.2, 1330.0 + shift.y);
        float a = 0.1 + smoothstep(0.6, 1.0, fbm3(cp2));
        a *= 1.2 * (pow(smoothstep(1.0, 0.0, r), 0.72) - pow(smoothstep(1.0, 0.0, r * 1.875), 0.2));
        a = (1.0 - sum.w) * a;
        sum += vec4(vec3(0.0) * a, a);
      }
    }
    float ca = smoothstep(1.0 - radius * 0.5, 1.0, sum.w);
    sum.rgb /= sum.w + 0.0001;
    sum.rgb -= 0.2 * vec3(0.8, 0.75, 0.7) * pow(sundot, 10.0) * ca;
    sum.rgb += min(glow, 10.0) * 0.2 * vec3(1.2) * pow(sundot, 5.0) * (1.0 - ca);
    ncol = mix(ncol, sum.rgb, sum.w);

    // 星系边缘薄雾
    ncol = mix(ncol, vec3(0.3, 0.5, 0.9),
               29.0 * (pow(sundot, 50.0) - pow(sundot, 60.0)) / (2.0 + 9.0 * abs(rd.y)));

    // 黑白化：与站点单色风格统一
    float nlum = dot(ncol, vec3(0.299, 0.587, 0.114));
    gray = mix(gray, nlum * 0.85, uStars);
  }

  gl_FragColor = vec4(vec3(gray * uDim), 1.0);
}
