let symbolImages = [];
let formations = [];
let fadeDuration = 40;
let displayDuration = 80;
let centerX;
let centerY;
let rotationSpeed = 0.002;
let maxFormations = 5;
let lastFormationTime = 0;
let minTimeBetweenFormations = 60;
let hasCenterFormation = false;
let occupiedAreas = [];
let lastOccupiedAreasUpdate = 0;
const OCCUPIED_AREAS_UPDATE_INTERVAL = 5; // Update more frequently
const MIN_FORMATION_DISTANCE = 400; // Increased minimum distance between formations
const CENTER_PADDING = 300; // Increased padding from center
let cachedFormationRadii = new Map(); // Cache for formation radii
let currentGridPosition = { row: 1, col: 1 };
const GRID_ROWS = 3;
const GRID_COLS = 3;
let lastFormationComplete = true;
let noiseScale = 0.005;
let noiseZ = 0;
let noiseSpeed = 0.001;
let noiseOctaves = 4;
let noiseFalloff = 0.5;
let voidColor = [20, 10, 30]; // Dark purple base color
let voidBrightness = 40; // Maximum brightness for the void effect
let voidShader;
let voidBuffer;
let shaderReady = false;
let formationCanvas;

// Pre-calculate opacity values for smoother transitions
const opacityLookup = new Array(256);
for (let i = 0; i < 256; i++) {
  opacityLookup[i] = i;
}

// Formation types
const FORMATIONS = {
  LINE: 'line',
  CROSS: 'cross',
  CIRCLE: 'circle'
};

function preload() {
  // Load shader files before setup
  voidShader = loadShader('void.vert', 'void.frag');
  
  // Load all symbol images
  for (let i = 1; i <= 26; i++) {
    symbolImages.push(loadImage(`assets/symbols/symbol-${i}.png`));
  }
}

function setup() {
  // Create canvas with WebGL renderer
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Create buffer for void background
  voidBuffer = createGraphics(windowWidth, windowHeight, WEBGL);
  
  // Set up WebGL context
  _renderer.GL.blendFunc(_renderer.GL.SRC_ALPHA, _renderer.GL.ONE_MINUS_SRC_ALPHA);
  
  // Initialize other variables
  centerX = width / 2;
  centerY = height / 2;
  lastFormationTime = 0;
  lastFormationComplete = true;
  occupiedAreas = [];
  
  // Mark shader as ready
  shaderReady = true;

}

function drawVoidBackground() {
  if (!shaderReady || !voidShader) {
    console.warn('Shader not ready yet');
    return;
  }

  voidBuffer.shader(voidShader);

  voidShader.setUniform('u_resolution', [voidBuffer.width*2, voidBuffer.height*2]);
  voidShader.setUniform('u_time', frameCount * 0.1);
  voidShader.setUniform('u_voidColor', [voidColor[0]/255, voidColor[1]/255, voidColor[2]/255]);
  voidShader.setUniform('u_brightness', voidBrightness / 255.0);

  voidBuffer.clear();

  // Draw a full-screen quad (covers the whole buffer in WebGL mode)
  voidBuffer.push();
  voidBuffer.noStroke();
  voidBuffer.beginShape();
  voidBuffer.vertex(-voidBuffer.width/2, -voidBuffer.height/2, 0, 0);
  voidBuffer.vertex( voidBuffer.width/2, -voidBuffer.height/2, 1, 0);
  voidBuffer.vertex( voidBuffer.width/2,  voidBuffer.height/2, 1, 1);
  voidBuffer.vertex(-voidBuffer.width/2,  voidBuffer.height/2, 0, 1);
  voidBuffer.endShape(CLOSE);
  voidBuffer.pop();

  voidBuffer.resetShader();

  push();
  image(voidBuffer, -width/2, -height/2, width, height);
  pop();
}

