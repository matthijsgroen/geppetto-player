import { PreparedImageDefinition } from "src/prepareAnimation";
import shader from "./vertexShader.vert";

export const animationVertexShader = (
  animation: PreparedImageDefinition
): string => `
  #define MAX_MUT ${animation.mutators.length}
  #define MAX_IT ${animation.maxIteration}
  uniform vec2 uControlMutationValues[${animation.controlMutationValues.length}];
  uniform vec3 uMutationValueIndices[${animation.mutationValueIndices.length}];
  uniform vec2 uControlMutationIndices[${animation.controlMutationIndices.length}];
  uniform float uControlValues[${animation.controls.length}];
  ${shader}
`;
