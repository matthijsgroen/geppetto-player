import { MutationVector, ShapeDefinition } from "./types";

interface ItemWithType {
  type: string;
}

export const isShapeDefinition = (
  item: ItemWithType
): item is ShapeDefinition => item.type === "folder" || item.type === "sprite";

export const isMutationVector = (item: ItemWithType): item is MutationVector =>
  item.type === "deform" ||
  item.type === "rotate" ||
  item.type === "translate" ||
  item.type === "stretch" ||
  item.type === "opacity";

export const walkShapes = (
  shapes: ShapeDefinition[],
  visitor: (
    item: ShapeDefinition | MutationVector,
    parents: (ShapeDefinition | MutationVector)[]
  ) => void,
  parents: (ShapeDefinition | MutationVector)[] = []
): void => {
  for (let shape of shapes) {
    visitor(shape, parents);
    for (let mutator of shape.mutationVectors) {
      visitor(mutator, [shape, ...parents]);
    }
    if (shape.type === "folder") {
      walkShapes(shape.items, visitor, [shape, ...parents]);
    }
  }
};
