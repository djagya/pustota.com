import "./style.css";
import p5 from "p5";
import { sketch } from "./render/sketch.ts";

// Add error handling
window.addEventListener("error", (e) => {
  console.error("Global error:", e.error);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});

new p5(sketch);
