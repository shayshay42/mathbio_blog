# Academic CVs

`source/EN.tex` and `source/FR.tex` are the English and French CV sources from
the supplied `Shayan_Academic_CV.zip`. The original archive remains unchanged.
These sources keep the existing biography, education, employment, and other
sections; publications and the invited SIAM talk were updated on September 30,
2026. Paper titles remain in English in both versions.

The PDFs use the original EB Garamond layout. English has four pages; French has
three. Source changes also correct the PDF author and email link, prevent split
project entries in English, and fix one overflowing French paragraph.
The original Xovee CV template credits are retained in both sources; its
[MIT license](source/LICENSE) is included beside them.

## Build

Use TeX Live with `latexmk` and pdfLaTeX. Required packages include `cjk`,
`ebgaramond`, `enumitem`, and `eqparbox`. pdfLaTeX preserves the sources' T1 font
configuration. No external images or other files from the archive are required.

Run from the website repository root:

```sh
mkdir -p /tmp/shayan-cv-build/en /tmp/shayan-cv-build/fr
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -outdir=/tmp/shayan-cv-build/en assets/cv/source/EN.tex
latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -outdir=/tmp/shayan-cv-build/fr assets/cv/source/FR.tex
cp /tmp/shayan-cv-build/en/EN.pdf assets/cv/shayan-hajhashemi-cv-en.pdf
cp /tmp/shayan-cv-build/fr/FR.pdf assets/cv/shayan-hajhashemi-cv-fr.pdf
```

Build logs and intermediate files stay outside the repository. Check page
breaks, publication metadata, DOI links, and the SIAM talk link before replacing
the published PDFs. Keep publications consistent with `publications.html` and
`assets/publications.bib` at the repository root.
