const form = document.getElementById('preview-form')
const input = document.getElementById('url-input')
const button = document.getElementById('submit-button')
const statusEl = document.getElementById('status')
const cardRoot = document.getElementById('card-root')
const jsonRoot = document.getElementById('json-root')
const compareRoot = document.getElementById('compare-root')

const setStatus = (message, type = 'normal') => {
  statusEl.textContent = message
  statusEl.className = `status${type === 'normal' ? '' : ` ${type}`}`
}

const tag = (value) => `<span class="tag">${value}</span>`

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderMedia = (card) => {
  if (card.interactionMode === 'embeddable' && card.embedUrl) {
    const iframeTitle = escapeHtml(card.title || 'Embedded content')
    return `<div class="media"><iframe src="${card.embedUrl}" title="${iframeTitle}" allowfullscreen loading="lazy"></iframe></div>`
  }

  if (card.resourceType === 'image') {
    const src = card.originalMediaUrl || card.imageUrl || card.resolvedUrl
    return `<div class="media"><img src="${src}" alt="preview image" loading="lazy" /></div>`
  }

  if (card.resourceType === 'video' && card.playable) {
    if (card.resolvedUrl.endsWith('.mp4') || card.resolvedUrl.endsWith('.webm')) {
      return `<div class="media"><video controls src="${card.resolvedUrl}"></video></div>`
    }
  }

  if (card.resourceType === 'audio' && card.playable) {
    const src = card.originalMediaUrl || card.resolvedUrl
    return `<div class="media"><audio controls src="${src}"></audio></div>`
  }

  if (card.imageUrl) {
    return `<div class="media"><img src="${card.imageUrl}" alt="preview image" loading="lazy" /></div>`
  }

  return ''
}

const renderSnapshot = (card) => {
  const snapshot = card.snapshot
  if (!snapshot) {
    return ''
  }

  const facts = []
  if (snapshot.language) facts.push(`lang: ${escapeHtml(snapshot.language)}`)
  if (snapshot.estimatedReadingMinutes) {
    facts.push(`read: ${snapshot.estimatedReadingMinutes} min`)
  }
  if (snapshot.wordCount) facts.push(`words: ${snapshot.wordCount}`)

  const factsHtml = facts.length
    ? `<p class="snapshot-facts">${facts.map((item) => `<span>${item}</span>`).join('')}</p>`
    : ''

  const keywordsHtml = snapshot.keywords?.length
    ? `<div class="snapshot-block"><h4>Keywords</h4><p class="snapshot-chip-row">${snapshot.keywords
        .map((keyword) => `<span class="chip">${escapeHtml(keyword)}</span>`)
        .join('')}</p></div>`
    : ''

  const highlightsHtml = snapshot.highlights?.length
    ? `<div class="snapshot-block"><h4>Highlights</h4><ul class="highlight-list">${snapshot.highlights
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join('')}</ul></div>`
    : ''

  return `
    <section class="snapshot">
      ${factsHtml}
      ${keywordsHtml}
      ${highlightsHtml}
    </section>
  `
}

const renderReaderContent = (card) => {
  const content = card.content
  if (!content?.html) {
    return ''
  }

  const renderBlocks = () => {
    if (!Array.isArray(content.blocks) || content.blocks.length === 0) {
      return null
    }

    return content.blocks
      .map((block) => {
        if (block.type === 'text') {
          return `<p>${escapeHtml(block.text)}</p>`
        }

        if (block.type === 'image') {
          const alt = block.alt ? escapeHtml(block.alt) : ''
          const altAttr = alt ? ` alt="${alt}"` : ' alt=""'
          return `<img src="${escapeHtml(block.src)}"${altAttr} loading="lazy" />`
        }

        if (block.type === 'video') {
          const poster = block.poster
            ? ` poster="${escapeHtml(block.poster)}"`
            : ''
          return `<video controls preload="metadata" src="${escapeHtml(block.src)}"${poster}></video>`
        }

        const iframeTitle = block.title
          ? escapeHtml(block.title)
          : 'Embedded content'
        return `<iframe src="${escapeHtml(block.src)}" title="${iframeTitle}" loading="lazy" allowfullscreen></iframe>`
      })
      .join('')
  }

  const metaLine = [
    content.source ? `source: ${content.source}` : null,
    content.captureMode ? `capture: ${content.captureMode}` : null,
    `blocks: ${content.blockCount}`,
    content.quality ? `quality: ${content.quality.score} (${content.quality.grade})` : null,
    typeof content.treeNodeCount === 'number'
      ? `treeNodes: ${content.treeNodeCount}`
      : null,
    content.truncated ? 'truncated: yes' : 'truncated: no',
  ]
    .filter(Boolean)
    .join(' · ')

  const blockHtml = renderBlocks()
  const previewHtml = blockHtml ?? content.html

  return `
    <section class="reader-preview">
      <h4>Reader Preview</h4>
      <p class="reader-meta">${metaLine}</p>
      <div class="reader-scroll">${previewHtml}</div>
    </section>
  `
}

