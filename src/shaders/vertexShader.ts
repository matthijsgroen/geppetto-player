import { PreparedImageDefinition } from "src/prepareAnimation";
import shader from "./vertexShader-min.vert";

export const animationVertexShader = (
  animation: PreparedImageDefinition
): string => `
  #define MAX_MUT ${animation.mutators.length}
  #define MAX_IT ${animation.maxIteration}
  uniform vec2 uControlMutValues[${animation.controlMutationValues.length}];
  uniform vec3 uMutValueIndices[${animation.mutationValueIndices.length}];
  uniform vec2 uControlMutIndices[${animation.controlMutationIndices.length}];
  uniform float uControlValues[${animation.controls.length}];
  ${shader}
`;
