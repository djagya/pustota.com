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
  // Load all symbol images
  for (let i = 1; i <= 26; i++) {
    symbolImages.push(loadImage(`assets/symbols/symbol-${i}.png`));
  }
}

function setup() {
  // Create canvas with willReadFrequently attribute
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.drawingContext.canvas.willReadFrequently = true;
  
  centerX = width / 2;
  centerY = height / 2;
  
  // Ambient sound loop using Tone.js
  const synth = new Tone.AMSynth().toDestination();
  Tone.Transport.scheduleRepeat(time => {
    synth.triggerAttackRelease("C2", "8n", time);
  }, "2n");
  document.querySelector('body').addEventListener('click', () => {
    Tone.Transport.start();
  });
}

function drawVoidBackground() {
  // Create a separate graphics buffer for the void background
  let voidBuffer = createGraphics(width, height);
  voidBuffer.loadPixels();
  
  // Update noise Z coordinate for fluid motion
  noiseZ += noiseSpeed;
  
  // Create fluid fractal pattern in the buffer
  for (let x = 0; x < width; x += 2) {
    for (let y = 0; y < height; y += 2) {
      // Create multiple layers of noise for fractal effect
      let noiseVal = 0;
      let amplitude = 1;
      let frequency = 1;
      
      for (let i = 0; i < noiseOctaves; i++) {
        let nx = x * noiseScale * frequency;
        let ny = y * noiseScale * frequency;
        noiseVal += noise(nx, ny, noiseZ) * amplitude;
        
        amplitude *= noiseFalloff;
        frequency *= 2;
      }
      
      // Normalize noise value
      noiseVal = noiseVal / (1 - pow(noiseFalloff, noiseOctaves));
      
      // Create void-like color with subtle variations
      let brightness = map(noiseVal, 0, 1, voidBrightness * 0.5, voidBrightness);
      let r = voidColor[0] + brightness * 0.2;
      let g = voidColor[1] + brightness * 0.1;
      let b = voidColor[2] + brightness * 0.3;
      
      // Add subtle color variations based on position
      let angle = atan2(y - centerY, x - centerX);
      let distance = dist(x, y, centerX, centerY) / (min(width, height) * 0.5);
      
      // Add subtle purple/blue tint based on angle and distance
      r += sin(angle * 2 + noiseZ) * 5 * (1 - distance);
      g += cos(angle * 3 + noiseZ) * 3 * (1 - distance);
      b += sin(angle * 4 + noiseZ) * 8 * (1 - distance);
      
      // Set pixel color with alpha for smooth blending
      let alpha = map(noiseVal, 0, 1, 180, 255);
      voidBuffer.set(x, y, color(r, g, b, alpha));
      voidBuffer.set(x + 1, y, color(r, g, b, alpha));
      voidBuffer.set(x, y + 1, color(r, g, b, alpha));
      voidBuffer.set(x + 1, y + 1, color(r, g, b, alpha));
    }
  }
  voidBuffer.updatePixels();
  
  // Draw the void background buffer to the main canvas
  image(voidBuffer, 0, 0);
}

function draw() {
    // Draw void background
    // drawVoidBackground();
  // Clear the canvas first
  clear();
  

  
  // Reset the drawing context after void background
  push();
  // Reset any transformations or styles that might affect formation rendering
  resetMatrix();
  noTint();
  
  // Update and show formations
  let allComplete = true;
  formations = formations.filter(formation => {
    if (formation && formation.update) {
      formation.update();
      // Draw formation with fresh context
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
      frameCount - lastFormationTime > minTimeBetweenFormations && 
      lastFormationComplete) {
    createNewFormation();
    lastFormationTime = frameCount;
  }
  
  pop();
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
  if (frameCount - lastOccupiedAreasUpdate < OCCUPIED_AREAS_UPDATE_INTERVAL) {
    return;
  }
  
  lastOccupiedAreasUpdate = frameCount;
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
  
  // Create new formation with fixed parameters for testing
  const formation = new SymbolFormation(
    position.x,
    position.y,
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
    position: position,
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
    if (frameCount - this.lastUpdateTime < this.updateInterval) return;
    this.lastUpdateTime = frameCount;
    
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
    
    // Reset any previous transformations
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    
    // Draw all symbols with fresh context for each
    for (let symbol of this.symbols) {
      if (symbol && symbol.symbol) {
        push();
        translate(symbol.x, symbol.y);
        rotate(-this.rotation); // Counter-rotate to keep symbols upright
        
        // Reset tint and set new one
        noTint();
        tint(255, this.opacity);
        image(symbol.symbol, -symbol.size/2, -symbol.size/2, symbol.size, symbol.size);
        pop();
      }
    }
    
    pop();
  }
}

// Add window resize handler to maintain void effect
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  centerX = width / 2;
  centerY = height / 2;
}