function draw() {
  // Clear everything first
  clear();
  
  // Draw void background using shader
  if (shaderReady) {
    try {
      drawVoidBackground();
    } catch (e) {
      console.error('Error drawing void background:', e);
      // If shader fails, mark it as not ready to prevent continuous errors
      shaderReady = false;
    }
  }
  
  // Draw formations
  let allComplete = true;
  formations = formations.filter(formation => {
    if (formation && formation.update) {
      formation.update();
      
      // Draw formation
      push();
      formation.show();
      pop();
      
      if (formation.state !== 'done') {
        allComplete = false;
      }
      
      return formation.state !== 'done';
    }
    return false;
  });
  
  // If all formations are complete, allow creating a new one
  if (allComplete) {
    lastFormationComplete = true;
  }
  
  // Create new formation if conditions are met
  if (formations.length < maxFormations && 
      lastFormationComplete) {
    createNewFormation();
  }
}

function getFormationRadius(formation) {
  // Calculate the effective radius based on formation type
  const baseRadius = formation.formationType === FORMATIONS.CIRCLE ? 
    200 * formation.scale : // Circle needs more space
    150 * formation.scale;  // Line and cross formations
  
  // Add extra padding to ensure no overlap
  return baseRadius + 150;
}

function isAreaOccupied(x, y, radius) {
  const radiusSquared = radius * radius;
  const minRequiredDistanceSquared = (radius + 100) * (radius + 100); // Add some padding
  
  for (let area of occupiedAreas) {
    const dx = x - area.x;
    const dy = y - area.y;
    const distanceSquared = dx * dx + dy * dy;
    
    if (distanceSquared < minRequiredDistanceSquared) {
      return true;
    }
  }
  return false;
}

function addOccupiedArea(x, y, radius) {
  occupiedAreas.push({ x, y, radius });
}

function removeOccupiedArea(x, y) {
  occupiedAreas = occupiedAreas.filter(area => 
    area.x !== x || area.y !== y
  );
}

function updateOccupiedAreas() {
  occupiedAreas = [];
  
  // Pre-calculate array size and update occupied areas
  occupiedAreas.length = formations.length;
  let index = 0;
  
  for (let formation of formations) {
    if (formation.state !== 'done') { // Only track active formations
      const radius = getFormationRadius(formation);
      occupiedAreas[index++] = { 
        x: formation.x, 
        y: formation.y, 
        radius,
        isCenter: formation.isCenter
      };
    }
  }
  
  // Trim array to actual size
  occupiedAreas.length = index;
}

