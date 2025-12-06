const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');
const TurndownService = require('turndown');
const {gfm} = require('turndown-plugin-gfm');

const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(__dirname, '../..');
const sourceRoot = path.resolve(workspaceRoot, 'extracted', 'sdk-reference');
const templatesRoot = path.join(sourceRoot, 'templates');
const inlineImagesSource = path.join(sourceRoot, 'inline-images');
const docsRoot = path.join(projectRoot, 'docs');
const staticImgRoot = path.join(projectRoot, 'static', 'img');
const sidebarSourcePath = path.join(sourceRoot, 'index.html');

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});
turndown.use(gfm);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, {recursive: true});
}

function cleanText(input) {
  if (!input) {
    return '';
  }
  return input.replace(/\s+/g, ' ').trim();
}

function yamlEscape(value) {
  if (!value && value !== 0) {
    return '';
  }
  const needsQuotes = /[:"'{}\[\],&*#?<>@`!\n]/.test(value);
  const escaped = value.replace(/"/g, '\\"');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function extractSidebarStructure() {
  const dom = new JSDOM(fs.readFileSync(sidebarSourcePath, 'utf8'));
  const {document} = dom.window;
  const sectionNodes = Array.from(document.querySelectorAll('#apendArticles > li'));

  if (!sectionNodes.length) {
    throw new Error('Unable to locate navigation structure in source HTML.');
  }

  return sectionNodes.map((sectionNode, index) => {
    const labelNode = sectionNode.querySelector('strong[purpose="chapter"]');
    const label = labelNode ? cleanText(labelNode.textContent) : `Section ${index + 1}`;
    const linkNodes = Array.from(sectionNode.querySelectorAll('a'));

    const docs = linkNodes
      .map((linkNode, docIdx) => {
        const onclick = linkNode.getAttribute('onclick') || '';
        const match = onclick.match(/"\.\/templates\/([^\"]+)"/);
        if (!match) {
          return null;
        }
        const relativePath = match[1];
        const navLabel = cleanText(linkNode.textContent) || path.basename(relativePath, '.html');
        return {
          relativePath,
          navLabel,
          position: docIdx + 1,
        };
      })
      .filter(Boolean);

    if (!docs.length) {
      throw new Error(`No documents found under navigation section "${label}".`);
    }

    const dirName = path.dirname(docs[0].relativePath).split(/[\\/]/)[0];

    return {
      label,
      dirName,
      position: index + 1,
      docs,
    };
  });
}

function normaliseDom(contentRoot) {
  const document = contentRoot.ownerDocument;

  Array.from(contentRoot.querySelectorAll('style, script, link, meta')).forEach((node) =>
    node.remove(),
  );

  const heading = contentRoot.querySelector('h1');
  if (heading) {
    heading.remove();
  }

  // Fix self-closing void elements for MDX/JSX compatibility
  // <col>, <br>, <hr>, <img> need to be self-closing in JSX
  Array.from(contentRoot.querySelectorAll('col')).forEach((col) => {
    col.setAttribute('data-self-close', 'true');
  });
  Array.from(contentRoot.querySelectorAll('br')).forEach((br) => {
    br.setAttribute('data-self-close', 'true');
  });
  Array.from(contentRoot.querySelectorAll('hr')).forEach((hr) => {
    hr.setAttribute('data-self-close', 'true');
  });

  const codeContainers = new Set();
  Array.from(contentRoot.querySelectorAll('[data-codeformat]')).forEach((codeNode) => {
    const parent = codeNode.parentElement;
    if (parent) {
      codeContainers.add(parent);
    }
  });

  codeContainers.forEach((container) => {
    const lines = Array.from(container.querySelectorAll('[data-codeformat]')).map((line) =>
      line.textContent.replace(/\u00a0/g, ' ').replace(/[\s\t]+$/u, ''),
    );
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = lines.join('\n');
    pre.appendChild(code);
    container.replaceWith(pre);
  });

  Array.from(contentRoot.querySelectorAll('span')).forEach((span) => {
    if (span.querySelector('img')) {
      return;
    }
    const fragment = document.createDocumentFragment();
    while (span.firstChild) {
      fragment.appendChild(span.firstChild);
    }
    span.replaceWith(fragment);
  });

  Array.from(contentRoot.querySelectorAll('*')).forEach((node) => {
    node.removeAttribute('style');
    node.removeAttribute('class');
    node.removeAttribute('doc-id');
    node.removeAttribute('node-id');
    node.removeAttribute('data-bookmark-id');
    node.removeAttribute('data-bookmark-name');
    node.removeAttribute('data-list');
    node.removeAttribute('purpose');
  });

  Array.from(contentRoot.querySelectorAll('img')).forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (src.startsWith('../../inline-images/')) {
      img.setAttribute('src', `/img/${src.slice('../..'.length + 1)}`);
    }
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', 'Illustration');
    }
  });

  Array.from(contentRoot.querySelectorAll('p')).forEach((p) => {
    const text = cleanText(p.textContent);
    if (!text && !p.querySelector('img')) {
      p.remove();
    }
  });
}

