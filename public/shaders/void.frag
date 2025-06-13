precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_voidColor;
uniform float u_brightness;
uniform vec2 u_mouse;
uniform bool u_mouseActive;

// Improved hash function for better randomness
float hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Hash function that returns a vec2 for cellular noise
vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(vec2(
        dot(p, vec2(12.9898, 78.233)),
        dot(p, vec2(39.346, 11.135))
    )) * 43758.5453123);
}

// Improved noise function
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

// Fractal Brownian Motion
float fbm(vec2 p, float lacunarity, float gain) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    // More octaves for more detail
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= lacunarity;
        amplitude *= gain;
    }
    return value;
}

// Cellular noise for bubble-like patterns
float cellular(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float minDist = 1.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            // Use hash2 to get a vec2 directly
            vec2 point = hash2(i + neighbor) * 0.5 + 0.5;
            // Animate the point position over time
            point = 0.5 + 0.5 * sin(u_time * 0.3 + 6.2831 * point);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            minDist = min(minDist, dist);
        }
    }

    return minDist;
}

// Domain warping for fluid-like distortion
vec2 warp(vec2 p) {
    float t = u_time * 0.2;

    // Create two layers of FBM
    float f1 = fbm(p + t, 2.0, 0.5);
    float f2 = fbm(p + f1 + t * 0.5, 2.1, 0.45);

    // Warp the input coordinates
    return p + vec2(f1, f2) * 0.6;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 center = vec2(0.5, 0.5);
    float t = u_time * 0.15;

    // Apply mouse interaction if active
    if (u_mouseActive) {
        // Create attraction or disturbance effect based on mouse position
        float mouseDistance = length(uv - u_mouse);
        float mouseInfluence = smoothstep(0.3, 0.0, mouseDistance) * 0.8;

        // Add mouse influence to time variable
        t += mouseInfluence * 2.0;

        // Can also shift the warping center to mouse position
        center = mix(center, u_mouse, 0.3);
    }

    // Apply domain warping for fluid motion
    vec2 warped = warp(uv * 3.0);

    // First layer: boiling base pattern
    float pattern1 = fbm(warped * 0.8 + t * 0.3, 2.0, 0.5);

    // Second layer: finer details with different speed
    float pattern2 = fbm(warped * 1.5 - t * 0.2, 2.2, 0.45);

    // Third layer: bubble-like cells
    float bubbles = cellular(warped * 3.0 + t * 0.1);
    bubbles = smoothstep(0.1, 0.6, bubbles);

    // Create pulsating effect
    float pulse = 0.5 + 0.5 * sin(t * 0.5);

    // Combine patterns
    float combined = mix(pattern1, pattern2, 0.5) * (0.8 + 0.2 * pulse);
    combined = mix(combined, bubbles, 0.3);

    // Create vignette for edge darkening
    float dist = length(uv - center);
    float vignette = smoothstep(0.8, 0.2, dist);

    float energy = 0.0;
    // Add mouse-based energy burst if active
    if (u_mouseActive) {
        float mouseDistance = length(uv - u_mouse);
        float mouseBurst = smoothstep(0.15, 0.0, mouseDistance) * (sin(u_time * 3.0) * 0.5 + 0.5);
        vignette = max(vignette, mouseBurst * 0.8);
        energy += mouseBurst * 0.5;
    }

    // Add some intensity spots
    float spots = pow(combined, 3.0) * pulse * 2.0;

    // Energy effect
    energy += combined * vignette + spots * vignette;

    // Base dark void color
    vec3 baseColor = u_voidColor * 0.8;

    // Energy color (purple-blue with hints of cyan)
    vec3 energyColor1 = vec3(0.2, 0.0, 0.5); // Deep purple
    vec3 energyColor2 = vec3(0.0, 0.3, 0.7); // Blue
    vec3 energyColor3 = vec3(0.0, 0.6, 0.8); // Cyan for hot spots

    // Mix colors based on energy level
    vec3 finalColor = mix(baseColor, energyColor1, energy);
    finalColor = mix(finalColor, energyColor2, energy * energy * 0.8);
    finalColor = mix(finalColor, energyColor3, spots * 0.7);

    // Apply brightness
    finalColor *= u_brightness * (0.8 + 0.4 * pulse);

    gl_FragColor = vec4(finalColor, 1.0);
}