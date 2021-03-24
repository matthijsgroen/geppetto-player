import { prepareAnimation } from "./prepareAnimation";
import { ImageDefinition } from "./types";

describe("prepareAnimation", () => {
  const imageDefinition: ImageDefinition = {
    shapes: [
      {
        name: "Folder",
        type: "folder",
        mutationVectors: [
          {
            name: "translate",
            type: "translate",
            origin: [30, 30],
            radius: -1,
          },
          {
            name: "hide",
            type: "opacity",
            origin: [30, 30],
          },
        ],
        items: [
          {
            name: "Layer1",
            type: "sprite",
            points: [
              [0, 0],
              [10, 10],
              [5, 5],
            ],
            translate: [20, 20],
            mutationVectors: [
              {
                name: "mutate",
                type: "deform",
                origin: [15, 15],
                radius: 30,
              },
              { name: "stretch", type: "stretch", origin: [18, 12] },
            ],
          },
          {
            name: "Layer2",
            type: "sprite",
            points: [
              [0, 0],
              [10, 10],
              [5, 5],
            ],
            translate: [20, 20],
            mutationVectors: [
              { name: "limb", type: "rotate", origin: [40, 34] },
            ],
          },
        ],
      },
    ],
    defaultFrame: {},
    controls: [],
    controlValues: {},
    animations: [],
  };

  describe("mutators buffer", () => {
    it("places all types of mutators", () => {
      const result = prepareAnimation(imageDefinition);
      const buffer = result.mutators;
      expect(buffer.length).toEqual(5);
      // translate
      expect(buffer.data.slice(0, 4)).toEqual(
        new Float32Array([1, 30, 30, -1])
      );
      // opacity
      expect(buffer.data.slice(4, 8)).toEqual(
        new Float32Array([5, 30, 30, -1])
      );
      // mutate
      expect(buffer.data.slice(8, 12)).toEqual(
        new Float32Array([4, 15, 15, 30])
      );
      // stretch
      expect(buffer.data.slice(12, 16)).toEqual(
        new Float32Array([2, 18, 12, -1])
      );
      // rotate
      expect(buffer.data.slice(16, 20)).toEqual(
        new Float32Array([3, 40, 34, -1])
      );
    });
  });

  describe("mutatorParents buffer", () => {
    it("uses -1 if mutator has no parent", () => {
      const result = prepareAnimation(imageDefinition);
      const buffer = result.mutatorParents;
      expect(buffer.data[0]).toEqual(-1);
    });

    it("links to the parent mutation of a parent folder", () => {
      const result = prepareAnimation(imageDefinition);
      const buffer = result.mutatorParents;
      expect(buffer.data[2]).toEqual(1);
      expect(buffer.data[4]).toEqual(1);
    });

    it("links to the parent mutation of a mutator earlier on same level", () => {
      const result = prepareAnimation(imageDefinition);
      const buffer = result.mutatorParents;
      expect(buffer.data[1]).toEqual(0);
      expect(buffer.data[3]).toEqual(2);
    });
  });
});
