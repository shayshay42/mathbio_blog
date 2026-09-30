# Shayan’s research notebook

A minimal, responsive personal researcher blog inspired by the Carl Angel-5 pencil sharpener. A simple page brings together a short bio, research links, three full blog posts, project cards, and publications. White paper, restrained typography, an enamel palette, and an original cartoon-style 3D sharpener give the page its character.

## Continue on another machine

The development branch is `draft/research-notebook` in `shayshay42/mathbio_blog`. Source is stored on GitHub; GitHub Pages is disabled and no deployment workflow is included.

```sh
git clone --branch draft/research-notebook https://github.com/shayshay42/mathbio_blog.git
cd mathbio_blog
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://localhost:4173. The Lorenz article is at http://localhost:4173/notes/weighted-weak-lorenz.html. The OIL article is at http://localhost:4173/notes/oil-and-learned-optimization.html. All website assets and the displayed results are included in this repository; the original research workspace is not needed to view or edit the site.

The PANDA exploration is at http://localhost:4173/notes/steering-a-forecasting-model.html. It follows activation steering, a search for an oscillatory bifurcation, and an SMWM-inspired model of activation dynamics. Its three figures distinguish a separate toy system, an actual PANDA noise-to-cycle forecast edit, and measured control results.

Keep the agreed design: white paper, one font at two text sizes, minimal sections, the Carl Angel-5 model, and red/blue/black enamel choices. The Lorenz note now uses the provenance-matched extended figure with integral-matching Lorenz, Panda, and Chronos-T5, and records the later weak-loss Panda-to-SINDy experiment. The notebook contains the three full research entries; the sample posts and their dialog have been removed.

Future commits can be shared with `git push`. Keep deployment disabled until it is explicitly requested.

## Preview

Serve this directory to use the interactive 3D model:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Visit http://localhost:4173. No build or npm install is required. Typography uses Google Fonts, with local fallbacks when offline. Three.js is pinned and included locally. Opening `index.html` directly, disabling JavaScript, or using a browser without WebGL shows a rendered still of the same model.

## Editing

- `index.html`: biography, research links, note list, project cards, and sharpener viewer.
- `style.css`: layout, typography, responsive rules, enamel palette.
- `publications.html`: verified bioRxiv preprints, archive links, and research code.
- `assets/publications.bib`: full-author BibTeX citations for the listed preprints.
- `math.js`: shared LaTeX rendering for all `.blog-post` articles.
- `project-models.js`: original 3D adaptations of the Read the Room and Rizome marks.
- `project-viewer.js`: lazy, on-demand logo rendering and pointer/focus tilt.
- `assets/projects/`: rendered logo previews for loading, no-JavaScript, and no-WebGL views.
- `theme.js`: shared enamel theme, persisted across the homepage, articles, and publications.
- `notes/weighted-weak-lorenz.html`: research entry with verified Lorenz63 methods and core SINDy results.
- `notes/steering-a-forecasting-model.html`: short exploratory PANDA research note, with three figures and an open-ended conclusion.
- `assets/panda-steering/`: compact saved figure data, source provenance, four PNG/PDF panels, and a figure-regeneration script.
- `notes/oil-and-learned-optimization.html`: OIL, optimizer-field distillation, conditional flow matching, learned-region continuation, and completed RL preflights, with proposed extensions labeled separately.
- `assets/oil/`: original generated landscape, article-local styling, table CSV, evidence notes, and source/prompt provenance. The image illustrates the idea; it is not a measured loss surface.
- `assets/vendor/katex-0.18.9/`: pinned local math renderer, fonts, and MIT license. All three blogs use LaTeX `\(...\)` and `\[...\]` delimiters, rendered by the shared `math.js`; no CDN or installation is required.
- `assets/lorenz/results.csv`: exact VPT estimates and 95% intervals extracted from the accepted v2 bootstrap summary.
- `assets/lorenz/survival-extension.csv`: exact integral-matching, Panda, and Chronos summary values used in the extended figure discussion.
- `assets/lorenz/conditioner-results.csv`: exact source-gate and reserved-Lorenz values from the weak/Birkhoff conditioner study.
- `assets/lorenz/provenance.json`: source hash, extraction scope, and references.
- `sharpener-model.js`: editable 3D geometry and enamel materials; the crank is a separate rotating group.
- `sharpener-viewer.js`: studio lighting, pointer/keyboard controls, on-demand rendering, and WebGL fallback.
- `assets/angel-5.glb`: portable red model, including the drawer label and separate crank parts.
- `assets/angel-5-{red,blue,black}.png`: rendered fallback images of the model.
- `tools/export-sharpener.html`: open through the local server to export a fresh GLB after editing the geometry.
- `assets/vendor/THREE-README.md`: renderer version, source, build command, and license.
- `assets/angel-5.svg`: earlier editable vector illustration, retained for reference.

The Lorenz, PANDA, and OIL entries are research drafts grounded in saved experimental results and local evidence. The enamel controls switch between red, blue, and black and save the choice in the browser. Each research entry has a standalone HTML page. Article text works without JavaScript; equations remain readable LaTeX source until the local renderer runs. Shared math styles keep display equations horizontally scrollable on narrow screens and KaTeX provides accessible MathML.

The article uses the extended three-panel survival plot copied unchanged from `artifacts/v2/tsfm_integral_survival/forecast_survival__all_tracks__noisy_levels.png`; a matching PDF is included. Its PNG and PDF SHA256 hashes were verified against the source result manifest. The title-free plot uses one boxed legend, partitioned into four information-track columns and containing all 16 methods. The post explicitly separates state-only dynamics learning, known-form parameter estimation, exact-physics surrogates, externally pretrained forecasting, and the later amortized Panda-to-SINDy experiment.

Paths in `provenance.json` identify files in the original research workspace; they are provenance references, not website dependencies.

## Publications and profile

`publications.html` lists three verified bioRxiv preprints, newest first, with full citations in `assets/publications.bib`. Metadata was checked on September 30, 2026 against the bioRxiv API and publisher-deposited Crossref records:

- Immune phenotype: https://api.crossref.org/works/10.64898/2026.09.17.752366
- DiffDose: https://api.crossref.org/works/10.64898/2026.09.07.749974
- Latent space differentiation: https://api.crossref.org/works/10.64898/2026.03.04.709512

Posting dates follow bioRxiv, which differ by one day from the Mila listing for DiffDose and latent space differentiation. Author names follow deposited paper metadata; the latent-space paper lists Ali Saberi. These are labeled as preprints. Update the page and BibTeX together when adding papers or newer versions.

The shared navigation links to Notes, Projects, Publications, https://mila.quebec/en/directory/shayan-hajhashemi, and GitHub.

## Project cards

The homepage Projects section links directly to [Read the Room](https://readtheroom.site/) and [Rizome Biotech](https://www.rizomebiotech.ai/). Read the Room also links to [Soud Al Kharusi's development story](https://soudkharusi.com/projects/readtheroom-app/). Card descriptions follow those project websites.

Both logos use real beveled geometry with raised details: Read the Room's chameleon and Rizome's branching medallion. The visual references are the sites' [chameleon mark](https://readtheroom.site/images/RTR-logo_Aug2025.png) and [Rizome mark](https://www.rizomebiotech.ai/favicon.png). The geometry is a stylized adaptation; the project names and marks identify their respective projects.

Cards are ordinary links with decorative 3D views. The scenes initialize near the viewport, tilt with the pointer or keyboard focus, and remain still when idle or when reduced motion is requested. Touch gestures retain normal link and page scrolling behavior. Local PNGs preserve the appearance when JavaScript or WebGL is unavailable. Brand colors stay fixed when the notebook enamel changes. Re-render the previews if the geometry or lighting changes.

## Sharpener controls

Drag the model to rotate it, or focus it and use the arrow keys. Home resets the view; Enter, Space, or **Turn handle** turns the rear crank. Enamel controls change only the painted parts. The scene renders on demand and remains still when idle. Reduced-motion mode advances the crank one step without animation. On phones, vertical touch movement still scrolls the page.

The model uses one rounded shell with a drawer opening, an aligned bowed chrome face, short feed tabs, four low rubber pads, and a flat rear crank with a ribbed grip. The fallback PNGs use the same geometry, view, and lighting; regenerate them when the model changes. The GLB is an export for editing in other 3D tools; the homepage generates geometry directly from `sharpener-model.js`.

## PANDA figure regeneration

The PANDA panels are redrawn from a small, frozen data extract shipped with the site. They do not require PANDA, a GPU, the original activation arrays, or retraining. With NumPy and Matplotlib installed:

```sh
python3 assets/panda-steering/generate_figures.py
```

See `assets/panda-steering/README.md` for exact figure selections and provenance. The two control panels stack vertically on mobile; every panel links to its full-resolution PNG and a PDF download. The toy phase portrait is explicitly labeled as a separate mathematical example. The cyclic PANDA forecast comes from the H8 linear output-head intervention; the feedback experiment did not establish a Hopf or Neimark–Sacker bifurcation.

## Content and visual references

The research bio and interests come from https://github.com/shayshay42 . Project descriptions use the linked public repository descriptions:

- https://github.com/shayshay42/glioma_ddri
- https://github.com/shayshay42/neural_ode_benchmark
- https://github.com/shayshay42/spatial_transcriptomics_playground

Angel-5 appearance reference: https://www.carlmfg.com/angel-5-pencil-sharpener/ . The 3D geometry and earlier SVG are original stylized models, not dimensioned replicas; this personal site is not affiliated with CARL.

## GitHub Pages

This is a static site with relative asset paths and a `.nojekyll` file, suitable for either a root Pages site or a repository project site. The draft has not been published. To publish later, place these files at the chosen repository’s publishing root and configure that repository’s Pages source. No changes to the current research workspace are needed.
