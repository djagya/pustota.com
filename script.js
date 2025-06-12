let symbolImages = [];
let formations = [];
let fadeDuration = 40;
let displayDuration = 80;
let centerX;
let centerY;
let rotationSpeed = 0.002;
let maxFormations = 5;
let lastFormationTime = 0;
let minTimeBetweenFormations = 150;
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
  createCanvas(windowWidth, windowHeight);
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

function draw() {
  background(0);
  
  // Update and show formations
  let allComplete = true;
  formations = formations.filter(formation => {
    formation.update();
    formation.show();
    
    if (formation.state !== 'done') {
      allComplete = false;
    }
    
    return formation.state !== 'done';
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
  
  const formation = new SymbolFormation(
    position.x,
    position.y,
    random(4, 8),
    random(fadeDuration/2, fadeDuration + fadeDuration/2),
    random(displayDuration/2, displayDuration + displayDuration / 2),
    formationType,
    random([-1, 1]),
    1, // All formations are secondary size
    false // No center formations in grid pattern
  );
  
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
    this.updateInterval = 1; // All formations update at the same rate
    this.rotationStep = rotationSpeed * rotationDirection;
    this.symbolSize = 70 * scale;
    this.spacing = 90 * scale;
    
    // Pre-calculate opacity steps
    this.fadeInStep = 255 / fadeInDuration;
    this.fadeOutStep = 255 / fadeInDuration;
    
    this.createFormation();
    this.updateRotationMatrix();
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
    // Skip update if not enough frames have passed
    if (frameCount % this.updateInterval !== 0) {
      return;
    }
    
    this.lifeTime++;
    
    // Update rotation less frequently
    if (frameCount % 4 === 0) {
      this.rotation += this.rotationStep;
      this.updateRotationMatrix();
    }
    
    // Update state and opacity
    switch(this.state) {
      case 'fadeIn':
        this.opacity = min(255, this.opacity + this.fadeInStep);
        if (this.opacity >= 255) {
          this.state = 'display';
          this.lifeTime = 0;
        }
        break;
        
      case 'display':
        if (this.lifeTime >= this.displayDuration) {
          this.state = 'fadeOut';
          this.lifeTime = 0;
        }
        break;
        
      case 'fadeOut':
        this.opacity = max(0, this.opacity - this.fadeOutStep);
        if (this.opacity <= 0) {
          this.state = 'done';
        }
        break;
    }
  }
  
  show() {
    if (this.opacity <= 0) return;
    
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    
    // Draw all symbols
    for (let symbol of this.symbols) {
      push();
      translate(symbol.x, symbol.y);
      rotate(-this.rotation); // Counter-rotate to keep symbols upright
      
      // Apply opacity to the symbol
      tint(255, this.opacity);
      image(symbol.symbol, -symbol.size/2, -symbol.size/2, symbol.size, symbol.size);
      pop();
    }
    
    pop();
  }
  
  updateRotationMatrix() {
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    this.rotationMatrix = [cos, -sin, sin, cos];
  }
  
  isComplete() {
    return this.state === 'done';
  }
}
