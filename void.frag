precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_voidColor;
uniform float u_brightness;

// Noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

// Fractal Brownian Motion
float fbm(vec2 p, float t) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float falloff = 0.5;
    
    // Add several octaves of noise
    for(int i = 0; i < 7; i++) {
        value += amplitude * snoise(p * frequency + t * 0.2 * frequency);
        frequency *= 2.0;
        amplitude *= falloff;
    }
    
    return value;
}

void main() {
    // Normalized coordinates
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 center = vec2(0.5, 0.5);
    
    float t = u_time;

    // Animate and warp the coordinates for more chaos
    vec2 p = uv * 6.0;
    p += 0.5 * vec2(sin(t * 0.7), cos(t * 0.4));
    p += 0.2 * vec2(sin(uv.y * 10.0 + t), cos(uv.x * 10.0 - t));
    p += 0.1 * vec2(sin(uv.x * 30.0 + t * 2.0), cos(uv.y * 30.0 - t * 2.0));

    // Layer multiple FBM fields
    float n1 = fbm(p, t);
    float n2 = fbm(p + 10.0 * n1, t * 1.3);
    float n3 = fbm(p - 10.0 * n2, t * 0.7);

    float chaos = (n1 + n2 + n3) / 3.0;
    chaos = (chaos + 1.0) * 0.5; // Normalize to 0-1

    // Color shifting and chaos
    float brightness = mix(u_brightness * 0.3, u_brightness, chaos);
    vec3 base = u_voidColor + vec3(brightness * 0.3, brightness * 0.2, brightness * 0.4);

    // Add time-based color shifts
    base.r += 0.15 * sin(t + chaos * 6.0 + uv.x * 8.0);
    base.g += 0.12 * cos(t * 1.2 + chaos * 8.0 + uv.y * 8.0);
    base.b += 0.18 * sin(t * 0.7 + chaos * 10.0 + uv.x * 6.0 - uv.y * 6.0);

    // Add subtle radial and angular chaos
    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float distance = length(uv - center) * 2.0;
    base.r += sin(angle * 3.0 + t) * 0.08 * (1.0 - distance);
    base.g += cos(angle * 5.0 + t * 0.7) * 0.06 * (1.0 - distance);
    base.b += sin(angle * 7.0 - t * 0.5) * 0.12 * (1.0 - distance);

    // Add alpha for smooth blending
    float alpha = mix(0.7, 1.0, chaos);
    
    gl_FragColor = vec4(base, alpha);
} 