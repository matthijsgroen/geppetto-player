precision mediump float;

varying mediump vec2 vTextureCoord;
varying mediump float vOpacity;
uniform sampler2D uSampler;
uniform mediump vec2 uTextureDimensions;

void main(void) {
  highp vec2 coord = vTextureCoord.xy / uTextureDimensions;
  mediump vec4 texelColor = texture2D(uSampler, coord);

  gl_FragColor = vec4(texelColor.rgb * texelColor.a * vOpacity, texelColor.a * vOpacity);
}