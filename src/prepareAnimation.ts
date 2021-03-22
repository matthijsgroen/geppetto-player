import { ImageDefinition, MutationVector, ShapeDefinition } from "./types";

export type PreparedAnimation = {
  type: "preparedAnimation";
  resources: {
    mutatorCount: number;
  };
};

const isMutator = (
  item: ShapeDefinition | MutationVector
): item is MutationVector =>
  item.type === "deform" ||
  item.type === "opacity" ||
  item.type === "rotate" ||
  item.type === "stretch" ||
  item.type === "translate";

const walkShapes = (
  shapes: ShapeDefinition[],
  visitor: (item: ShapeDefinition | MutationVector) => void
): void => {
  for (let shape of shapes) {
    visitor(shape);
    for (let mutator of shape.mutationVectors) {
      visitor(mutator);
    }
    if (shape.type === "folder") {
      walkShapes(shape.items, visitor);
    }
  }
};

export const prepareAnimation = (
  imageDefinition: ImageDefinition
): PreparedAnimation => {
  let mutatorCount = 0;

  walkShapes(imageDefinition.shapes, (item) => {
    if (isMutator(item)) {
      mutatorCount++;
    }
  });

  return {
    type: "preparedAnimation",
    resources: {
      mutatorCount,
    },
  };
};
