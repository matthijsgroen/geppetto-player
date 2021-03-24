import { Vec2, Vec3, Vec4 } from "src/types";

export const flatten = (vectors: Vec2[] | Vec3[] | Vec4[]): number[] =>
  ((vectors as unknown) as number[][]).reduce<number[]>(
    (result, vec) => result.concat(vec),
    []
  );

export type PreparedFloatBuffer = {
  data: Float32Array;
  length: number;
  stride: number;
};

export type PreparedIntBuffer = {
  data: Int16Array;
  length: number;
  stride: number;
};

export const vectorArrayToPreparedFloatBuffer = (
  array: Vec2[] | Vec3[] | Vec4[]
): PreparedFloatBuffer => ({
  data: new Float32Array(flatten(array)),
  length: array.length,
  stride: array[0]?.length || 0,
});

export const vectorArrayToPreparedIntBuffer = (
  array: Vec2[] | Vec3[] | Vec4[]
): PreparedIntBuffer => ({
  data: new Int16Array(flatten(array)),
  length: array.length,
  stride: array[0]?.length || 0,
});
