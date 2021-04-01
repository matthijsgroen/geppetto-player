import Delaunator from "delaunator";
import {
  flatten,
  PreparedFloatBuffer,
  PreparedIntBuffer,
  vectorArrayToPreparedFloatBuffer,
  vectorArrayToPreparedIntBuffer,
} from "./buffer";
import { isMutationVector, isShapeDefinition, walkShapes } from "./traverse";
import {
  ImageDefinition,
  MutationVector,
  ShapeDefinition,
  SpriteDefinition,
  Vec2,
  Vec3,
  Vec4,
} from "./types";

const getAnchor = (sprite: SpriteDefinition): Vec2 => {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  sprite.points.forEach(([x, y]) => {
    minX = x < minX ? x : minX;
    maxX = x > maxX ? x : maxX;
    minY = y < minY ? y : minY;
    maxY = y > maxY ? y : maxY;
  });

  return [(minX + maxX) / 2, (minY + maxY) / 2];
};

export const fileredTriangles = (points: number[][]): number[] =>
  Delaunator.from(points).triangles;

const vectorTypeMapping = {
  translate: 1,
  stretch: 2,
  rotate: 3,
  deform: 4,
  opacity: 5,
};

const mutatorToVec4 = (mutator: MutationVector): Vec4 => [
  vectorTypeMapping[mutator.type],
  mutator.origin[0],
  mutator.origin[1],
  mutator.type === "deform" || mutator.type === "translate"
    ? mutator.radius
    : -1,
];

const getParentMutation = (
  parents: (ShapeDefinition | MutationVector)[],
  self?: MutationVector
): MutationVector | null => {
  const parentShape = parents[parents.length - 1];
  if (isShapeDefinition(parentShape)) {
    const mutatorIndex = self ? parentShape.mutationVectors.indexOf(self) : -1;
    if (mutatorIndex > 0) {
      return parentShape.mutationVectors[mutatorIndex - 1];
    }
    for (let i = parents.length - (self ? 2 : 1); i >= 0; i--) {
      const shape = parents[i];
      if (
        shape &&
        isShapeDefinition(shape) &&
        shape.mutationVectors.length > 0
      ) {
        return shape.mutationVectors[shape.mutationVectors.length - 1];
      }
    }
  }
  return null;
};

export const createMutationList = (
  shapes: ShapeDefinition[]
): {
  parentList: Int16Array;
  vectorSettings: Vec4[];
  shapeMutatorMapping: Record<string, number>;
  mutatorMapping: Record<string, number>;
} => {
  const mutatorIndices: { name: string; index: number; parent: number }[] = [];
  const mutators: Vec4[] = [];

  const mutatorMapping: Record<string, number> = {};

  walkShapes(shapes, (item, parents) => {
    if (isMutationVector(item)) {
      const value = mutatorToVec4(item);
      const index = mutators.length;
      mutators.push(value);

      const parentMutation = getParentMutation(parents, item);
      const mutatorIndex =
        parentMutation === null
          ? -1
          : mutatorIndices.findIndex((e) => e.name === parentMutation.name);
      mutatorIndices.push({ name: item.name, index, parent: mutatorIndex });
      mutatorMapping[item.name] = mutatorIndex;
    }
    return undefined;
  });

  const shapeMutatorMapping: Record<string, number> = {};
  walkShapes(shapes, (item, parents) => {
    if (isShapeDefinition(item)) {
      const parentMutation = getParentMutation(parents.concat(item));
      const mutatorIndex =
        parentMutation === null
          ? -1
          : mutatorIndices.findIndex((e) => e.name === parentMutation.name);

      shapeMutatorMapping[item.name] = mutatorIndex;
    }
    return undefined;
  });

  const parentList = new Int16Array(mutators.length);
  mutatorIndices.forEach((item, index) => {
    parentList[index] = item.parent;
  });

  return {
    mutatorMapping,
    parentList,
    vectorSettings: mutators,
    shapeMutatorMapping,
  };
};

const convertAnimations = (
  imageDefinition: ImageDefinition
): PreparedImage[] => {
  const controlNames = imageDefinition.controls.map((c) => c.name);
  return imageDefinition.animations.map<PreparedImage>((a) => {
    const tracks: [number, Float32Array][] = [];

    const trackControls = a.keyframes
      .reduce<string[]>(
        (result, frame) => result.concat(Object.keys(frame.controlValues)),
        []
      )
      .filter((v, i, l) => l.indexOf(v) === i);

    trackControls.forEach((controlName) => {
      const frames: Vec2[] = [];
      a.keyframes.forEach((frame) => {
        const value = frame.controlValues[controlName];
        if (value !== undefined) {
          frames.push([frame.time, value]);
        }
      });
      tracks.push([
        controlNames.indexOf(controlName),
        new Float32Array(flatten(frames)),
      ]);
    });

    return {
      name: a.name,
      duration: a.keyframes[a.keyframes.length - 1].time,
      looping: a.looping,
      tracks,
    };
  });
};

export type PreparedControl = {
  name: string;
  steps: number;
};

export type PreparedShape = {
  name: string;
  start: number;
  amount: number;
  mutator: number;
  x: number;
  y: number;
  z: number;
};

export type PreparedImage = {
  name: string;
  duration: number;
  looping: boolean;
  tracks: [number, Float32Array][];
};

export type PreparedImageDefinition = {
  mutators: PreparedFloatBuffer;
  mutatorParents: PreparedIntBuffer;
  mutationValues: PreparedFloatBuffer;
  controlMutationValues: PreparedFloatBuffer;
  mutationValueIndices: PreparedIntBuffer;
  controlMutationIndices: PreparedIntBuffer;
  shapeVertices: PreparedFloatBuffer;
  shapeIndices: Uint16Array;
  shapes: PreparedShape[];
  maxIteration: number;
  controls: PreparedControl[];
  defaultControlValues: Float32Array;
  animations: PreparedImage[];
};

