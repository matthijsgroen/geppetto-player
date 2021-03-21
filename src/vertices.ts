export const interpolateFloat = (
  track: Float32Array,
  position: number,
  startValue = 0
): number => {
  for (let i = 0; i < track.length; i += 2) {
    if (track[i] > position) {
      const previousPos = i > 1 ? track[i - 2] : 0;
      const previousValue = i > 1 ? track[i - 1] : startValue;
      const mix = (position - previousPos) / (track[i] - previousPos);
      return previousValue * (1 - mix) + track[i + 1] * mix;
    }
  }

  return track[track.length - 1];
};
