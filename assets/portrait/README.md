# Homepage portrait

`shayan-cutout.png` is the silhouette cutout of Shayan’s original photograph, `source/linkedin_dp.jpeg`, supplied for this website. The source is preserved unchanged. No image generation, face retouching, color correction, or resampling was used.

Apple Vision’s foreground-instance mask removes the chalkboard by changing only transparency. Every RGB channel in the cropped output matches ImageIO’s decoded source pixels exactly, including the hair, face, and fleece. Fully transparent pixels retain their original RGB values; some image inspection tools ignore alpha and may show the hidden chalkboard. Browsers display the transparent silhouette.

- Source: 800 × 800 JPEG; SHA-256 `ae008483b4ca3f592f51a5f813284f7ffb176854b4d6ca600b2a4f4f6e32d67b`.
- Crop: top-left `(124, 176)`, size `597 × 624`, in source pixels; twelve pixels of padding where the source bounds allow it.
- Output: RGBA PNG, with 170,229 fully transparent pixels and 189,051 fully opaque pixels; soft mask edges preserve hair detail.

To reproduce the cutout on macOS 14 or later with Apple’s command-line developer tools, run from the repository root. The tool requires a new output path and preserves the input:

```sh
swiftc -O tools/cutout-portrait.swift -o /tmp/cutout-portrait
/tmp/cutout-portrait assets/portrait/source/linkedin_dp.jpeg /tmp/shayan-cutout.png
```

The tool reports its mask method, crop coordinates, and source checksum. Vision mask output can vary across macOS releases. The committed PNG works on all site visitors’ devices without Apple Vision or any runtime background removal.

`portrait-viewer.js` adds a small pointer/focus tilt to CSS depth layers holding the photo and the vector chalk symbols in `chalk-math.svg`. The portrait links to LinkedIn. It stays static for reduced motion and touch input, and remains visible without JavaScript or WebGL.

## Sweater colors

The enamel picker also controls the fleece. Blue uses the original `shayan-cutout.png` unchanged. Red, black, and green load the matching `shayan-cutout-{color}.png`.

`tools/color-portrait.swift` makes these variants with ordinary pixel color adjustments. A soft blue-fabric matte follows the fleece, with protected areas for the undershirt, zipper, and embroidered label. The transform retains texture and shading; alpha and pixels outside the garment matte are unchanged. The source photograph and blue cutout are preserved.

To regenerate the three variants from the repository root:

```sh
swiftc -O tools/color-portrait.swift -o /tmp/color-portrait
/tmp/color-portrait assets/portrait/shayan-cutout.png assets/portrait
```

The matte is calibrated to this specific 597 × 624 cutout. An optional third argument writes a diagnostic mask PNG. The tool replaces the three derived color files when rerun.

`theme.js` shares the existing enamel choice and its saved preference with the portrait. It decodes a color image before displaying it, ignores superseded requests, and keeps the current photograph if a download fails. Without JavaScript, the original blue photograph remains visible. No image processing runs in visitors’ browsers.
