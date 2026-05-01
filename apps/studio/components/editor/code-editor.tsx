"use client";

import {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  highlightSpecialChars,
  Decoration,
  GutterMarker,
  gutter,
} from "@codemirror/view";
import {
  EditorState,
  StateField,
  StateEffect,
  RangeSet,
} from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  HighlightStyle,
} from "@codemirror/language";
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
  {
    tag: tags.monospace,
    fontFamily: "var(--font-editor)",
    backgroundColor: "var(--c-content-code-bg)",
  },
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

// ── Error line highlighting ──────────────────────────────────────────────
//
// The live preview emits an error with a 1-indexed editor line whenever
// MDX fails to compile / evaluate / render. We surface that as a red
// background on the line, a red gutter marker, and a tooltip-friendly
// `title` attribute so hovering over the line reveals the message.

interface ErrorMarkerInfo {
  line: number; // 1-indexed
  message: string;
}

const setErrorMarker = StateEffect.define<ErrorMarkerInfo | null>();

class ErrorGutterMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement("span");
    el.style.color = "#DC2626";
    el.style.fontWeight = "700";
    el.style.fontFamily = "var(--font-mono)";
    el.style.cursor = "default";
    el.textContent = "●";
    return el;
  }
}

const errorGutterMarker = new ErrorGutterMarker();

/**
 * StateField that owns the current error marker. It's updated via
 * `setErrorMarker` effects and produces both a line decoration set
 * (for the red background) and a gutter range set (for the dot).
 */
const errorMarkerField = StateField.define<ErrorMarkerInfo | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorMarker)) return e.value;
    }
    return value;
  },
});

/**
 * Re-derive line decorations from `errorMarkerField` whenever it
 * changes. Computed at the *state* level (not the view level) so the
 * decoration is consistent across remounts and SSR-friendly.
 */
const errorLineDecorations = EditorView.decorations.compute(
  [errorMarkerField],
  (state) => {
    // We can't read the *view* here, but `Decoration.line` only needs the
    // line's `from` offset, which is available from the state's doc.
    const marker = state.field(errorMarkerField);
    if (!marker) return Decoration.none;
    const { doc } = state;
    if (marker.line < 1 || marker.line > doc.lines) return Decoration.none;
    const lineInfo = doc.line(marker.line);
    return Decoration.set([
      Decoration.line({
        attributes: {
          class: "cm-errorLine",
          title: marker.message,
        },
      }).range(lineInfo.from),
    ]);
  },
);

/** Gutter showing a red dot for the error line. */
const errorGutter = gutter({
  class: "cm-errorGutter",
  markers(view) {
    const marker = view.state.field(errorMarkerField);
    if (!marker) return RangeSet.empty;
    const { doc } = view.state;
    if (marker.line < 1 || marker.line > doc.lines) return RangeSet.empty;
    const lineInfo = doc.line(marker.line);
    return RangeSet.of([errorGutterMarker.range(lineInfo.from)]);
  },
});

const errorTheme = EditorView.theme({
  ".cm-errorLine": {
    backgroundColor: "rgba(220, 38, 38, 0.10)",
    boxShadow: "inset 2px 0 0 0 #DC2626",
  },
  ".cm-errorGutter": {
    width: "0.7em",
  },
});

// ── Component ────────────────────────────────────────────────────────────

export interface CodeEditorHandle {
  insertAtCursor: (text: string) => void;
  scrollToFraction: (fraction: number) => void;
  scrollToLine: (line: number) => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onScrollFraction?: (fraction: number) => void;
  /**
   * 1-indexed line to highlight as the source of an error. When null
   * or undefined, no line is highlighted.
   */
  errorLine?: number | null;
  /** Tooltip text shown on the highlighted line + gutter marker. */
  errorMessage?: string | null;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { value, onChange, onScrollFraction, errorLine, errorMessage },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onScrollRef = useRef(onScrollFraction);
    onScrollRef.current = onScrollFraction;

    const isExternalUpdate = useRef(false);

    useImperativeHandle(ref, () => ({
      insertAtCursor(text: string) {
        const view = viewRef.current;
        if (!view) return;
        const { from, to } = view.state.selection.main;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus();
      },
      scrollToFraction(fraction: number) {
        const view = viewRef.current;
        if (!view) return;
        const dom = view.scrollDOM;
        const max = dom.scrollHeight - dom.clientHeight;
        if (max > 0) dom.scrollTop = fraction * max;
      },
      scrollToLine(line: number) {
        const view = viewRef.current;
        if (!view) return;
        if (line < 1 || line > view.state.doc.lines) return;
        const lineInfo = view.state.doc.line(line);
        view.dispatch({
          effects: EditorView.scrollIntoView(lineInfo.from, {
            y: "center",
          }),
        });
      },
    }));

    const createExtensions = useCallback(
      () => [
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
        errorMarkerField,
        errorLineDecorations,
        errorGutter,
        errorTheme,
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
      ],
      [],
    );

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

      const scroller = view.scrollDOM;
      const onScroll = () => {
        if (!onScrollRef.current) return;
        const max = scroller.scrollHeight - scroller.clientHeight;
        if (max > 0) onScrollRef.current(scroller.scrollTop / max);
      };
      scroller.addEventListener("scroll", onScroll, { passive: true });

      return () => {
        scroller.removeEventListener("scroll", onScroll);
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

    // Push the error marker into the editor whenever it changes.
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const next: ErrorMarkerInfo | null =
        errorLine && errorLine > 0
          ? { line: errorLine, message: errorMessage ?? "Error" }
          : null;
      view.dispatch({ effects: setErrorMarker.of(next) });
    }, [errorLine, errorMessage]);

    return (
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        style={{ fontSize: "14px" }}
      />
    );
  },
);
