let symbolImages = [];
let symbolLines = [];

function preload() {
  // Load all symbol images
  for (let i = 1; i <= 26; i++) {
    symbolImages.push(loadImage(`assets/symbols/symbol-${i}.png`));
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Create several symbol lines
  for (let i = 0; i < 50; i++) {
    symbolLines.push(new SymbolLine(
      random(width),  // x position
      random(-height, 0), // Start above the screen
      random(2, 8),  // number of symbols in line
      random(-0.5, 0.5),  // slight horizontal drift
      1   // consistent downward movement
    ));
  }

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
  background(0, 40);  // Very subtle afterimage with alpha of 5
  for (let line of symbolLines) {
    line.update();
    line.show();
  }
}

class SymbolLine {
  constructor(x, y, length, dirX, dirY) {
    this.x = x;
    this.y = y;
    this.length = length;
    this.dirX = dirX;
    this.dirY = dirY;
    this.speed = random(1, 2); // Slightly faster speed for downward movement
    this.noiseOffset = random(1000);
    this.symbols = [];
    this.spacing = 40;
    
    // Create symbols for this line
    for (let i = 0; i < length; i++) {
      this.symbols.push({
        symbol: random(symbolImages),
        offset: i * this.spacing
      });
    }
  }

  update() {
    // Update position with slight horizontal drift and consistent downward movement
    this.x += map(noise(this.noiseOffset), 0, 1, -0.3, 0.3) + this.dirX * this.speed;
    this.y += this.dirY * this.speed; // Consistent downward movement
    this.noiseOffset += 0.005;

    // Wrap around screen
    if (this.x > width + this.length * this.spacing) this.x = -this.length * this.spacing;
    if (this.x < -this.length * this.spacing) this.x = width + this.length * this.spacing;
    if (this.y > height + 100) this.y = -100; // Reset to top when reaching bottom
  }

  show() {
    // Draw each symbol in the line with minimal wave motion
    for (let symbol of this.symbols) {
      let x = this.x + symbol.offset;
      let y = this.y + sin(frameCount * 0.01 + symbol.offset * 0.05) * 5; // Reduced wave motion
      image(symbol.symbol, x, y, 40, 40);
    }
  }
}
