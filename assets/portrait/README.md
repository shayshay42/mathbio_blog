# Homepage portrait

`shayan-3d.png` is a stylized portrait made from the LinkedIn photo supplied by Shayan in this conversation, using the built-in imagegen tool. The final image has a white background matching the page; it has no alpha channel. The first generation returned a painted checkerboard, so a second edit replaced it with a plain white background.

The portrait is a rendered image, not a volumetric head mesh. `portrait-viewer.js` tilts CSS depth layers containing the portrait and the original vector chalk symbols in `chalk-math.svg`. It uses no WebGL, has no idle animation, and stays still with reduced motion or touch input. The native portrait link opens Shayan’s LinkedIn page. The image and symbols remain visible without JavaScript.

## Initial prompt

Use case: style-transfer, identity-preserve.
Asset type: transparent 3D-rendered portrait cutout for a minimal academic personal website.
Input image: the attached LinkedIn portrait is the edit target and identity reference.
Primary request: transform this same person into a tasteful, softly sculpted 3D illustration with a ceramic/clay and satin enamel aesthetic. Remove the blackboard and all background completely.
Subject/invariants: keep his recognizable facial structure, warm medium skin tone, dark eyes, thick curly dark hair, short dark beard and moustache, natural reserved smile, head angle, and blue-teal quarter-zip fleece with collar and brass zip. Keep adult proportions, faithful likeness, and his original expression. Avoid a generic avatar face, exaggerated eyes, caricature, or adding glasses.
Composition: centered single bust, from crown to mid-chest, all hair and shoulders contained with comfortable transparent margin, straight-on view retaining the original slight head tilt. End the bust with a gently rounded sculptural lower edge rather than a rectangular photo crop. The complete bust should fill about 85% of the square canvas height.
Style: premium restrained cartoon 3D illustration, softly rounded sculpted forms, realistic facial proportions simplified carefully, subtly textured curly hair and fleece, warm satin skin and soft enamel-like blue clothing highlights. A physical miniature portrait sculpture, lit like the website's small enamel desk objects. Gentle studio light from upper left, soft dimensional shading.
Backdrop: genuinely transparent RGBA background with clean alpha edges. No chalkboard, no backdrop plane, no pedestal, no circle, no frame, no cast shadow outside the subject.
Constraints: this asset will be surrounded by independently floating chalk mathematics in the webpage, so generate ONLY the isolated person, with no mathematical symbols or text baked into this image. Preserve identity and clothing. No extra objects, labels, lettering, watermarks, or logos. Square composition, transparent output.

## Final edit prompt

Edit target: the attached generated portrait of Shayan. Keep exactly the same recognizable person, face shape, expression, head tilt, curly dark hair, short beard and blue-teal zip fleece.
Please correct this image for production use as a small 3D illustrated bust on a WHITE personal website. REMOVE THE ENTIRE CHECKERBOARD BACKGROUND. The checkerboard in this input is a mistake, not a desired design element. Replace it with uniform pure white RGB 255,255,255 to all four edges. No grey, no cream, no background texture, no gradient, no pattern or transparency-grid visualization anywhere.
Strengthen the restrained 3D clay sculpture/cartoon rendering a little: simplify skin and clothing into smooth gently rounded sculpted forms with satin ceramic lighting, and render hair as sculpted curly locks, while retaining this person's identity, adult facial proportions, dark eyes, beard and reserved smile. Keep clothing's blue and brass zip. Not hyperreal skin pores, not a photo cutout, not large cartoon eyes.
Keep the same complete crown-to-mid-chest bust with a rounded bottom edge, centered square composition and white space around all edges. Soft studio light from upper left. No pedestal, props, math, text, frames, logos, floor or external shadow. Background must be flat PURE WHITE.
