# Shayan’s research notebook

A minimal, responsive personal researcher blog inspired by the Carl Angel-5 pencil sharpener. A simple page brings together a short bio, research links, and sample notes. White paper, restrained typography, an enamel palette, and the original SVG sharpener give the page its character.

## Continue on another machine

The development branch is `draft/research-notebook` in `shayshay42/mathbio_blog`. Source is stored on GitHub; GitHub Pages is disabled and no deployment workflow is included.

```sh
git clone --branch draft/research-notebook https://github.com/shayshay42/mathbio_blog.git
cd mathbio_blog
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://localhost:4173. The Lorenz article is at http://localhost:4173/notes/weighted-weak-lorenz.html. All website assets and the displayed results are included in this repository; the original research workspace is not needed to view or edit the site.

The PANDA exploration is at http://localhost:4173/notes/steering-a-forecasting-model.html. It follows activation steering, a search for an oscillatory bifurcation, and an SMWM-inspired model of activation dynamics. Its three figures distinguish a separate toy system, an actual PANDA noise-to-cycle forecast edit, and measured control results.

Keep the agreed design: white paper, one font at two text sizes, minimal sections, the Carl Angel-5 illustration, and red/blue/black enamel choices. The Lorenz note now uses the provenance-matched extended figure with integral-matching Lorenz, Panda, and Chronos-T5, and records the later weak-loss Panda-to-SINDy experiment. The three remaining sample notes are placeholders.

Future commits can be shared with `git push`. Keep deployment disabled until it is explicitly requested.

## Preview

Open `index.html` in a browser, or serve this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Visit http://localhost:4173. No build or npm install is required. Typography uses Google Fonts, with local fallbacks when offline.

## Editing

- `index.html`: biography, research links, note list, and sharpener illustration.
- `style.css`: layout, typography, responsive rules, enamel palette.
- `script.js`: sample note bodies and accessible note dialog.
- `theme.js`: shared enamel theme, persisted across the homepage and article.
- `notes/weighted-weak-lorenz.html`: research entry with verified Lorenz63 methods and core SINDy results.
- `notes/steering-a-forecasting-model.html`: short exploratory PANDA research note, with three figures and an open-ended conclusion.
- `assets/panda-steering/`: compact saved figure data, source provenance, four PNG/PDF panels, and a figure-regeneration script.
- `assets/lorenz/results.csv`: exact VPT estimates and 95% intervals extracted from the accepted v2 bootstrap summary.
- `assets/lorenz/survival-extension.csv`: exact integral-matching, Panda, and Chronos summary values used in the extended figure discussion.
- `assets/lorenz/conditioner-results.csv`: exact source-gate and reserved-Lorenz values from the weak/Birkhoff conditioner study.
- `assets/lorenz/provenance.json`: source hash, extraction scope, and references.
- `assets/angel-5.svg`: original editable vector illustration.

The Lorenz and PANDA entries are research drafts grounded in saved experimental results. The other three entries are original sample copy, explicitly labeled as samples; replace them before publishing. The enamel controls switch between red, blue, and black and save the choice in the browser. Sample notes open in a dialog; the research entries have standalone HTML pages and work without JavaScript.

The article uses the extended three-panel survival plot copied unchanged from `artifacts/v2/tsfm_integral_survival/forecast_survival__all_tracks__noisy_levels.png`; a matching PDF is included. Its PNG and PDF SHA256 hashes were verified against the source result manifest. The title-free plot uses one boxed legend, partitioned into four information-track columns and containing all 16 methods. The post explicitly separates state-only dynamics learning, known-form parameter estimation, exact-physics surrogates, externally pretrained forecasting, and the later amortized Panda-to-SINDy experiment.

Paths in `provenance.json` identify files in the original research workspace; they are provenance references, not website dependencies.

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

Angel-5 appearance reference: https://www.carlmfg.com/angel-5-pencil-sharpener/ . The SVG is an original stylized illustration; this personal site is not affiliated with CARL.

## GitHub Pages

This is a static site with relative asset paths and a `.nojekyll` file, suitable for either a root Pages site or a repository project site. The draft has not been published. To publish later, place these files at the chosen repository’s publishing root and configure that repository’s Pages source. No changes to the current research workspace are needed.
