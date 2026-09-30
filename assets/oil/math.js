/* Render only this article; all KaTeX assets are served locally. */
"use strict";

const oilArticle = document.querySelector(".oil-post");
if (oilArticle && typeof renderMathInElement === "function") {
  renderMathInElement(oilArticle, {
    delimiters: [
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
    ],
    output: "htmlAndMathml",
    throwOnError: false,
    strict: "error",
    trust: false,
  });
}