const renderCard = (card) => {
  const tags = [
    tag(`provider:${card.provider}`),
    tag(`type:${card.resourceType}`),
    tag(`page:${card.pageKind}`),
    tag(`mode:${card.interactionMode}`),
  ].join('')

  const title = escapeHtml(card.title || '(untitled)')
  const description = card.description
    ? `<p class="card-desc">${escapeHtml(card.description)}</p>`
    : ''

  cardRoot.classList.remove('empty')
  cardRoot.innerHTML = `
    <article class="preview-card">
      ${renderMedia(card)}
      <div class="card-body">
        <div class="tags">${tags}</div>
        <h3 class="card-title">${title}</h3>
        ${description}
        ${renderSnapshot(card)}
        ${renderReaderContent(card)}
        <a class="card-link" href="${card.resolvedUrl}" target="_blank" rel="noreferrer noopener">Open Original →</a>
      </div>
    </article>
  `
}

const renderKeyValueRows = (data) => {
  const entries = Object.entries(data || {}).filter(([, value]) => {
    return value !== undefined && value !== null && value !== ''
  })

  if (entries.length === 0) {
    return '<p class="compare-empty">No significant fields.</p>'
  }

  return `<dl class="compare-list">${entries
    .map(([key, value]) => {
      return `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd></div>`
    })
    .join('')}</dl>`
}

const renderComparison = (card, comparisons = [], compareError) => {
  const ownData = {
    title: card.title,
    description: card.description,
    imageUrl: card.imageUrl,
    provider: card.provider,
    resourceType: card.resourceType,
    pageKind: card.pageKind,
    interactionMode: card.interactionMode,
    embeddable: card.embeddable,
    playable: card.playable,
    resolvedUrl: card.resolvedUrl,
  }

  const ownCardHtml = `
    <article class="compare-item">
      <header>
        <h3>url-preview-engine (this project)</h3>
      </header>
      ${renderKeyValueRows(ownData)}
    </article>
  `

  const externalHtml =
    Array.isArray(comparisons) && comparisons.length > 0
      ? comparisons
          .map((comparison) => {
            const statusClass = comparison.ok ? 'ok' : 'error'
            const durationText = Number.isFinite(comparison.durationMs)
              ? `${comparison.durationMs}ms`
              : '-'

            const bodyHtml = comparison.ok
              ? renderKeyValueRows(comparison.data)
              : `<p class="compare-error">${escapeHtml(comparison.error || 'unknown error')}</p>`

            return `
              <article class="compare-item">
                <header>
                  <h3>${escapeHtml(comparison.engine)}</h3>
                  <span class="compare-badge ${statusClass}">${statusClass}</span>
                  <span class="compare-time">${durationText}</span>
                </header>
                ${bodyHtml}
                <details>
                  <summary>Raw JSON</summary>
                  <pre>${escapeHtml(JSON.stringify(comparison, null, 2))}</pre>
                </details>
              </article>
            `
          })
          .join('')
      : ''

  const errorBanner = compareError
    ? `<p class="compare-fetch-error">${escapeHtml(compareError)}</p>`
    : ''

  compareRoot.classList.remove('empty')
  compareRoot.innerHTML = `${errorBanner}<div class="compare-grid">${ownCardHtml}${externalHtml}</div>`
}

const requestPreview = async (url) => {
  const response = await fetch(`/api/preview?url=${encodeURIComponent(url)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'preview failed')
  }

  return data.card
}

const requestCompare = async (url) => {
  const response = await fetch(`/api/compare?url=${encodeURIComponent(url)}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'comparison failed')
  }

  return data.comparisons || []
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const url = input.value.trim()
  if (!url) {
    setStatus('URL을 입력해주세요.', 'error')
    return
  }

  button.disabled = true
  setStatus('분석 중...', 'normal')
  cardRoot.classList.add('empty')
  cardRoot.textContent = '결과를 생성하는 중입니다.'
  compareRoot.classList.add('empty')
  compareRoot.textContent = '비교 결과를 생성하는 중입니다.'

  try {
    const [previewResult, compareResult] = await Promise.allSettled([
      requestPreview(url),
      requestCompare(url),
    ])

    if (previewResult.status !== 'fulfilled') {
      throw previewResult.reason
    }

    const card = previewResult.value
    renderCard(card)
    jsonRoot.textContent = JSON.stringify(card, null, 2)

    if (compareResult.status === 'fulfilled') {
      renderComparison(card, compareResult.value)
      setStatus('완료되었습니다.', 'ok')
    } else {
      const compareMessage =
        compareResult.reason instanceof Error
          ? compareResult.reason.message
          : 'comparison failed'
      renderComparison(card, [], compareMessage)
      setStatus(`카드 완료, 비교 일부 실패: ${compareMessage}`, 'error')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    cardRoot.classList.add('empty')
    cardRoot.textContent = '렌더링 실패'
    jsonRoot.textContent = JSON.stringify({ error: message }, null, 2)
    compareRoot.classList.add('empty')
    compareRoot.textContent = '비교 결과 없음'
    setStatus(`오류: ${message}`, 'error')
  } finally {
    button.disabled = false
  }
})
