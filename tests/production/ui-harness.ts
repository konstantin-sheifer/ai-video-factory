import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

/** Execute the actual nested page handler, without copying its implementation. */
export function pageHandler(file: string, name: string, scope: Record<string, unknown>) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.FunctionDeclaration | undefined;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!found) throw new Error(`Missing page handler ${name}`);
  const js = ts.transpileModule(found.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = vm.createContext(scope);
  return { invoke: vm.runInContext(`${js}; ${name}`, context) as (...args: unknown[]) => Promise<void>, context };
}

export function jsxTrees(sourceText: string) {
  const source = ts.createSourceFile("page.tsx", sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const trees: string[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
      trees.push(node.getText(source));
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return trees;
}

export function subtitleClick(file: string, scope: Record<string, unknown>) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if (ts.isJsxAttribute(node) && node.name.getText(source) === "onClick" &&
        node.initializer && ts.isJsxExpression(node.initializer) &&
        node.initializer.expression?.getText(source).includes("setSubtitlesEnabled")) {
      expression = node.initializer.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!expression) throw new Error("Missing subtitle toggle handler.");
  const js = ts.transpileModule(`(${expression.getText(source)})();`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, scope);
}
