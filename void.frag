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
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    float falloff = 0.5;
    
    // Add several octaves of noise
    for(int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        frequency *= 2.0;
        amplitude *= falloff;
    }
    
    return value;
}

void main() {
    // Normalized coordinates
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 center = vec2(0.5, 0.5);
    
    // Create fluid motion
    float time = u_time * 0.1;
    vec2 p = uv * 4.0;
    p += time * vec2(0.1, 0.2);
    
    // Generate fractal noise
    float noise = fbm(p);
    noise = (noise + 1.0) * 0.5; // Normalize to 0-1
    
    // Create void-like color with subtle variations
    float brightness = mix(u_brightness * 0.5, u_brightness, noise);
    vec3 color = u_voidColor + vec3(brightness * 0.2, brightness * 0.1, brightness * 0.3);
    
    // Add subtle color variations based on position
    float angle = atan(uv.y - 0.5, uv.x - 0.5);
    float distance = length(uv - center) * 2.0;
    
    // Add subtle purple/blue tint based on angle and distance
    color.r += sin(angle * 2.0 + time) * 0.05 * (1.0 - distance);
    color.g += cos(angle * 3.0 + time) * 0.03 * (1.0 - distance);
    color.b += sin(angle * 4.0 + time) * 0.08 * (1.0 - distance);
    
    // Add alpha for smooth blending
    float alpha = mix(0.7, 1.0, noise);
    
    gl_FragColor = vec4(color, alpha);
} 