function htmlToMarkdown(contentRoot) {
  normaliseDom(contentRoot);
  let html = contentRoot.innerHTML || '';

  // Remove complex data attributes that cause issues
  html = html.replace(/\sdata-[a-z-]+="[^"]*"/gi, '');

  let markdown = turndown.turndown(html);

  // Fix void elements to be self-closing for MDX/JSX compatibility in raw HTML tables
  // These get preserved as HTML by turndown for complex tables
  markdown = markdown.replace(/<col(\s[^>]*)?\s*(?<!\/)>/gi, '<col$1 />');
  markdown = markdown.replace(/<br(\s[^>]*)?\s*(?<!\/)>/gi, '<br$1 />');
  markdown = markdown.replace(/<hr(\s[^>]*)?\s*(?<!\/)>/gi, '<hr$1 />');
  markdown = markdown.replace(/<img([^>]*[^\/])\s*>/gi, '<img$1 />');

  // Escape the Java diamond operator <> which gets parsed as JSX
  markdown = markdown.replace(/<>/g, '&lt;&gt;');

  // Escape <= and >= operators that look like JSX tag starts
  markdown = markdown.replace(/<=/g, '&lt;=');
  markdown = markdown.replace(/>=/g, '&gt;=');

  // Escape angle brackets that look like placeholders (e.g., <VARIABLE_NAME>, <VALUE>)
  // but not valid HTML tags. Match < followed by uppercase letters/underscores >
  markdown = markdown.replace(/<([A-Z_][A-Z0-9_]*(?:\\?_[A-Z0-9_]*)*)>/g, '&lt;$1&gt;');

  // Also escape things like <String value>, <string>, etc. (mixed case placeholders)
  markdown = markdown.replace(/<([A-Za-z][A-Za-z0-9_\s]*[A-Za-z0-9])>/g, (match, inner) => {
    // Don't escape known HTML tags
    const htmlTags = ['table', 'thead', 'tbody', 'tr', 'td', 'th', 'div', 'span', 'p', 'a', 'img', 'br', 'hr', 'col', 'colgroup', 'ol', 'ul', 'li', 'pre', 'code', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figure', 'figcaption'];
    const tagName = inner.toLowerCase().split(/\s/)[0];
    if (htmlTags.includes(tagName)) {
      return match;
    }
    return `&lt;${inner}&gt;`;
  });

  // Escape curly braces in non-code content for MDX
  // We need to be careful not to escape inside code blocks
  const lines = markdown
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .split('\n');

  let inCodeBlock = false;
  const processedLines = lines.map((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    // Only escape curly braces outside code blocks and inline code
    if (!inCodeBlock) {
      // Don't escape inside inline code (backticks)
      let result = '';
      let inInlineCode = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '`') {
          inInlineCode = !inInlineCode;
          result += line[i];
        } else if (!inInlineCode && (line[i] === '{' || line[i] === '}')) {
          result += '\\' + line[i];
        } else {
          result += line[i];
        }
      }
      line = result;
    }

    return line.replace(/[\s\t]+$/u, '');
  });

  return processedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}function extractTitle(contentRoot, fallback) {
  const heading = contentRoot.querySelector('h1, h2, h3');
  if (heading) {
    return cleanText(heading.textContent) || fallback;
  }
  return fallback;
}

function extractDescription(contentRoot) {
  const paragraphs = Array.from(contentRoot.querySelectorAll('p'))
    .map((p) => cleanText(p.textContent))
    .filter(Boolean);
  if (!paragraphs.length) {
    return '';
  }
  const summary = paragraphs[0].slice(0, 240);
  return summary.endsWith('.') || summary.length < 200 ? summary : `${summary}…`;
}

function writeCategoryMetadata(dirPath, label, position) {
  ensureDir(dirPath);
  const categoryFile = path.join(dirPath, '_category_.json');
  const meta = {
    label,
    position,
    collapsed: true,
  };
  fs.writeFileSync(categoryFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}

function convertDocuments(structure) {
  fs.rmSync(docsRoot, {recursive: true, force: true});
  ensureDir(docsRoot);

  structure.forEach((section) => {
    const sectionDir = path.join(docsRoot, section.dirName);
    writeCategoryMetadata(sectionDir, section.label, section.position);

    section.docs.forEach((doc) => {
      const sourcePath = path.join(templatesRoot, doc.relativePath);
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Missing source document: ${sourcePath}`);
      }

      const html = fs.readFileSync(sourcePath, 'utf8');
      const dom = new JSDOM(html);
      const {document} = dom.window;
      const contentRoot =
        document.querySelector('.selectableSection') || document.querySelector('body') || document;

      const title = extractTitle(contentRoot, doc.navLabel);
      const description = extractDescription(contentRoot);
      const markdown = htmlToMarkdown(contentRoot);

      const slug = path.basename(doc.relativePath, '.html');
      const frontMatterLines = ['---', `title: ${yamlEscape(title)}`];

      if (doc.navLabel && doc.navLabel !== title) {
        frontMatterLines.push(`sidebar_label: ${yamlEscape(doc.navLabel)}`);
      }

      frontMatterLines.push(`sidebar_position: ${doc.position}`);

      if (description) {
        frontMatterLines.push(`description: ${yamlEscape(description)}`);
      }

      frontMatterLines.push('---', '');

      const outputPath = path.join(sectionDir, `${slug}.mdx`);
      ensureDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, `${frontMatterLines.join('\n')}${markdown}\n`, 'utf8');
    });
  });
}

function copyAssets() {
  ensureDir(staticImgRoot);
  const target = path.join(staticImgRoot, 'inline-images');
  fs.rmSync(target, {recursive: true, force: true});
  if (fs.existsSync(inlineImagesSource)) {
    fs.cpSync(inlineImagesSource, target, {recursive: true});
  }
}

function main() {
  try {
    const structure = extractSidebarStructure();
    convertDocuments(structure);
    copyAssets();
    console.log('✅ Documentation converted successfully.');
  } catch (error) {
    console.error('❌ Conversion failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

main();
