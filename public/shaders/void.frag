precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_voidColor;
uniform float u_brightness;

// Simple 2D noise
float hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 center = vec2(0.5, 0.5);
    float t = u_time * 0.15;

    // Animate and warp
    vec2 p = (uv - center) * 2.0;
    float n = fbm(p * 1.5 + t);
    float vignette = smoothstep(0.8, 0.2, length(uv - center));

    // Compose color: deep blue/purple void
    float darkness = 0.25 + 0.75 * vignette * n;
    vec3 color = mix(u_voidColor, vec3(0.1, 0.0, 0.2), 0.7) * darkness * u_brightness;

    gl_FragColor = vec4(color, 1.0);
}