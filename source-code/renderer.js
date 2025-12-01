import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

let currentPath = null;
let view = null;

const hackerHighlightPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view) { this.decorations = this.build(view); }
  update(update) { if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view); }
  build(view) {
    const builder = new RangeSetBuilder();
    let inComment = false;
    let pos = 0;

    for (let i = 1; i <= view.state.doc.lines; i++) {
      const line = view.state.doc.line(i);
      const text = line.text;
      const trimmed = text.trimStart();
      const indent = text.length - trimmed.length;
      const start = line.from + indent;

      const wasInComment = inComment;
      if (trimmed === "!!" || trimmed.startsWith("!! ")) {
        inComment = !inComment;
        builder.add(start, start + 2, Decoration.mark({ class: "cm-comment-toggle" }));
      }

      if (inComment || wasInComment) {
        builder.add(line.from, line.to, Decoration.line({ class: "cm-comment" }));
      } else {
        if (trimmed.startsWith("^")) builder.add(start, line.to, Decoration.line({ class: "cm-super" }));
        else if (trimmed.startsWith("//")) builder.add(start, line.to, Decoration.line({ class: "cm-dep" }));
        else if (trimmed.startsWith("#")) builder.add(start, line.to, Decoration.line({ class: "cm-lib" }));
        else if (trimmed.startsWith(">>>")) builder.add(start, line.to, Decoration.line({ class: "cm-cmd-separate" }));
        else if (trimmed.startsWith(">>")) builder.add(start, line.to, Decoration.line({ class: "cm-cmd-vars" }));
        else if (trimmed.startsWith(">")) builder.add(start, line.to, Decoration.line({ class: "cm-cmd" }));
        else if (trimmed.startsWith("@")) builder.add(start, line.to, Decoration.line({ class: "cm-global-var" }));
        else if (trimmed.startsWith("$")) builder.add(start, line.to, Decoration.line({ class: "cm-local-var" }));
        else if (trimmed.startsWith("\\")) builder.add(start, line.to, Decoration.line({ class: "cm-plugin" }));
        else if (trimmed.startsWith("=")) builder.add(start, line.to, Decoration.line({ class: "cm-loop" }));
        else if (trimmed.startsWith("?")) builder.add(start, line.to, Decoration.line({ class: "cm-conditional" }));
        else if (trimmed.startsWith("&")) builder.add(start, line.to, Decoration.line({ class: "cm-background" }));
        else if (trimmed.startsWith(":")) builder.add(start, line.to, Decoration.line({ class: "cm-func-def" }));
        else if (trimmed.startsWith(".")) builder.add(start, line.to, Decoration.line({ class: "cm-func-call" }));
        else if (trimmed.startsWith("[") || trimmed.startsWith("]")) builder.add(start, line.to, Decoration.line({ class: "cm-config" }));
        else if (trimmed.startsWith("!")) builder.add(start, line.to, Decoration.line({ class: "cm-comment" }));
      }
      pos = line.to + 1;
    }
    return builder.finish();
  }
}, { decorations: v => v.decorations });

async function loadFile(path) {
  const content = await window.api.readFile(path);
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content }
  });
  currentPath = path;
  document.getElementById("file-path").textContent = path;
  updateTitle();
}

async function saveFile(path = currentPath) {
  if (!path) path = await window.api.saveFile();
  if (!path) return;
  await window.api.saveContent(path, view.state.doc.toString());
  currentPath = path;
  document.getElementById("file-path").textContent = path;
  updateTitle();
}

async function runCommand(cmd, args = [], cwd = require('path').dirname(currentPath || ".")) {
  const outputEl = document.getElementById("output");
  outputEl.textContent = "Running...\n";
  const result = await window.api.exec(cmd, args, cwd);
  if (result.error) {
    outputEl.textContent += `\nERROR: ${result.error}\n${result.stderr}`;
  } else {
    outputEl.textContent += result.stdout + result.stderr;
  }
}

function updateTitle() {
  const title = currentPath ? `Hacker Editor — ${require('path').basename(currentPath)}` : "Hacker Editor — Nowy plik";
  document.title = title;
}

// Inicjalizacja edytora
view = new EditorView({
  state: EditorState.create({
    doc: "",
    extensions: [
      basicSetup,
      oneDark,
      hackerHighlightPlugin,
      EditorView.updateListener.of(update => {
        if (update.docChanged) updateTitle();
      })
    ]
  }),
  parent: document.getElementById("editor")
});

// Przyciski
document.getElementById("new").onclick = () => { currentPath = null; view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "" } }); updateTitle(); };
document.getElementById("open").onclick = async () => { const p = await window.api.openFile(); if (p) loadFile(p); };
document.getElementById("save").onclick = () => saveFile();
document.getElementById("saveas").onclick = () => saveFile(null);
document.getElementById("run").onclick = () => { if (currentPath) runCommand("hli", ["run", currentPath]); };
document.getElementById("compile").onclick = () => { if (currentPath) runCommand("hli", ["compile", currentPath, "--bytes"]); };
document.getElementById("check").onclick = () => { if (currentPath) runCommand("hacker-parser", ["--verbose", currentPath]); else runCommand("hacker-parser", ["--verbose", "/tmp/temp_check.hacker"], "/tmp"); };

// Otwieranie pliku z argumentu (hli editor plik.hacker)
window.api.onFileOpened(path => loadFile(path));

// Otwieranie pliku podanego przy uruchomieniu Electrona
if (process.argv.length > 2) {
  const fileFromArg = process.argv.find(arg => arg.endsWith('.hacker'));
  if (fileFromArg) loadFile(fileFromArg);
}
