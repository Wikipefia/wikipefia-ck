export const DEFAULT_CONTENT = `# Welcome to Wikipefia Studio

This is a **live MDX editor** with real-time preview. Edit this content and see the results instantly on the right panel.

## Getting Started

You can write standard Markdown along with custom JSX components. The preview updates as you type.

<Callout type="info">
This is an informational callout. Try changing the \`type\` prop to \`warning\` or \`error\` to see different styles.
</Callout>

### Text Formatting

- **Bold text** for emphasis
- *Italic text* for subtle emphasis  
- \`inline code\` for technical references
- [Links](https://example.com) for navigation

<Definition term="MDX">
MDX is a format that lets you seamlessly write JSX in your Markdown documents. It combines the simplicity of Markdown with the power of React components.
</Definition>

## Tabs Example

<Tabs>
<Tab label="Overview">
Tabs allow you to organize content into switchable panels. Each tab has a label and its own content area.
</Tab>
<Tab label="Usage">
Use the \`<Tabs>\` wrapper with \`<Tab label="...">\` children. The label prop defines the tab button text.
</Tab>
</Tabs>

## Collapsible Content

<Collapse title="Click to expand">
Hidden content is revealed when the user clicks the header. This is useful for supplementary information, detailed explanations, or optional content that might overwhelm the main reading flow.
</Collapse>

<Callout type="warning">
Remember to save your work frequently. The editor does not persist content between sessions yet.
</Callout>

## Data Presentation

| Feature | Status | Notes |
|---------|--------|-------|
| Live Preview | ✓ | Real-time compilation |
| Syntax Highlighting | ✓ | CodeMirror-based |
| Dark Mode | ✓ | System-aware |
| Component Stubs | ✓ | Placeholder rendering |

---

> "The best way to predict the future is to create it." — Peter Drucker

## Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("Wikipefia"));
\`\`\`
`;
