# Geppetto player

[API documentation](https://matthijsgroen.github.io/geppetto-player)

Library for playing Geppetto animations. For the Desktop application to create the animations, see [the Geppetto website](https://matthijsgroen.github.io/geppetto)

## Minimal setup

This example is based on a build using Parcel2. For Webpack, change the way the url of the texture asset is referenced.

```typescript
import { setupWebGL, prepareAnimation } from "geppetto-player";
import backgroundImage from "url:./assets/landscape.png";
import backgroundAnimationData from "./assets/landscape.json";

const canvas = document.getElementById("theatre") as HTMLCanvasElement;
const player = setupWebGL(canvas);

const loadTexture = async (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    image.onload = () => resolve(image);
  });

const start = async () => {
  const bgTexture = await loadTexture(backgroundImage);
  const preppedBgAnim = prepareAnimation(backgroundAnimationData);
  const bgAnimationControl = player.addAnimation(preppedBgAnim, bgTexture, 0, {
    zoom: 2.0,
  });

  const box = canvas.getBoundingClientRect();
  canvas.width = box.width * window.devicePixelRatio;
  canvas.height = box.height * window.devicePixelRatio;

  // Start some animation tracks
  bgAnimationControl.startTrack("Waterwheel");
  bgAnimationControl.startTrack("Waterwheel2");
  bgAnimationControl.startTrack("Smoke");

  // Render each frame
  const renderFrame = () => {
    player.render();
    bgAnimationControl.render();
    window.requestAnimationFrame(renderFrame);
  };

  window.requestAnimationFrame(renderFrame);
};

start();
```

# License

[MIT](./LICENSE) (c) [Matthijs Groen](https://twitter.com/matthijsgroen)
