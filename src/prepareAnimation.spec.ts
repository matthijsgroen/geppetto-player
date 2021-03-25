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
    defaultFrame: {
      hide: [1, 0],
      stretch: [1, 1],
      translate: [0, 0],
      mutate: [2, 0],
      limb: [45, 0],
    },
    controls: [
      {
        name: "Control1",
        type: "slider",
        steps: [
          { mutate: [15, 0], limb: [200, 0] },
          { mutate: [-15, 0], limb: [120, 0] },
        ],
      },
      {
        name: "Control2",
        type: "slider",
        steps: [
          { hide: [1, 0], limb: [-20, 0] },
          { hide: [0.2, 0], limb: [-60, 0] },
        ],
      },
    ],
    controlValues: {
      Control1: 0.3,
      Control2: 0.1,
    },
    animations: [
      {
        name: "AnimationTrack",
        looping: false,
        keyframes: [
          {
            time: 2000,
            controlValues: {
              Control1: 0,
              Control2: 0.4,
            },
          },
          {
            time: 4000,
            controlValues: {
              Control1: 0.7,
            },
          },
          {
            time: 6200,
            controlValues: {
              Control1: 1.0,
              Control2: 1.0,
            },
          },
        ],
      },
    ],
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

  describe("mutationValues", () => {
    it("places all mutation values in order in a buffer", () => {
      const result = prepareAnimation(imageDefinition);
      const buffer = result.mutationValues;
      expect(buffer.data).toEqual(
        new Float32Array([0, 0, 1, 0, 2, 0, 1, 1, 45, 0])
      );
    });
  });

  describe("control administration", () => {
    it("builds a structure to link control mechanics to mutation values", () => {
      const {
        controlMutationValues,
        controlMutationIndices,
        mutationValueIndices,
        maxIteration,
        mutators,
      } = prepareAnimation(imageDefinition);

      // These are all the values of control steps listed above:
      expect(controlMutationValues.stride).toEqual(2);
      expect(controlMutationValues.data).toEqual(
        // prettier-ignore
        new Float32Array([
          15, 0, -15, 0,  // Control1.mutate: [15, 0], [-15, 0]
          200, 0, 120, 0, // Control1.limb: [200, 0], [120, 0]
          1, 0, 0.2, 0,   // Control2.hide: [1, 0], [0.2, 0]
          -20, 0, -60, 0, // Control2.limb: [-20, 0], [-60, 0]
        ])
      );

      // under what control is a certain mutation
      // this is a Vec2
      expect(controlMutationIndices.stride).toEqual(2);
      expect(controlMutationIndices.length).toEqual(mutators.length);
      expect(controlMutationIndices.data).toEqual(
        // 0. translate 0, 0 - not under control
        // 1. hide 0, 1 - under control by one control (index 0 start)
        // 2. mutate 1, 1 - under control by one control (index 1 start)
        // 3. stretch 0, 0 - not under control
        // 4. limb 2, 2 - under control by two contorls (index 2 start)
        new Int16Array([0, 0, 0, 1, 1, 1, 0, 0, 2, 2])
      );

      expect(mutationValueIndices.stride).toEqual(3);
      expect(mutationValueIndices.data).toEqual(
        // index 0 = 4, 1, 0. (hide)
        //   values start at 4 (see controlMutationValues)
        //   controlValue = 1 (2nd controller)
        //   controlType = 0 (default for now)

        // index 1 = 0, 0, 0. (mutate)
        //   values start at 0 (see controlMutationValues)
        //   controlValue = 0 (1st controller)
        //   controlType = 0 (default for now)

        // index 2 = 2, 0, 0. (limb)
        //   values start at 2 (see controlMutationValues)
        //   controlValue = 0 (1st controller)
        //   controlType = 0 (default for now)

        // index 3 = 6, 1, 0. (limb)
        //   values start at 6 (see controlMutationValues)
        //   controlValue = 1 (2nd controller)
        //   controlType = 0 (default for now)

        new Int16Array([4, 1, 0, 0, 0, 0, 2, 0, 0, 6, 1, 0])
      );

      expect(maxIteration).toEqual(2);
    });

    it("reports what controls there are", () => {
      const { controls } = prepareAnimation(imageDefinition);
      expect(controls).toEqual([
        { name: "Control1", steps: 2 },
        { name: "Control2", steps: 2 },
      ]);
    });
  });

  describe("animations", () => {
    it("makes a track per control in each animation", () => {
      const { animations } = prepareAnimation(imageDefinition);
      expect(animations).toEqual([
        {
          name: "AnimationTrack",
          looping: false,
          tracks: {
            "0": new Float32Array([2000, 0, 4000, 0.7, 6200, 1.0]),
            "1": new Float32Array([2000, 0.4, 6200, 1.0]),
          },
        },
      ]);
    });
  });
});
