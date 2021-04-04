precision mediump float;varying mediump vec2 vTextureCoord;varying mediump float vOpacity;uniform sampler2D uSampler;uniform mediump vec2 uTextureDimensions;void main(void){highp vec2 A=vTextureCoord.xy/uTextureDimensions;mediump vec4 B=texture2D(uSampler,A);gl_FragColor=vec4(B.rgb*B.a*vOpacity,B.a*vOpacity);}