/**
 * Convert the JSON based input animation file into a preprocessed list of buffers to place into WebGL
 *
 * @param imageDefinition
 * @returns PreparedAnimation
 */
export const prepareAnimation = (
  imageDefinition: ImageDefinition
): PreparedImageDefinition => {
  if (imageDefinition.version !== "1.0") {
    throw new Error("Only version 1.0 files are supported");
  }

  const elements: PreparedShape[] = [];
  const vertices: Vec4[] = [];
  const indices: number[] = [];

  walkShapes(imageDefinition.shapes, (shape) => {
    if (shape.type !== "sprite") return;

    const anchor = getAnchor(shape);
    const shapeIndices = fileredTriangles(shape.points);
    const itemOffset = [...shape.translate, elements.length * 0.1];
    const offset = vertices.length;

    elements.push({
      name: shape.name,
      start: indices.length * 2,
      amount: shapeIndices.length,
      mutator: 0,
      x: itemOffset[0],
      y: itemOffset[1],
      z: -0.9 + itemOffset[2] * 0.0001,
    });

    shape.points.forEach(([x, y]) => {
      vertices.push([x - anchor[0], y - anchor[1], x, y]);
    });

    shapeIndices.forEach((index) => {
      indices.push(index + offset);
    });
  });

  const mutatorInfo = createMutationList(imageDefinition.shapes);
  const mutatorCount = mutatorInfo.parentList.length;
  const mutators = Object.keys(mutatorInfo.mutatorMapping);
  const controls: PreparedControl[] = [];

  const mutationValues = new Float32Array(mutatorCount * 2);
  Object.entries(imageDefinition.defaultFrame).forEach(([key, value]) => {
    const index = mutators.indexOf(key);
    if (index === -1) return;
    mutationValues[index * 2] = value[0];
    mutationValues[index * 2 + 1] = value[1];
  });

  type ControlData = {
    name: string;
    controlIndex: number;
    valueStartIndex: number;
    values: Vec2[];
    stepType: number;
  };

  type MutationControl = {
    [key: number]: {
      controls: ControlData[];
    };
  };

  const controlMutationValueList: Vec2[] = [];
  const mutationValueIndicesList: Vec3[] = [];
  const controlMutationIndicesList: Vec2[] = [];

  elements.forEach((element) => {
    element.mutator = mutatorInfo.shapeMutatorMapping[element.name];
  });
  elements.sort((a, b) => (b.z || 0) - (a.z || 0));

  const controlValues = new Float32Array(imageDefinition.controls.length);
  const mutationControlData: MutationControl = imageDefinition.controls.reduce<MutationControl>(
    (result, control, index) => {
      const controlMutations = control.steps.reduce<string[]>(
        (result, frame) =>
          result.concat(
            Object.keys(frame).filter((name) => !result.includes(name))
          ),
        []
      );
      controls.push({
        name: control.name,
        steps: control.steps.length,
      });
      controlValues[index] = imageDefinition.controlValues[control.name];
      controlMutations.forEach((mutation) => {
        const index = mutators.indexOf(mutation);
        const values: Vec2[] = control.steps.map((k) => k[mutation]);
        const controlIndex =
          imageDefinition?.controls.findIndex((c) => c.name === control.name) ||
          0;

        const controlData: ControlData = {
          name: control.name,
          controlIndex,
          valueStartIndex: controlMutationValueList.length,
          values,
          stepType: 0,
        };
        controlMutationValueList.push(...values);

        result = {
          ...result,
          [index]: {
            controls: ((result[index] || {}).controls || []).concat(
              controlData
            ),
          },
        };
      });
      return result;
    },
    {}
  );

  const amountIndices = Math.max(
    ...Object.keys(mutationControlData).map((key) => parseInt(key, 10))
  );
  controlMutationIndicesList.length = amountIndices;
  controlMutationIndicesList.fill([0, 0]);

  let maxIteration = 0;

  Object.entries(mutationControlData).forEach(([key, value]) => {
    const items: Vec3[] = value.controls.map<Vec3>((d) => [
      d.valueStartIndex,
      d.controlIndex,
      d.stepType,
    ]);

    controlMutationIndicesList[parseInt(key, 10)] = [
      mutationValueIndicesList.length,
      items.length,
    ];
    maxIteration = Math.max(maxIteration, items.length);
    mutationValueIndicesList.push(...items);
  });

  return {
    mutators: vectorArrayToPreparedFloatBuffer(mutatorInfo.vectorSettings),
    mutatorParents: {
      data: mutatorInfo.parentList,
      length: mutatorInfo.parentList.length,
      stride: 1,
    },
    mutationValues: {
      data: mutationValues,
      length: mutatorInfo.parentList.length,
      stride: 2,
    },
    controlMutationValues: vectorArrayToPreparedFloatBuffer(
      controlMutationValueList
    ),
    mutationValueIndices: vectorArrayToPreparedIntBuffer(
      mutationValueIndicesList
    ),
    controlMutationIndices: vectorArrayToPreparedIntBuffer(
      controlMutationIndicesList
    ),
    defaultControlValues: controlValues,
    shapeVertices: vectorArrayToPreparedFloatBuffer(vertices),
    shapeIndices: new Uint16Array(indices),
    shapes: elements,
    controls,
    maxIteration,
    animations: convertAnimations(imageDefinition),
  };
};
