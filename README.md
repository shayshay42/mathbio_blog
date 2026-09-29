# Shayan’s research notebook

A minimal, responsive personal researcher blog inspired by the Carl Angel-5 pencil sharpener. A simple page brings together a short bio, research links, and sample notes. Cream paper, restrained typography, an enamel palette, and the original SVG sharpener give the page its character.

## Continue on another machine

The development branch is `draft/research-notebook` in `shayshay42/mathbio_blog`. Source is stored on GitHub; GitHub Pages is disabled and no deployment workflow is included.

```sh
git clone --branch draft/research-notebook https://github.com/shayshay42/mathbio_blog.git
cd mathbio_blog
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://localhost:4173. The Lorenz article is at http://localhost:4173/notes/weighted-weak-lorenz.html. All website assets and the displayed results are included in this repository; the original research workspace is not needed to view or edit the site.

Keep the agreed design: cream paper, one font at two text sizes, minimal sections, the Carl Angel-5 illustration, and red/blue/black enamel choices. The next content task is replacing the Lorenz plot with the newer version from the other machine, which adds integral-matching Lorenz, Panda, and Chronos-T5. Update the article and provenance to match that figure rather than inferring new results from its curves. The three remaining sample notes are placeholders.

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
- `assets/lorenz/results.csv`: exact VPT estimates and 95% intervals extracted from the accepted v2 bootstrap summary.
- `assets/lorenz/provenance.json`: source hash, extraction scope, and references.
- `assets/angel-5.svg`: original editable vector illustration.

The Lorenz entry is a research draft grounded in the local accepted v2 results. The other three entries are original sample copy, explicitly labeled as samples; replace them before publishing. The enamel controls switch between red, blue, and black and save the choice in the browser. Sample notes open in a dialog; the research entry has a standalone HTML page and works without JavaScript.

The article currently uses the latest local v2 three-panel survival plot, copied unchanged from `results/v2/visualizations/forecast_survival__all_tracks__noisy_levels.png`; a matching PDF is included. The source image SHA256 was verified against its result manifest. To use the newer plot later, replace `assets/lorenz/forecast-survival.png` and its PDF, update the image dimensions, caption, alt text, method descriptions, and figure provenance. That newer version adds integral-matching Lorenz, Panda, and Chronos-T5; these curves are not discussed as local results in the current entry.

Paths in `provenance.json` identify files in the original research workspace; they are provenance references, not website dependencies.

## Content and visual references

The research bio and interests come from https://github.com/shayshay42 . Project descriptions use the linked public repository descriptions:

- https://github.com/shayshay42/glioma_ddri
- https://github.com/shayshay42/neural_ode_benchmark
- https://github.com/shayshay42/spatial_transcriptomics_playground

Angel-5 appearance reference: https://www.carlmfg.com/angel-5-pencil-sharpener/ . The SVG is an original stylized illustration; this personal site is not affiliated with CARL.

## GitHub Pages

This is a static site with relative asset paths and a `.nojekyll` file, suitable for either a root Pages site or a repository project site. The draft has not been published. To publish later, place these files at the chosen repository’s publishing root and configure that repository’s Pages source. No changes to the current research workspace are needed.
