import { PreparedFloatBuffer, PreparedIntBuffer } from "./buffer";
import { PreparedAnimation } from "./prepareAnimation";
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
    gl.deleteShader(vs);
    gl.deleteShader(fs);
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

const setProgramBuffer = (gl: WebGLRenderingContext, program: WebGLProgram) => (
  uniform: string,
  buffer: PreparedFloatBuffer | PreparedIntBuffer
) => {
  const uniformLocation = gl.getUniformLocation(program, uniform);
  console.log(
    `Setting uniform${buffer.stride}fv("${uniform}", number[${buffer.data.length}])`
  );
  const stride = buffer.stride;

  if (stride == 1) {
    gl.uniform1fv(uniformLocation, buffer.data);
  } else if (stride == 2) {
    gl.uniform2fv(uniformLocation, buffer.data);
  } else if (stride == 3) {
    gl.uniform3fv(uniformLocation, buffer.data);
  } else if (stride == 4) {
    gl.uniform4fv(uniformLocation, buffer.data);
  }
};

const setupTexture = (
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  image: HTMLImageElement,
  textureUnit: number
): WebGLTexture | null => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  gl.uniform2f(
    gl.getUniformLocation(program, "uTextureDimensions"),
    image.width,
    image.height
  );
  gl.uniform1i(gl.getUniformLocation(program, "uSampler"), textureUnit);

  return texture;
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
      animation: PreparedAnimation,
      image: HTMLImageElement,
      textureUnit: number
    ) => {
      console.log("Setup program and shaders");
      const [program, vs, fs] = setupWebGLProgram(gl, animation);
      // 3. Load texture
      gl.useProgram(program);
      console.log("Setup texture");
      const texture = setupTexture(gl, program, image, textureUnit);

      // 4. Set Uniforms
      const setBuffer = setProgramBuffer(gl, program);
      setBuffer("uMutationVectors", animation.mutators);
      setBuffer("uMutationParent", animation.mutatorParents);
      setBuffer("uMutationValues", animation.mutationValues);
      setBuffer("uControlMutationValues", animation.controlMutationValues);
      setBuffer("uMutationValueIndices", animation.mutationValueIndices);
      setBuffer("uControlMutationIndices", animation.controlMutationIndices);

      const uControlValues = gl.getUniformLocation(program, "uControlValues");
      gl.uniform1fv(uControlValues, animation.defaultControlValues);

      // 5. Set shape buffers
      console.log("Setup shape buffers");
      const vertexBuffer = gl.createBuffer();
      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        animation.shapeVertices.data,
        gl.STATIC_DRAW
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        animation.shapeIndices,
        gl.STATIC_DRAW
      );
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

      // Get locations for rendering
      const uBasePosition = gl.getUniformLocation(program, "basePosition");
      const uTranslate = gl.getUniformLocation(program, "translate");
      const uMutation = gl.getUniformLocation(program, "mutation");
      const uViewport = gl.getUniformLocation(program, "viewport");
      const uScale = gl.getUniformLocation(program, "scale");

      const aCoord = gl.getAttribLocation(program, "coordinates");
      const aTexCoord = gl.getAttribLocation(program, "aTextureCoord");

      let cWidth = 0,
        cHeight = 0;
      let basePosition = [0, 0, 0.1];
      let zoom = 1.0;
      let scale = 1.0;
      let pan = [0, 0];

      const newAnimation = {
        destroy() {
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.deleteProgram(program);
          gl.deleteTexture(texture);
          gl.deleteBuffer(vertexBuffer);
          gl.deleteBuffer(indexBuffer);
          animations.splice(animations.indexOf(newAnimation), 1);
        },
        setLooping() {},
        startTrack() {},
        stopTrack() {},
        setControlValue() {},
        setPanning() {},
        setZoom() {},
        render() {
          /**
           * [ ] uniform vec2 viewport;
           * [ ] uniform vec3 basePosition;
           * [ ] uniform vec3 translate;
           * [ ] uniform float mutation;
           * [ ] uniform vec4 scale;
           *
           */
          gl.useProgram(program);
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

          gl.vertexAttribPointer(
            aCoord,
            2,
            gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * 4,
            /* offset */ 0
          );
          gl.enableVertexAttribArray(aCoord);
          gl.vertexAttribPointer(
            aTexCoord,
            2,
            gl.FLOAT,
            false,
            Float32Array.BYTES_PER_ELEMENT * 4,
            /* offset */ 2 * Float32Array.BYTES_PER_ELEMENT
          );
          gl.enableVertexAttribArray(aTexCoord);

          if (element.width !== cWidth || element.height !== cHeight) {
            const canvasWidth = element.width;
            const canvasHeight = element.height;
            const landscape =
              image.width / canvasWidth > image.height / canvasHeight;

            scale = landscape
              ? canvasWidth / image.width
              : canvasHeight / image.height;

            gl.uniform2f(uViewport, canvasWidth, canvasHeight);

            basePosition = [
              canvasWidth / 2 / scale,
              canvasHeight / 2 / scale,
              0.1,
            ];
            cWidth = element.width;
            cHeight = element.height;
          }

          gl.uniform4f(uScale, scale, zoom, pan[0], pan[1]);
          gl.activeTexture(textureUnit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform3f(
            uBasePosition,
            basePosition[0],
            basePosition[1],
            basePosition[2]
          );

          console.log("render");

          for (let shape of animation.shapes) {
            gl.uniform3f(uTranslate, shape.x, shape.y, shape.z);
            gl.uniform1f(uMutation, shape.mutator);
            gl.drawElements(
              gl.TRIANGLES,
              shape.amount,
              gl.UNSIGNED_SHORT,
              shape.start
            );
          }
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
