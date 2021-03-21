import { PreparedAnimation } from "./types";

type Unsubscribe = () => void;

export type AnimationControls = {
  disable(): void;
  enable(): void;
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
};

interface AnimationOptions {
  panX: number;
  panY: number;
  zoom: number;
}

export type GeppettoPlayer = {
  addAnimation(
    animation: PreparedAnimation,
    image: HTMLImageElement,
    options?: Partial<AnimationOptions>
  ): AnimationControls;
  render: () => void;
};

export const createPlayer: (
  canvas: HTMLCanvasElement
) => GeppettoPlayer = () => ({
  addAnimation: () => ({
    enable() {},
    disable() {},
    destroy() {},
    setLooping() {},
    startTrack() {},
    stopTrack() {},
    setControlValue() {},
    setPanning() {},
    setZoom() {},

    onTrackStopped() {
      return () => {};
    },
    onEvent() {
      return () => {};
    },
    onControlChange() {
      return () => {};
    },
  }),
  render() {},
});
