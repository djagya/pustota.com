let symbolImages = [];
let symbolLines = [];
let currentLine = null;
let fadeDuration = 60;
let displayDuration = 120; // How long the line stays fully visible
let centerX;
let centerY;

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
  background(0, 40);
  
  // Create new line if there isn't one or if the current one is done
  if (!currentLine || currentLine.isComplete()) {
    currentLine = new SymbolLine(
      centerX,
      centerY,
      random(3, 12),
      random(fadeDuration/2, fadeDuration),
      random(displayDuration/2, displayDuration)
    );
  }
  
  // Update and show current line
  currentLine.update();
  currentLine.show();
}

class SymbolLine {
  constructor(x, y, length, fadeInDuration, displayDuration) {
    this.x = x;
    this.y = y;
    this.length = length;
    this.fadeInDuration = fadeInDuration;
    this.displayDuration = displayDuration;
    this.symbols = [];
    this.spacing = 80;
    this.symbolSize = 60;
    this.opacity = 0;
    this.lifeTime = 0;
    this.state = 'fadeIn'; // States: 'fadeIn', 'display', 'fadeOut', 'complete'
    
    // Calculate total width of the line
    let totalWidth = (length - 1) * this.spacing - this.symbolSize  * (length - 1);
    let startX = this.x - totalWidth / 2;
    
    // Create symbols for this line with precise positioning
    for (let i = 0; i < length; i++) {
      this.symbols.push({
        symbol: random(symbolImages),
        x: startX + (i * this.spacing)  // Calculate exact x position for each symbol
      });
    }
  }

  update() {
    this.lifeTime++;
    
    // Update opacity based on state
    switch(this.state) {
      case 'fadeIn':
        this.opacity = map(this.lifeTime, 0, this.fadeInDuration, 0, 255);
        if (this.lifeTime >= this.fadeInDuration) {
          this.state = 'display';
          this.lifeTime = 0;
        }
        break;
        
      case 'display':
        this.opacity = 255;
        if (this.lifeTime >= this.displayDuration) {
          this.state = 'fadeOut';
          this.lifeTime = 0;
        }
        break;
        
      case 'fadeOut':
        this.opacity = map(this.lifeTime, 0, this.fadeInDuration, 255, 0);
        if (this.lifeTime >= this.fadeInDuration) {
          this.state = 'complete';
        }
        break;
    }
  }

  show() {
    // Draw each symbol in the line
    for (let symbol of this.symbols) {
      let y = this.y + sin(frameCount * 0.02 + symbol.x * 0.05) * 3; // Subtle floating motion
      tint(255, this.opacity);
      image(symbol.symbol, symbol.x -this.symbolSize * this.symbols.length/2, y - this.symbolSize/2, this.symbolSize, this.symbolSize);
    }
    noTint();
  }

  isComplete() {
    return this.state === 'complete';
  }
}
