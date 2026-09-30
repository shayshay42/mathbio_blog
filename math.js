/* Render article mathematics with the locally served KaTeX bundle. */
(() => {
  "use strict";

  if (typeof renderMathInElement !== "function") return;

  document.querySelectorAll(".blog-post").forEach((article) => {
    renderMathInElement(article, {
      delimiters: [
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      output: "htmlAndMathml",
      throwOnError: false,
      strict: "error",
      trust: false,
    });
  });
})();
