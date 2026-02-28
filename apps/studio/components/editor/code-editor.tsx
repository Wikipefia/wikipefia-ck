"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, highlightSpecialChars } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";

const studioHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.4em" },
  { tag: tags.heading2, fontWeight: "700", fontSize: "1.25em" },
  { tag: tags.heading3, fontWeight: "700", fontSize: "1.1em" },
  { tag: tags.heading4, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.link, color: "var(--c-accent)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--c-accent)" },
  { tag: tags.monospace, fontFamily: "var(--font-editor)", backgroundColor: "var(--c-content-code-bg)" },
  { tag: tags.processingInstruction, color: "var(--c-accent)" },
  { tag: tags.angleBracket, color: "var(--c-accent)" },
  { tag: tags.tagName, color: "var(--c-accent)", fontWeight: "600" },
  { tag: tags.attributeName, color: "var(--c-text-muted)" },
  { tag: tags.attributeValue, color: "#059669" },
  { tag: tags.comment, color: "var(--c-text-muted)", fontStyle: "italic" },
  { tag: tags.meta, color: "var(--c-text-muted)" },
  { tag: tags.quote, color: "var(--c-text-muted)", fontStyle: "italic" },
  { tag: tags.string, color: "#059669" },
  { tag: tags.number, color: "#D97706" },
  { tag: tags.bool, color: "#D97706" },
  { tag: tags.keyword, color: "#7C3AED" },
  { tag: tags.operator, color: "var(--c-text-muted)" },
  { tag: tags.separator, color: "var(--c-text-muted)" },
  { tag: tags.list, color: "var(--c-accent)" },
  { tag: tags.contentSeparator, color: "var(--c-border)" },
]);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ value, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const isExternalUpdate = useRef(false);

  const createExtensions = useCallback(() => [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    highlightSpecialChars(),
    drawSelection(),
    history(),
    foldGutter(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightSelectionMatches(),
    syntaxHighlighting(studioHighlight),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...searchKeymap,
      ...closeBracketsKeymap,
      indentWithTab,
    ]),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    }),
    EditorState.tabSize.of(2),
  ], []);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: createExtensions(),
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      style={{ fontSize: "14px" }}
    />
  );
}
