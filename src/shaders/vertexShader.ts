import { PreparedAnimation } from "src/prepareAnimation";

const mutationControlShader = (animation: PreparedAnimation) => `
  uniform vec2 uControlMutationValues[${animation.controlMutationValues.length}];
  uniform vec3 uMutationValueIndices[${animation.mutationValueIndices.length}];
  uniform vec2 uControlMutationIndices[${animation.controlMutationIndices.length}];

  uniform float uControlValues[${animation.controls.length}];
  uniform vec2 uMutationValues[${animation.mutators.length}];

  vec2 getMutationValue(int mutationIndex, int mutationType) {
    vec2 result = uMutationValues[mutationIndex];
    vec2 controlMutations = uControlMutationIndices[mutationIndex];
    int start = int(controlMutations.x);
    int steps = int(controlMutations.y);
    if (steps == 0) {
      return result;
    }
    for(int i = 0; i < ${animation.maxIteration}; i++) {
      if (i < steps) {
        vec3 valueIndices = uMutationValueIndices[start + i];
        // x = offset
        // y = control value index
        // z = stepType
        float controlValue = uControlValues[int(valueIndices.y)];

        int startIndex = int(floor(valueIndices.x + controlValue));
        int endIndex = int(ceil(valueIndices.x + controlValue));
        float mixFactor = controlValue - floor(controlValue);

        vec2 mutAValue = uControlMutationValues[startIndex];
        vec2 mutBValue = uControlMutationValues[endIndex];
        vec2 mutValue = mix(mutAValue, mutBValue, mixFactor);

        if (mutationType == 2 || mutationType == 5) { // Stretch & Opacity
          result *= mutValue;
        } else {
          result += mutValue;
        }
      } else {
        return result;
      }
    }

    return result;
  }
`;

const mutationShader = (maxMutationVectors: number) => `
  #define PI_FRAC 0.017453292519943295

  // x = type, yz = origin, a = radius
  uniform vec4 uMutationVectors[${maxMutationVectors}];
  uniform float uMutationParent[${maxMutationVectors}];

  vec3 mutateOnce(vec3 startValue, int mutationIndex) {
    vec4 mutation = uMutationVectors[mutationIndex];
    int mutationType = int(mutation.x);

    vec2 mutationValue = getMutationValue(mutationIndex, mutationType);
    vec2 origin = mutation.yz;
    vec3 result = startValue;

    if (mutationType == 1) { // Translate
      float effect = 1.0;
      if (mutation.a > 0.0 && distance(startValue.xy, origin) > mutation.a) {
        effect = 0.0;
      }
      result = vec3(startValue.xy + mutationValue * effect, startValue.z);
    }

    if (mutationType == 2) { // Stretch
      result = vec3(origin.xy + vec2(
        (startValue.x - origin.x) * mutationValue.x, 
        (startValue.y - origin.y) * mutationValue.y
      ), startValue.z);
    }

    if (mutationType == 3) { // Rotation
      float rotation = mutationValue.x * PI_FRAC;
      mat2 entityRotationMatrix = mat2(cos(rotation), sin(rotation), -sin(rotation), cos(rotation));
      result = vec3((startValue.xy - origin) * entityRotationMatrix + origin, startValue.z);
    }

    if (mutationType == 4) { // Deform
      float effect = 1.0 - clamp(distance(startValue.xy, origin), 0.0, mutation.a) / mutation.a;	
      result = vec3(startValue.xy + mutationValue * effect, startValue.z);	
    }

    if (mutationType == 5) { // Opacity
      float opacity = mutationValue.x;
      result = vec3(startValue.xy, startValue.z * opacity);	
    }

    return result;
  }

  vec3 mutatePoint(vec3 startValue, int mutationIndex) {
    int currentNode = mutationIndex;
    vec3 result = startValue;

    for(int i = 0; i < ${maxMutationVectors}; i++) {
        if (currentNode == -1) {
            return result;
        }
        result = mutateOnce(result, currentNode);
        currentNode = int(uMutationParent[currentNode]);
    }
    return result;
  }

`;

export const animationVertexShader = (animation: PreparedAnimation): string => `
  uniform vec2 viewport;
  uniform vec3 basePosition;
  uniform vec3 translate;
  uniform float mutation;
  uniform vec4 scale;

  attribute vec2 coordinates;
  attribute vec2 aTextureCoord;

  varying lowp vec2 vTextureCoord;
  varying lowp float vOpacity;

  mat4 viewportScale = mat4(
    2.0 / viewport.x, 0, 0, 0,   
    0, -2.0 / viewport.y, 0, 0,    
    0, 0, 1, 0,    
    -1, +1, 0, 1
  );

  ${mutationControlShader(animation)}
  ${mutationShader(animation.mutators.length)}

  void main() {
    vec3 deform = mutatePoint(vec3(coordinates + translate.xy, 1.0), int(mutation));

    vec4 pos = viewportScale * vec4((deform.xy + basePosition.xy) * scale.x, translate.z, 1.0);
    gl_Position = vec4((pos.xy + scale.ba) * scale.y, pos.z, 1.0);
    vTextureCoord = aTextureCoord.xy;
    vOpacity = deform.z;
  }
`;
