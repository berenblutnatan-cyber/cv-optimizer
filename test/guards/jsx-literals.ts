import ts from "typescript";

// Finds user-facing English that bypasses t() in a source file: JSX text,
// string literals in user-facing props and object fields, and toast messages.
// A translated surface must route every one of these through t() (or msg()
// for module-level labels that are translated at render time).

/** JSX props whose value a person reads or hears. */
const USER_ATTRS = new Set([
  "title",
  "label",
  "hint",
  "description",
  "placeholder",
  "aria-label",
  "aria-description",
  "alt",
  "done",
  "content",
  "action",
  "copiedLabel",
  "failedLabel",
  "ariaLabel",
  "emptyLabel",
  "message",
  "body",
  "detail",
  "cta",
  "tagline",
  "summary",
]);

/** Object fields that carry the same kind of text (option lists, metadata, toasts). */
const USER_PROPS = new Set(["label", "title", "description", "hint", "placeholder", "tagline", "detail", "summary", "cta", "ariaLabel", "message", "emptyLabel"]);

// Words that stay in English on a Hebrew page: product and file-format names,
// plan names, and the brand.
const ALLOWED = /(?<![A-Za-z])(?:ATS|PDF|DOCX?|docx?|MB|Polar|ARR|Word|LinkedIn|Hired|AI|A4|Esc|Enter|Space|Ctrl|Cmd|Shift|URL|JSON|ID)(?![A-Za-z])/g;

export function hasEnglish(text: string): boolean {
  return /[A-Za-z]/.test(text.replace(ALLOWED, "").replace(/\{\w+\}/g, ""));
}

export type Finding = { line: number; text: string };

/** The literal text pieces an expression would render, without looking inside calls (t("…") is fine). */
function literalsIn(node: ts.Node): string[] {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.flatMap((s) => [s.literal.text, ...literalsIn(s.expression)])];
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return literalsIn(node.expression);
  if (ts.isConditionalExpression(node)) return [...literalsIn(node.whenTrue), ...literalsIn(node.whenFalse)];
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    if (op === ts.SyntaxKind.QuestionQuestionToken || op === ts.SyntaxKind.BarBarToken) return [...literalsIn(node.left), ...literalsIn(node.right)];
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return literalsIn(node.right);
    if (op === ts.SyntaxKind.PlusToken) return [...literalsIn(node.left), ...literalsIn(node.right)];
  }
  return [];
}

function attrName(a: ts.JsxAttribute): string {
  return a.name.getText();
}

function propName(p: ts.PropertyAssignment): string | null {
  if (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) return p.name.text;
  return null;
}

function isToastCall(node: ts.CallExpression): boolean {
  const e = node.expression;
  if (ts.isIdentifier(e)) return e.text === "toast";
  return ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "toast";
}

export function untranslatedLiterals(source: string, fileName = "file.tsx"): Finding[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, fileName.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX);
  const out: Finding[] = [];
  const add = (node: ts.Node, texts: string[]) => {
    for (const text of texts)
      if (hasEnglish(text)) out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: text.trim().replace(/\s+/g, " ") });
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) add(node, [node.text]);
    else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) add(node, literalsIn(node.expression));
    else if (ts.isJsxAttribute(node) && USER_ATTRS.has(attrName(node)) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) add(node, [init.text]);
      else if (ts.isJsxExpression(init) && init.expression) add(node, literalsIn(init.expression));
    } else if (ts.isPropertyAssignment(node) && USER_PROPS.has(propName(node) ?? "")) add(node, literalsIn(node.initializer));
    else if (ts.isCallExpression(node) && isToastCall(node) && node.arguments[0]) add(node, literalsIn(node.arguments[0]));
    // A default for a user-facing prop (`label = "CV score"`) renders whenever the caller passes none.
    else if (ts.isBindingElement(node) && node.initializer && USER_ATTRS.has((node.propertyName ?? node.name).getText(sf))) add(node, literalsIn(node.initializer));
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}
