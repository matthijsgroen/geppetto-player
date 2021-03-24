import { Vec2, Vec3, Vec4 } from "./types";
import { vectorArrayToPreparedIntBuffer } from "./buffer";

describe("vectorArrayToPreparedIntBuffer", () => {
  const vec4Array: Vec4[] = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
  ];
  const vec3Array: Vec3[] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ];
  const vec2Array: Vec2[] = [
    [1, 2],
    [3, 4],
    [5, 6],
    [7, 8],
    [9, 10],
  ];

  describe("stride", () => {
    it("sets the vector length as stride (Vec4)", () => {
      const result = vectorArrayToPreparedIntBuffer(vec4Array);
      expect(result.stride).toBe(4);
    });

    it("sets the vector length as stride (Vec3)", () => {
      const result = vectorArrayToPreparedIntBuffer(vec3Array);
      expect(result.stride).toBe(3);
    });

    it("sets the vector length as stride (Vec2)", () => {
      const result = vectorArrayToPreparedIntBuffer(vec2Array);
      expect(result.stride).toBe(2);
    });

    it("sets 0 as stride when array is empty", () => {
      const result = vectorArrayToPreparedIntBuffer([]);
      expect(result.stride).toBe(0);
    });
  });

  it("sets the buffer length based on length of vector array", () => {
    const v4 = vectorArrayToPreparedIntBuffer(vec4Array);
    expect(v4.length).toBe(2);

    const v3 = vectorArrayToPreparedIntBuffer(vec3Array);
    expect(v3.length).toBe(3);

    const v2 = vectorArrayToPreparedIntBuffer(vec2Array);
    expect(v2.length).toBe(5);
  });

  it("has a data property that is a flat list of Int16 type", () => {
    const v4 = vectorArrayToPreparedIntBuffer(vec4Array);
    expect(v4.data).toBeInstanceOf(Int16Array);
    expect(v4.data.length).toBe(8);

    const v3 = vectorArrayToPreparedIntBuffer(vec3Array);
    expect(v3.data).toBeInstanceOf(Int16Array);
    expect(v3.data.length).toBe(9);

    const v2 = vectorArrayToPreparedIntBuffer(vec2Array);
    expect(v2.data).toBeInstanceOf(Int16Array);
    expect(v2.data.length).toBe(10);
  });
});
