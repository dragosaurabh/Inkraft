/* ================================================================
   INKRAFT — Frontend Application Logic
   ================================================================ */

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────────
  const form = document.getElementById('generate-form');
  const keywordInput = document.getElementById('keyword-input');
  const audienceInput = document.getElementById('audience-input');
  const toneSelect = document.getElementById('tone-select');
  const typeSelect = document.getElementById('type-select');
  const wordcountInput = document.getElementById('wordcount-input');
  const toggleBtn = document.getElementById('toggle-options');
  const optionsPanel = document.getElementById('advanced-options');
  const generateBtn = document.getElementById('generate-btn');

  const inputSection = document.getElementById('input-section');
  const loadingSection = document.getElementById('loading-section');
  const loadingStatus = document.getElementById('loading-status');
  const progressFill = document.getElementById('progress-fill');
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');
  const errorDismiss = document.getElementById('error-dismiss');
  const outputSection = document.getElementById('output-section');

  const tabsNav = document.getElementById('tabs-nav');
  const wordCountBadge = document.getElementById('word-count-badge');

  // Content containers
  const contentMap = {
    'seo-brief': document.getElementById('seo-brief-content'),
    'outline': document.getElementById('outline-content'),
    'article': document.getElementById('article-content'),
    'seo-meta': document.getElementById('seo-meta-content'),
    'image-prompt': document.getElementById('image-prompt-content'),
  };

  // Raw markdown per block (for copy functionality)
  const rawContent = {
    'seo-brief': '',
    'outline': '',
    'article': '',
    'seo-meta': '',
    'image-prompt': '',
  };

  // ── Loading status messages ─────────────────────────────────────
  const statusMessages = [
    'Analyzing search intent...',
    'Mapping semantic entities...',
    'Running competitor gap analysis...',
    'Constructing article outline...',
    'Writing the introduction...',
    'Crafting the body sections...',
    'Applying E-E-A-T signals...',
    'Building the FAQ section...',
    'Generating SEO metadata...',
    'Creating image prompt...',
    'Polishing final output...',
  ];

  let statusIndex = 0;
  let statusInterval = null;

  // ── Toggle advanced options ─────────────────────────────────────
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = optionsPanel.classList.contains('collapsed');
    optionsPanel.classList.toggle('collapsed', !isCollapsed);
    optionsPanel.classList.toggle('expanded', isCollapsed);
    toggleBtn.classList.toggle('open', isCollapsed);
  });

  // ── Error dismiss ───────────────────────────────────────────────
  errorDismiss.addEventListener('click', () => {
    errorSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
  });

  // ── Tab switching ───────────────────────────────────────────────
  tabsNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;

    const tabId = btn.dataset.tab;

    // Update nav buttons
    tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
  });

  // ── Copy buttons ────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (!copyBtn) return;

    const targetId = copyBtn.dataset.target;
    let text = '';

    // Check if it's a meta-field individual copy
    if (copyBtn.dataset.value) {
      text = copyBtn.dataset.value;
    } else {
      // Map target IDs to rawContent keys
      const keyMap = {
        'seo-brief-content': 'seo-brief',
        'outline-content': 'outline',
        'article-content': 'article',
        'seo-meta-content': 'seo-meta',
        'image-prompt-content': 'image-prompt',
      };
      const key = keyMap[targetId];
      text = key ? rawContent[key] : '';
    }

    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, 2000);
    });
  });

  // ── Form submission ─────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const keyword = keywordInput.value.trim();
    if (!keyword) {
      keywordInput.focus();
      return;
    }

    // Reset state
    resetOutput();
    showLoading();

    const body = {
      keyword,
      audience: audienceInput.value.trim(),
      tone: toneSelect.value,
      contentType: typeSelect.value,
      wordCount: wordcountInput.value.trim(),
    };

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Read the SSE stream
      await readStream(response);
    } catch (err) {
      showError(err.message || 'Something went wrong. Check your API key and try again.');
    }
  });

  // ── Stream reader ───────────────────────────────────────────────
  async function readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            finishStreaming(fullText);
            return;
          }

          // Check for error events
          if (line.startsWith('event: error')) continue;

          // Decode escaped newlines back
          const text = data.replace(/\\n/g, '\n');
          fullText += text;

          // Update the output live
          updateLiveOutput(fullText);
        }

        // Handle error events
        if (line.startsWith('event: error')) {
          // The next data line will have the error
          continue;
        }

        if (line.startsWith('data: {')) {
          try {
            const errData = JSON.parse(line.slice(6));
            if (errData.error) {
              showError(errData.error);
              return;
            }
          } catch (_) {
            // Not JSON, ignore
          }
        }
      }
    }

    // If we exit the loop without [DONE], finalize anyway
    if (fullText) {
      finishStreaming(fullText);
    }
  }

  // ── Parse the full response into 5 blocks ───────────────────────
  function parseBlocks(text) {
    // The model outputs blocks separated by markers like:
    // ## OUTPUT BLOCK 1 — SEO INTELLIGENCE BRIEF
    // We split on these markers

    const blocks = {
      'seo-brief': '',
      'outline': '',
      'article': '',
      'seo-meta': '',
      'image-prompt': '',
    };

    // Pattern to match block headers — flexible matching
    const blockPatterns = [
      { key: 'seo-brief', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+1[^\n]*/i },
      { key: 'outline', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+2[^\n]*/i },
      { key: 'article', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+3[^\n]*/i },
      { key: 'seo-meta', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+4[^\n]*/i },
      { key: 'image-prompt', pattern: /#{1,3}\s*OUTPUT\s+BLOCK\s+5[^\n]*/i },
    ];

    // Find positions of each block header
    const positions = [];
    for (const { key, pattern } of blockPatterns) {
      const match = text.match(pattern);
      if (match) {
        positions.push({
          key,
          index: text.indexOf(match[0]),
          headerLength: match[0].length,
        });
      }
    }

    // Sort by position
    positions.sort((a, b) => a.index - b.index);

    // Extract each block's content
    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index + positions[i].headerLength;
      const end = i + 1 < positions.length ? positions[i + 1].index : text.length;
      let content = text.slice(start, end).trim();

      // Remove separator lines (━━━ or ---)
      content = content.replace(/^[━─\-=]{3,}\s*/gm, '').trim();

      blocks[positions[i].key] = content;
    }

    // If no blocks were found, put everything in article
    if (positions.length === 0 && text.trim()) {
      blocks['article'] = text.trim();
    }

    return blocks;
  }

  // ── Update output live during streaming ─────────────────────────
  function updateLiveOutput(fullText) {
    // Show output section, hide loading
    if (outputSection.classList.contains('hidden')) {
      hideLoading();
      outputSection.classList.remove('hidden');
    }

    const blocks = parseBlocks(fullText);

    // Update each block
    for (const [key, content] of Object.entries(blocks)) {
      if (content) {
        rawContent[key] = content;

        if (key === 'article') {
          contentMap[key].innerHTML = renderMarkdown(content);
          contentMap[key].classList.add('streaming-cursor');
          updateWordCount(content);
        } else {
          contentMap[key].innerHTML = renderMarkdown(content);
          contentMap[key].classList.add('streaming-cursor');
        }

        // Mark tab as having content
        const tabBtn = tabsNav.querySelector(`[data-tab="${key}"]`);
        if (tabBtn && !tabBtn.classList.contains('has-content')) {
          tabBtn.classList.add('has-content');
        }
      }
    }

    // Auto-switch to the earliest tab that has content and hasn't been viewed
    autoSwitchTab(blocks);
  }

  // ── Auto-switch tab to show active content ──────────────────────
  let lastAutoTab = '';
  function autoSwitchTab(blocks) {
    const tabOrder = ['seo-brief', 'outline', 'article', 'seo-meta', 'image-prompt'];
    // Find the latest block being written to
    let latestTab = '';
    for (const key of tabOrder) {
      if (blocks[key]) {
        latestTab = key;
      }
    }

    if (latestTab && latestTab !== lastAutoTab) {
      lastAutoTab = latestTab;
      // Switch to this tab
      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const btn = tabsNav.querySelector(`[data-tab="${latestTab}"]`);
      if (btn) btn.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${latestTab}`).classList.add('active');
    }
  }

  // ── Finish streaming ────────────────────────────────────────────
  function finishStreaming(fullText) {
    stopStatusRotation();

    const blocks = parseBlocks(fullText);

    for (const [key, content] of Object.entries(blocks)) {
      rawContent[key] = content;
      if (content) {
        contentMap[key].innerHTML = renderMarkdown(content);
        contentMap[key].classList.remove('streaming-cursor');

        const tabBtn = tabsNav.querySelector(`[data-tab="${key}"]`);
        if (tabBtn) tabBtn.classList.add('has-content');
      }
    }

    // Final word count
    if (rawContent['article']) {
      updateWordCount(rawContent['article']);
    }

    // Show output, ensure input is visible again
    outputSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    inputSection.classList.remove('hidden');
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-icon').textContent = '⚡';

    // Switch to article tab by default at end
    const articleBtn = tabsNav.querySelector('[data-tab="article"]');
    if (articleBtn && rawContent['article']) {
      tabsNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      articleBtn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-article').classList.add('active');
    }
  }

  // ── Word count ──────────────────────────────────────────────────
  function updateWordCount(text) {
    // Strip markdown syntax for accurate count
    const plain = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[━─\-=]{3,}/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const count = plain.split(/\s+/).filter(w => w.length > 0).length;
    wordCountBadge.textContent = `${count.toLocaleString()} words`;
    wordCountBadge.classList.remove('hidden');
  }

  // ── Markdown renderer (lightweight, no deps) ───────────────────
  function renderMarkdown(md) {
    let html = md;

    // Escape HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Tables
    html = renderTables(html);

    // Headings (must come before bold)
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold + Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Blockquotes
    html = html.replace(/^&gt;\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');
    html = html.replace(/^\*\*\*+$/gm, '<hr>');

    // Unordered lists
    html = html.replace(/((?:^[-*+] .+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(line => {
        return `<li>${line.replace(/^[-*+]\s+/, '')}</li>`;
      }).join('\n');
      return `<ul>${items}</ul>\n`;
    });

    // Ordered lists
    html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(line => {
        return `<li>${line.replace(/^\d+\.\s+/, '')}</li>`;
      }).join('\n');
      return `<ol>${items}</ol>\n`;
    });

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Paragraphs — wrap lines that aren't already wrapped in block elements
    const blockTags = ['<h1', '<h2', '<h3', '<h4', '<h5', '<h6', '<ul', '<ol', '<li', '<blockquote', '<pre', '<hr', '<table', '<tr', '<th', '<td', '<thead', '<tbody', '</'];
    const lines = html.split('\n');
    const result = [];
    let inParagraph = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        if (inParagraph) {
          result.push('</p>');
          inParagraph = false;
        }
        continue;
      }

      const isBlock = blockTags.some(tag => line.startsWith(tag));

      if (isBlock) {
        if (inParagraph) {
          result.push('</p>');
          inParagraph = false;
        }
        result.push(line);
      } else {
        if (!inParagraph) {
          result.push('<p>');
          inParagraph = true;
        }
        result.push(line);
      }
    }

    if (inParagraph) result.push('</p>');

    return result.join('\n');
  }

  // ── Table renderer ──────────────────────────────────────────────
  function renderTables(html) {
    // Match markdown tables: header row, separator row, data rows
    const tableRegex = /((?:^\|.+\|\s*\n)+)/gm;

    return html.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return match;

      // Check if second row is separator
      const sepRow = rows[1];
      if (!/^\|[\s\-:|]+\|$/.test(sepRow.trim())) return match;

      const parseRow = (row) => {
        return row.split('|').slice(1, -1).map(c => c.trim());
      };

      const headers = parseRow(rows[0]);
      const dataRows = rows.slice(2);

      let table = '<table>\n<thead><tr>';
      for (const h of headers) {
        table += `<th>${h}</th>`;
      }
      table += '</tr></thead>\n<tbody>';

      for (const row of dataRows) {
        const cells = parseRow(row);
        table += '<tr>';
        for (const c of cells) {
          table += `<td>${c}</td>`;
        }
        table += '</tr>\n';
      }

      table += '</tbody></table>\n';
      return table;
    });
  }

  // ── State management ────────────────────────────────────────────
  function resetOutput() {
    for (const key of Object.keys(rawContent)) {
      rawContent[key] = '';
      contentMap[key].innerHTML = '';
      contentMap[key].classList.remove('streaming-cursor');
    }
    lastAutoTab = '';

    // Reset tab states
    tabsNav.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('has-content');
      b.classList.remove('active');
    });
    tabsNav.querySelector('[data-tab="seo-brief"]').classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-seo-brief').classList.add('active');

    wordCountBadge.classList.add('hidden');
    outputSection.classList.add('hidden');
    errorSection.classList.add('hidden');
  }

  function showLoading() {
    inputSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    generateBtn.disabled = true;

    statusIndex = 0;
    loadingStatus.textContent = statusMessages[0];
    progressFill.style.width = '5%';

    startStatusRotation();
  }

  function hideLoading() {
    loadingSection.classList.add('hidden');
    stopStatusRotation();
  }

  function startStatusRotation() {
    statusInterval = setInterval(() => {
      statusIndex = (statusIndex + 1) % statusMessages.length;
      loadingStatus.style.opacity = '0';
      setTimeout(() => {
        loadingStatus.textContent = statusMessages[statusIndex];
        loadingStatus.style.opacity = '1';
      }, 150);

      // Progress bar
      const progress = Math.min(5 + (statusIndex / statusMessages.length) * 90, 95);
      progressFill.style.width = `${progress}%`;
    }, 3500);
  }

  function stopStatusRotation() {
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    progressFill.style.width = '100%';
  }

  function showError(msg) {
    hideLoading();
    outputSection.classList.add('hidden');
    errorSection.classList.remove('hidden');
    errorMessage.textContent = msg;
    inputSection.classList.add('hidden');
    generateBtn.disabled = false;
  }

})();
