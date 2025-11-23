// Manual mock for marked library
// This is automatically used when you call jest.mock('marked') without implementation

const markedFn = jest.fn((markdown, options) => {
  // Default markdown parsing
  let html = markdown

  // Handle code blocks FIRST (before inline code)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    if (lang === 'mermaid') {
      return `<div class="mermaid my-6">${code.trim()}</div>`
    }
    return `<pre class="prose-pre"><code class="prose-code">${code.trim()}</code></pre>`
  })

  // Handle other markdown elements with proper typography classes
  html = html
    .replace(/^#### (.+)$/gm, '<h4 class="heading-4 prose-headings">$1</h4>')
    .replace(/^##### (.+)$/gm, '<h5 class="heading-5 prose-headings">$1</h5>')
    .replace(/^###### (.+)$/gm, '<h6 class="heading-6 prose-headings">$1</h6>')
    .replace(/^### (.+)$/gm, '<h3 class="heading-3 prose-headings">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="heading-2 prose-headings">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="heading-1 prose-headings">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="prose-code">$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote class="prose-blockquote">$1</blockquote>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="prose-a" data-hover-styles>$1</a>')

  // Handle tables - simple implementation for tests
  html = html.replace(/^\|(.+)\|$\n^\|(.+)\|$\n((?:\|.+\|$)*)/gm, (match, header, separator, rows) => {
    const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell)
    const bodyRows = rows.split('\n').filter(row => row.trim()).map(row => {
      const cells = row.replace(/^\|(.+)\|$/, '$1').split('|').map(cell => cell.trim()).filter(cell => cell)
      return '<tr>' + cells.map(cell => `<td class="prose-td">${cell}</td>`).join('') + '</tr>'
    }).join('')
    const headerRow = '<thead><tr>' + headerCells.map(cell => `<th class="prose-th">${cell}</th>`).join('') + '</tr></thead>'
    const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : ''
    return `<table class="prose-table">${headerRow}${tbody}</table>`
  })

  // Handle ordered lists
  html = html.replace(/^(\d+\..+(?:\n\d+\..+)*)$/gm, (match) => {
    const items = match.split('\n').map(item =>
      item.replace(/^\d+\.\s/, '<li class="prose-li">') + '</li>'
    ).join('')
    return `<ol class="prose-ol">${items}</ol>`
  })

  // Handle unordered lists
  html = html.replace(/^(-[^*\n].+(?:\n-[^*\n].+)*)$/gm, (match) => {
    const items = match.split('\n').map(item =>
      item.replace(/^-\s/, '<li class="prose-li">') + '</li>'
    ).join('')
    return `<ul class="prose-ul">${items}</ul>`
  })

  // Handle paragraphs - wrap remaining text in paragraphs
  html = html.replace(/\n\n/g, '</p><p class="prose-p">')
  html = '<p class="prose-p">' + html + '</p>'

  return html
})

markedFn.use = jest.fn()
markedFn.parse = jest.fn((markdown) => markedFn(markdown))
markedFn.Marked = jest.fn().mockImplementation(() => ({
  parse: jest.fn((markdown) => markedFn(markdown)),
  use: jest.fn()
}))

module.exports = {
  marked: markedFn,
  Marked: jest.fn().mockImplementation(() => ({
    parse: jest.fn((markdown) => markedFn(markdown)),
    use: jest.fn()
  })),
  default: markedFn,
}