function calculateGridPosition() {
  // Calculate cell size based on screen dimensions
  const cellWidth = (width - 400) / GRID_COLS;  // 200px padding on each side
  const cellHeight = (height - 400) / GRID_ROWS;
  
  // Calculate position within the current cell
  const x = 200 + (currentGridPosition.col * cellWidth) + (cellWidth * 0.5);
  const y = 200 + (currentGridPosition.row * cellHeight) + (cellHeight * 0.5);
  
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

function createNewFormation() {
  // Only create a new formation if the last one is complete
  if (!lastFormationComplete) return;
  
  // Get the next grid position
  const position = calculateGridPosition();
  
  // Select formation type with adjusted probabilities
  let formationType;
  const rand = random();
  if (rand < 0.4) formationType = FORMATIONS.LINE;
  else if (rand < 0.7) formationType = FORMATIONS.CROSS;
  else formationType = FORMATIONS.CIRCLE;
  
  // Adjust position to be center-based for WebGL mode
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Create new formation with fixed parameters for testing
  const formation = new SymbolFormation(
    position.x - centerX,
    position.y - centerY,
    6, // Fixed number of symbols for testing
    fadeDuration,
    displayDuration,
    formationType,
    random([-1, 1]),
    1,
    false
  );
  
  console.log('Creating new formation:', {
    type: formationType,
    position: { x: position.x - centerX, y: position.y - centerY },
    symbols: formation.symbols.length
  });
  
  formations.push(formation);
  lastFormationComplete = false;
}

class SymbolFormation {
  constructor(x, y, length, fadeInDuration, displayDuration, formationType, rotationDirection, scale = 1, isCenter = false) {
    this.x = x;
    this.y = y;
    this.length = length;
    this.fadeInDuration = fadeInDuration;
    this.displayDuration = displayDuration;
    this.formationType = formationType;
    this.rotationDirection = rotationDirection;
    this.scale = scale;
    this.symbols = [];
    this.opacity = 0;
    this.lifeTime = 0;
    this.rotation = 0;
    this.state = 'fadeIn';
    this.lastUpdateTime = 0;
    
    // Pre-calculate some values
    this.updateInterval = 1;
    this.rotationStep = rotationSpeed * rotationDirection;
    this.symbolSize = 70 * scale;
    this.spacing = 90 * scale;
    
    // Pre-calculate opacity steps
    this.fadeInStep = 255 / fadeInDuration;
    this.fadeOutStep = 255 / fadeInDuration;
    
    // Verify symbols are available before creating formation
    if (symbolImages.length > 0) {
      this.createFormation();
    } else {
      console.error('No symbols available for formation creation');
    }
  }
  
  createFormation() {
    const baseRadius = 200 * this.scale;
    const centerSymbolSize = this.symbolSize * 1.5; // 50% larger than regular symbols
    
    // For circle formation, add a center symbol first
    if (this.formationType === FORMATIONS.CIRCLE) {
      const centerSymbol = {
        x: 0,
        y: 0,
        size: centerSymbolSize,
        symbol: random(symbolImages),
        rotation: 0
      };
      this.symbols.push(centerSymbol);
    }
    
    // Create the rest of the formation
    switch (this.formationType) {
      case FORMATIONS.LINE:
        for (let i = 0; i < this.length; i++) {
          const x = (i - (this.length - 1) / 2) * this.spacing;
          this.symbols.push({
            x: x,
            y: 0,
            size: this.symbolSize,
            symbol: random(symbolImages),
            rotation: 0
          });
        }
        break;
        
      case FORMATIONS.CROSS:
        // Create cross with multiple layers
        const layers = 2;
        for (let layer = 0; layer < layers; layer++) {
          const layerSpacing = this.spacing * (layer + 1);
          // Horizontal line
          for (let i = -2; i <= 2; i++) {
            if (i === 0 && layer === 0) continue; // Skip center for first layer
            this.symbols.push({
              x: i * layerSpacing,
              y: 0,
              size: this.symbolSize,
              symbol: random(symbolImages),
              rotation: 0
            });
          }
          // Vertical line
          for (let i = -2; i <= 2; i++) {
            if (i === 0 && layer === 0) continue; // Skip center for first layer
            this.symbols.push({
              x: 0,
              y: i * layerSpacing,
              size: this.symbolSize,
              symbol: random(symbolImages),
              rotation: 0
            });
          }
        }
        break;
        
      case FORMATIONS.CIRCLE:
        // Create circle around the center symbol
        const angleStep = TWO_PI / (this.length - 1); // -1 because we already have center symbol
        for (let i = 0; i < this.length - 1; i++) {
          const angle = i * angleStep;
          const x = cos(angle) * baseRadius;
          const y = sin(angle) * baseRadius;
          this.symbols.push({
            x: x,
            y: y,
            size: this.symbolSize,
            symbol: random(symbolImages),
            rotation: 0
          });
        }
        break;
    }
  }
  
  update() {
    this.lifeTime++;
    this.rotation += this.rotationStep;
    
    // Update state and opacity
    if (this.state === 'fadeIn') {
      this.opacity = min(255, this.opacity + this.fadeInStep);
      if (this.opacity >= 255) {
        this.state = 'display';
        this.lifeTime = 0;
      }
    } else if (this.state === 'display') {
      if (this.lifeTime >= this.displayDuration) {
        this.state = 'fadeOut';
      }
    } else if (this.state === 'fadeOut') {
      this.opacity = max(0, this.opacity - this.fadeOutStep);
      if (this.opacity <= 0) {
        this.state = 'done';
      }
    }
  }
  
  show() {
    if (this.opacity <= 0) return;
    
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    
    // Draw all symbols
    for (let symbol of this.symbols) {
      if (symbol && symbol.symbol) {
        push();
        translate(symbol.x, symbol.y);
        rotate(-this.rotation); // Counter-rotate to keep symbols upright
        
        // Reset any previous tint
        noTint();
        // Apply new tint for this symbol
        tint(255, this.opacity);
        image(symbol.symbol, -symbol.size/2, -symbol.size/2, symbol.size, symbol.size);
        pop();
      }
    }
    
    pop();
  }
}

// Update window resize handler
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Update center coordinates
  centerX = width / 2;
  centerY = height / 2;
  
  // Resize void buffer if it exists
  if (voidBuffer) {
    voidBuffer.resizeCanvas(width, height);
  }
}
