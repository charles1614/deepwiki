// Debug script to test markdown rendering
const { marked } = require('marked');

// Test basic markdown with custom renderers
marked.use({
  renderer: {
    strong(text) {
      console.log('Processing strong:', text);
      return `<strong class="font-bold">${text}</strong>`;
    },
    em(text) {
      console.log('Processing em:', text);
      return `<em class="italic">${text}</em>`;
    },
    paragraph(text) {
      console.log('Processing paragraph:', text);
      return `<p class="mb-4">${text}</p>`;
    }
  }
});

const testMarkdown = '**Part of**: [Architecture Documentation](index.md) **Generated**: 2025-11-02 **Source commit**: 358ae35';

console.log('Input markdown:', testMarkdown);
console.log('Output HTML:', marked(testMarkdown));