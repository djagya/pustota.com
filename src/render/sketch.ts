import {
  FORMATIONS,
  type FormationType,
  SymbolsGroup,
} from "./SymbolsGroup.ts";
import p5 from "p5";

interface GridPosition {
  row: number;
  col: number;
}

// Pre-calculate opacity values for smoother transitions
const opacityLookup = new Array(256);
for (let i = 0; i < 256; i++) {
  opacityLookup[i] = i;
}

export function sketch(p: p5) {
  let symbolImages: p5.Image[] = [];
  // Properly type our variables
  let formations: SymbolsGroup[] = [];
  let fadeDuration = 40;
  let displayDuration = 80;
  let maxFormations = 5;
  let currentGridPosition: GridPosition = { row: 1, col: 1 };
  const GRID_ROWS = 3;
  const GRID_COLS = 3;
  let lastFormationComplete = true;
  let voidColor = [20, 10, 30];
  let voidShader: p5.Shader | null = null;
  let voidBuffer: p5.Graphics;
  let mousePos = { x: 0.5, y: 0.5, active: false }; // Initialize mouse position

  p.setup = async function setup() {
    // Load shader files - use correct Vite paths
    voidShader = await p.loadShader("/shaders/void.vert", "/shaders/void.frag");
    // Load all symbol images - use correct Vite paths
    for (let i = 1; i <= 26; i++) {
      const img = await p.loadImage(`/assets/symbols/symbol-${i}.png`);
      symbolImages.push(img);
    }

    // Create canvas with WebGL renderer
    p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);

    // Create buffer for void background
    voidBuffer = p.createGraphics(p.windowWidth, p.windowHeight, p.WEBGL);

    // Initialize other variables
    lastFormationComplete = true;

    // Setup mouse interaction
    p.mouseMoved = () => {
      // Convert to normalized coordinates (0-1 range)
      // In WebGL mode, we need to adjust for the center origin
      mousePos.x = p.mouseX / p.width;
      // Invert Y for shader coordinate system which has origin at bottom-left
      mousePos.y = 1.0 - p.mouseY / p.height;
      mousePos.active = true;
      return false; // prevent default
    };
  };

  p.draw = function () {
    // Clear everything first
    p.clear();
    drawVoidBackground();

    // Draw formations
    let allComplete = true;
    formations = formations.filter((formation) => {
      if (formation && formation.update) {
        formation.update();

        // Draw formation
        p.push();
        formation.show();
        p.pop();

        if (formation.state !== "done") {
          allComplete = false;
        }

        return formation.state !== "done";
      }
      return false;
    });

    // If all formations are complete, allow creating a new one
    if (allComplete) {
      lastFormationComplete = true;
    }

    // Create new formation if conditions are met
    if (formations.length < maxFormations && lastFormationComplete) {
      createNewSymbolsGroup();
    }
  };

  function createNewSymbolsGroup() {
    if (!lastFormationComplete) return;

    const position = calculateGridPosition();

    let formationType: FormationType;
    const rand = p.random();
    if (rand < 0.5) formationType = FORMATIONS.LINE;
    else formationType = FORMATIONS.CIRCLE;

    const centerX = p.width / 2;
    const centerY = p.height / 2;

    const formation = new SymbolsGroup(p, symbolImages, {
      x: position.x - centerX,
      y: position.y - centerY,
      length: p.random(5, 20),
      fadeInDuration: fadeDuration,
      displayDuration: displayDuration,
      formationType: formationType,
      rotationDirection: p.random([-1, 1]),
      scale: p.random(0.6, 1),
      isCenter: false,
    });

    formations.push(formation);
    lastFormationComplete = false;
  }

  function drawVoidBackground() {
    if (!voidShader) {
      console.warn("Shader not ready yet");
      return;
    }

    voidBuffer.shader(voidShader);

    // Basic uniforms
    voidShader.setUniform("u_resolution", [
      voidBuffer.width * 2,
      voidBuffer.height * 2,
    ]);
    voidShader.setUniform("u_time", p.frameCount * 0.005);
    voidShader.setUniform("u_voidColor", [
      voidColor[0] / 255,
      voidColor[1] / 255,
      voidColor[2] / 255,
    ]);

    // Dynamic brightness based on sin wave for subtle pulsing
    const pulsingBrightness = 1.0 + Math.sin(p.frameCount * 0.02) * 0.15;
    voidShader.setUniform("u_brightness", pulsingBrightness);
    voidShader.setUniform("u_mouse", [mousePos.x, mousePos.y]);
    voidShader.setUniform("u_mouseActive", mousePos.active);

    // Draw a full-screen quad (covers the whole buffer in WebGL mode)
    voidBuffer.clear();
    voidBuffer.push();
    voidBuffer.noStroke();
    voidBuffer.beginShape();
    voidBuffer.vertex(-voidBuffer.width / 2, -voidBuffer.height / 2, 0, 0);
    voidBuffer.vertex(voidBuffer.width / 2, -voidBuffer.height / 2, 1, 0);
    voidBuffer.vertex(voidBuffer.width / 2, voidBuffer.height / 2, 1, 1);
    voidBuffer.vertex(-voidBuffer.width / 2, voidBuffer.height / 2, 0, 1);
    voidBuffer.endShape(p.CLOSE);
    voidBuffer.pop();

    p.push();
    p.image(voidBuffer, -p.width / 2, -p.height / 2, p.width, p.height);
    p.pop();
    voidBuffer.resetShader();
  }

  function calculateGridPosition(): { x: number; y: number } {
    // Calculate cell size based on screen dimensions
    const cellWidth = (p.width - 400) / GRID_COLS; // 200px padding on each side
    const cellHeight = (p.height - 400) / GRID_ROWS;

    // Calculate position within the current cell
    const x = 200 + currentGridPosition.col * cellWidth + cellWidth * 0.5;
    const y = 200 + currentGridPosition.row * cellHeight + cellHeight * 0.5;

    // Move to next position (top to bottom, then left to right)
    currentGridPosition.row++;
    if (currentGridPosition.row >= GRID_ROWS) {
      currentGridPosition.row = 0;
      currentGridPosition.col++;
      if (currentGridPosition.col >= GRID_COLS) {
        currentGridPosition.col = 0;
      }
    }

    return { x, y };
  }
}
