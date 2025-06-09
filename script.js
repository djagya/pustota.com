let symbolImg;
let particles = [];

function preload() {
  symbolImg = loadImage('assets/symbol.png'); // Placeholder image
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  for (let i = 0; i < 100; i++) {
    particles.push(new Particle());
  }

  // Ambient sound loop using Tone.js
  const synth = new Tone.AMSynth().toDestination();
  Tone.Transport.scheduleRepeat(time => {
    synth.triggerAttackRelease("C2", "8n", time);
  }, "2n");
  Tone.Transport.start();
}

function draw() {
  background(0, 10);
  for (let p of particles) {
    p.update();
    p.show();
  }
}

class Particle {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.speed = random(0.5, 2);
    this.noiseOffset = random(1000);
  }

  update() {
    this.x += map(noise(this.noiseOffset), 0, 1, -1, 1);
    this.y += map(noise(this.noiseOffset + 100), 0, 1, -1, 1);
    this.noiseOffset += 0.005;

    if (this.x > width) this.x = 0;
    if (this.x < 0) this.x = width;
    if (this.y > height) this.y = 0;
    if (this.y < 0) this.y = height;
  }

  show() {
    image(symbolImg, this.x, this.y, 24, 24);
  }
}
