/**
 * Letter-spaced headings ("E X P E R I E N C E", the CSS letter-spacing so
 * many CV designs use) come out of a PDF as one letter per word. Join them
 * back: a run of 4+ letter tokens, at most 2 letters each and mostly single
 * letters ("C O N TA C T" too). A spaced-out list of acronyms ("IT HR QA BI")
 * has no single letters and stays as it is.
 */
export function collapseLetterSpacing(text: string): string {
  return text.replace(/(?<![\p{L}\p{N}])\p{L}{1,2}(?: \p{L}{1,2}){3,}(?![\p{L}\p{N}])/gu, (run) => {
    const tokens = run.split(" ");
    const single = tokens.filter((t) => [...t].length === 1).length;
    return single * 2 >= tokens.length && single >= 3 ? tokens.join("") : run;
  });
}
