import p5 from "p5";

export type FormationType = "line" | "cross" | "circle";
export type FormationState = "fadeIn" | "display" | "fadeOut" | "done";

export let rotationSpeed = 0.002;

export interface SymbolData {
  x: number;
  y: number;
  size: number;
  symbol: p5.Image;
  rotation: number;
  currentX?: number;
  currentY?: number;
  history?: Array<{ x: number; y: number }>;
}

export const FORMATIONS = {
  LINE: "line" as FormationType,
  CROSS: "cross" as FormationType,
  CIRCLE: "circle" as FormationType,
};

export class SymbolsGroup {
  x: number;
  y: number;
  length: number;
  fadeInDuration: number;
  displayDuration: number;
  formationType: FormationType;
  rotationDirection: number;
  scale: number;
  symbols: SymbolData[];
  opacity: number;
  lifeTime: number;
  animationTime: number; // Continuous counter for animations
  rotation: number;
  state: FormationState;
  lastUpdateTime: number;
  updateInterval: number;
  rotationStep: number;
  symbolSize: number;
  spacing: number;
  fadeInStep: number;
  fadeOutStep: number;
  isCenter: boolean;

  constructor(
    protected readonly p: p5,
    protected readonly symbolImages: unknown[],
    config: {
      x: number;
      y: number;
      length: number;
      fadeInDuration: number;
      displayDuration: number;
      formationType: FormationType;
      rotationDirection: number;
      scale: number;
      isCenter: boolean;
    },
  ) {
    this.x = config.x;
    this.y = config.y;
    this.length = config.length;
    this.fadeInDuration = config.fadeInDuration;
    this.displayDuration = config.displayDuration;
    this.formationType = config.formationType;
    this.rotationDirection = config.rotationDirection;
    this.scale = config.scale;
    this.symbols = [];
    this.opacity = 0;
    this.lifeTime = 0;
    this.animationTime = 0;
    this.rotation = 0;
    this.state = "fadeIn";
    this.lastUpdateTime = 0;
    this.updateInterval = 1;
    this.rotationStep = rotationSpeed * config.rotationDirection;
    this.symbolSize = 40 * config.scale;
    this.spacing = 50 * config.scale;
    this.fadeInStep = 255 / config.fadeInDuration;
    this.fadeOutStep = 255 / config.fadeInDuration;
    this.isCenter = config.isCenter;

    if (this.symbolImages.length > 0) {
      this.createFormation();
    } else {
      console.error("No symbols available for formation creation");
    }
  }

  createFormation() {
    const baseRadius = 120 * this.scale;
    const centerSymbolSize = this.symbolSize * 1.5; // 50% larger than regular symbols

    // For circle formation, add a center symbol first
    if (this.formationType === FORMATIONS.CIRCLE) {
      const centerSymbol = {
        x: 0,
        y: 0,
        size: centerSymbolSize,
        symbol: this.p.random(this.symbolImages),
        rotation: 0,
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
            symbol: this.p.random(this.symbolImages),
            rotation: 0,
          });
        }
        break;

      case FORMATIONS.CROSS:
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
              symbol: this.p.random(this.symbolImages),
              rotation: 0,
            });
          }
          // Vertical line
          for (let i = -2; i <= 2; i++) {
            if (i === 0 && layer === 0) continue; // Skip center for first layer
            this.symbols.push({
              x: 0,
              y: i * layerSpacing,
              size: this.symbolSize,
              symbol: this.p.random(this.symbolImages),
              rotation: 0,
            });
          }
        }
        break;

      case FORMATIONS.CIRCLE:
        // Create circle around the center symbol
        const angleStep = this.p.TWO_PI / (this.length - 1); // -1 because we already have center symbol
        for (let i = 0; i < this.length - 1; i++) {
          const angle = i * angleStep;
          const x = this.p.cos(angle) * baseRadius;
          const y = this.p.sin(angle) * baseRadius;
          this.symbols.push({
            x: x,
            y: y,
            size: this.symbolSize,
            symbol: this.p.random(this.symbolImages),
            rotation: 0,
          });
        }
        break;
    }
  }

  update() {
    this.lifeTime++;
    this.animationTime++; // Continuous counter that never resets

    // Only apply rotation for circle formations
    if (this.formationType === FORMATIONS.CIRCLE) {
      this.rotation += this.rotationStep;
    }

    // Apply sin wave movement for line formations
    if (this.formationType === FORMATIONS.LINE) {
      for (let i = 0; i < this.symbols.length; i++) {
        // Create a gentle wave effect with alternating phases using animationTime
        this.symbols[i].currentY =
          Math.sin(this.animationTime * 0.03 + i * 0.5) * 10;
      }
    }

    // Update state and opacity
    if (this.state === "fadeIn") {
      this.opacity = this.p.min(255, this.opacity + this.fadeInStep);
      if (this.opacity >= 255) {
        this.state = "display";
        this.lifeTime = 0;
      }
    } else if (this.state === "display") {
      if (this.lifeTime >= this.displayDuration) {
        this.state = "fadeOut";
      }
    } else if (this.state === "fadeOut") {
      this.opacity = this.p.max(0, this.opacity - this.fadeOutStep);
      if (this.opacity <= 0) {
        this.state = "done";
      }
    }
  }

  /**
   * Returns true if the given point (in centered canvas coordinates,
   * matching the WebGL renderer's origin) lies inside one of the visible
   * symbols of this formation. Used to make sigils clickable.
   */
  hitTest(mx: number, my: number): boolean {
    if (this.opacity < 60) return false;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    for (const symbol of this.symbols) {
      if (!symbol || !symbol.symbol) continue;
      const sy =
        symbol.currentY !== undefined ? symbol.y + symbol.currentY : symbol.y;
      const wx = this.x + symbol.x * cos - sy * sin;
      const wy = this.y + symbol.x * sin + sy * cos;
      const dx = mx - wx;
      const dy = my - wy;
      const r = symbol.size * 0.55;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  show() {
    if (this.opacity <= 0) return;
    const p = this.p;

    p.push();
    p.translate(this.x, this.y);
    p.rotate(this.rotation);

    // Draw all symbols with glow
    for (let symbol of this.symbols) {
      if (symbol && symbol.symbol) {
        p.push();
        // Use currentY for vertical offset if available (for line formations)
        const yPos =
          symbol.currentY !== undefined ? symbol.y + symbol.currentY : symbol.y;
        p.translate(symbol.x, yPos);
        p.rotate(-this.rotation); // Counter-rotate to keep symbols upright

        // --- Symbol ---
        p.noTint();
        p.tint(255, this.opacity);
        p.image(
          symbol.symbol,
          -symbol.size / 2,
          -symbol.size / 2,
          symbol.size,
          symbol.size,
        );
        p.pop();
      }
    }

    p.pop();
  }
}
