/**
 * Tableaux lisibles sur téléphone : chaque cellule reçoit l'intitulé de sa colonne (`data-label`),
 * ce qui permet à la feuille de style d'afficher chaque ligne comme une carte (voir admin-mobile.css).
 * Les tableaux ajoutés plus tard sont pris en charge automatiquement.
 */
function textOf(cell: Element) {
  return (cell.textContent || '').replace(/\s+/g, ' ').trim()
}

function annotate(table: HTMLTableElement) {
  const headers = [...table.querySelectorAll('thead th')].map(textOf)
  if (!headers.length) return
  table.querySelectorAll('tbody tr').forEach((row) => {
    let column = 0
    ;[...row.children].forEach((cell) => {
      const span = Number((cell as HTMLTableCellElement).colSpan) || 1
      if (span === 1 && cell.tagName === 'TD') {
        const label = headers[column] || ''
        if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label)
      }
      column += span
    })
  })
}

export function annotateAllTables(root: ParentNode = document) {
  root.querySelectorAll('table').forEach((table) => annotate(table as HTMLTableElement))
}

/** Annote les tableaux déjà présents et surveille ceux qui apparaissent ou changent. Renvoie la fonction d'arrêt. */
export function watchTables() {
  let frame = 0
  const run = () => {
    frame = 0
    annotateAllTables()
  }
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(run)
  }
  annotateAllTables()
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  return () => {
    observer.disconnect()
    if (frame) window.cancelAnimationFrame(frame)
  }
}
