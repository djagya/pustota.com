// Vertex shader for void background
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;

void main() {
    // Pass texture coordinates to fragment shader
    vTexCoord = aTexCoord;
    // Convert position to clip space
    vec4 positionVec4 = vec4(aPosition, 1.0);
    gl_Position = positionVec4;
}