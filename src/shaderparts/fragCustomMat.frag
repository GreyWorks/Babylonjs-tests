gl_FragColor=finalColor;
#if defined(DETAIL1)
  vec4 color_detail1 = texture2D(detail1Sampler, vAlbedoUV);
  gl_FragColor = vec4(color_detail1.rgb, 1.);
#endif
#if defined(DETAIL2)
  vec4 color_detail2 = texture2D(detail2Sampler, vAlbedoUV);
  gl_FragColor = vec4(color_detail2.rgb, 1.);
#endif
#if defined(NORMAL_D)
  gl_FragColor = vec4(1., 0., 1., 1.);
#endif
