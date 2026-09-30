# Three.js

Pinned version: **0.186.1**, MIT license (see `THREE-LICENSE`).

Source: https://registry.npmjs.org/three/-/three-0.186.1.tgz

`three.module.js` is the upstream WebGL module and core bundled together with esbuild 0.27.4:

```sh
esbuild package/build/three.module.js --bundle --minify --format=esm --outfile=three.module.js
```

`GLTFExporter.js` is upstream `examples/jsm/exporters/GLTFExporter.js`, with its `from 'three'` import changed to `from './three.module.js'`. Only the development export page loads it.

The homepage loads the local renderer and generates the model in JavaScript. No CDN, package install, or build is needed to view the site. The exported GLB is not fetched by the homepage.
