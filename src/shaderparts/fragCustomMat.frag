vec2 uvOffset = vec2(0.0, 0.0);

#if defined(BUMP) || defined(PARALLAX)
	#ifdef NORMALXYSCALE
		float normalScale = 1.0;
	#else		
		float normalScale = vBumpInfos.y;
	#endif

	#if defined(TANGENT) && defined(NORMAL)
		mat3 TBN = vTBN;
	#else
		mat3 TBN = cotangent_frame(normalW * normalScale, vPositionW, vBumpUV);
	#endif
#elif defined(ANISOTROPIC)
	#if defined(TANGENT) && defined(NORMAL)
		mat3 TBN = vTBN;
	#else
		mat3 TBN = cotangent_frame(normalW, vPositionW, vMainUV1, vec2(1., 1.));
	#endif
#else
	// fallbacks for detail maps
	float normalScale = 1.0;
	mat3 TBN = cotangent_frame(normalW * normalScale, vPositionW, vAlbedoUV);
#endif

#ifdef PARALLAX
	mat3 invTBN = transposeMat3(TBN);

	#ifdef PARALLAXOCCLUSION
		uvOffset = parallaxOcclusion(invTBN * -viewDirectionW, invTBN * normalW, vBumpUV, vBumpInfos.z);
	#else
		uvOffset = parallaxOffset(invTBN * viewDirectionW, vBumpInfos.z);
	#endif
#endif

#ifdef BUMP
	#ifdef OBJECTSPACE_NORMALMAP
		normalW = normalize(texture2D(bumpSampler, vBumpUV).xyz  * 2.0 - 1.0);
		normalW = normalize(mat3(normalMatrix) * normalW);	
	#else
		normalW = perturbNormal(TBN, vBumpUV + uvOffset);
	#endif
#endif

// Assume tangent space for detail textures
#ifdef DETAIL1
	vec2 uvDet1 = vec2(detail1Matrix * vec4(vMainUV1 + uvOffset, 1.0, 0.0));
	normalW = perturbNormal(
		cotangent_frame(normalW, vPositionW, vMainUV1),  // recalculated TBN
		texture2D(detail1Sampler, uvDet1).xyz,
		vDetail1Infos.z); // level * multiplier
  normalW = normalize(normalW);
#endif
#ifdef DETAIL2
	vec2 uvDet2 = vec2(detail2Matrix * vec4(vMainUV1 + uvOffset, 1.0, 0.0));
	normalW = perturbNormal(
		cotangent_frame(normalW, vPositionW, vMainUV1),  // recalculated TBN
		texture2D(detail2Sampler, uvDet2).xyz,
		vDetail2Infos.z); // level * multiplier
    normalW = normalize(normalW);
#endif