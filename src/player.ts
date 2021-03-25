import { prepareAnimation, PreparedAnimation } from "./prepareAnimation";
import { animationFragmentShader } from "./shaders/fragmentShader";
import { animationVertexShader } from "./shaders/vertexShader";

type Unsubscribe = () => void;

export type AnimationControls = {
  destroy(): void;
  setLooping(loop: boolean, track: string): void;
  startTrack(track: string): void;
  stopTrack(track: string): void;
  setControlValue(control: string, value: number): void;
  setPanning(panX: number, panY: number): void;
  setZoom(zoom: number): void;

  onTrackStopped(callback: (track: string) => void): Unsubscribe;
  onEvent(
    callback: (eventName: string, track: string, time: number) => void
  ): Unsubscribe;
  onControlChange(
    callback: (control: number, value: number) => void
  ): Unsubscribe;
  render: () => void;
};

interface AnimationOptions {
  panX: number;
  panY: number;
  zoom: number;
}

export type GeppettoPlayer = {
  render: () => void;
  addAnimation(
    animation: PreparedAnimation,
    image: HTMLImageElement,
    textureUnit: number,
    options?: Partial<AnimationOptions>
  ): AnimationControls;
  destroy: () => void;
};

export const setupWebGL = (element: HTMLCanvasElement): GeppettoPlayer => {
  const gl = element.getContext("webgl2", {
    premultipliedalpha: true,
    depth: true,
    antialias: true,
    powerPreference: "low-power",
  }) as WebGLRenderingContext;

  if (!gl) {
    throw new Error("No WebGL Support");
  }

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return createPlayer(element);
};

const setupWebGLProgram = (
  gl: WebGLRenderingContext,
  animation: PreparedAnimation
): [WebGLProgram, WebGLShader, WebGLShader] => {
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create shader program");

  const vertexShaderSource = animationVertexShader(animation);
  const fragmentShaderSource = animationFragmentShader();

  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!vs || !fs) {
    gl.deleteProgram(program);
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    throw new Error("Failed to create shader program");
  }

  gl.shaderSource(vs, vertexShaderSource);
  gl.shaderSource(fs, fragmentShaderSource);
  gl.compileShader(vs);
  gl.compileShader(fs);

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Link failed: " + gl.getProgramInfoLog(program));
    console.error("vs info-log: " + gl.getShaderInfoLog(vs));
    console.error("fs info-log: " + gl.getShaderInfoLog(fs));
    throw new Error("Could not initialise shaders");
  }

  return [program, vs, fs];
};

export const createPlayer = (element: HTMLCanvasElement): GeppettoPlayer => {
  const gl = element.getContext("webgl2", {
    premultipliedalpha: true,
    depth: true,
    antialias: true,
    powerPreference: "low-power",
  }) as WebGLRenderingContext;

  const animations: AnimationControls[] = [];

  return {
    render: () => {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.viewport(0, 0, element.width, element.height);
    },
    addAnimation: (
      animation: PreparedAnimation
      //   image: HTMLImageElement,
      //   textureUnit: number
    ) => {
      const [program, vs, fs] = setupWebGLProgram(gl, animation);
      // 3. Load texture
      // 4. Setup attribute buffers
      // 5. Set uniforms

      const newAnimation = {
        destroy() {
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.deleteProgram(program);
          animations.splice(animations.indexOf(newAnimation), 1);
        },
        setLooping() {},
        startTrack() {},
        stopTrack() {},
        setControlValue() {},
        setPanning() {},
        setZoom() {},
        render() {
          console.log("render");
        },
        onTrackStopped() {
          return () => {};
        },
        onEvent() {
          return () => {};
        },
        onControlChange() {
          return () => {};
        },
      };
      animations.push(newAnimation);

      return newAnimation;
    },
    destroy() {
      for (let anim of animations) {
        anim.destroy();
      }
      animations.length = 0;
    },
  };
};
