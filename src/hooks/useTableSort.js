import { useState } from 'react'

export function useTableSort(initialBy = null, initialDir = 'asc') {
  const [sortBy, setSortBy] = useState(initialBy)
  const [sortDir, setSortDir] = useState(initialDir)

  const toggle = (key) => {
    if (sortBy === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  return { sortBy, sortDir, toggle, setSortBy, setSortDir }
}

export function sortRows(rows, sortBy, sortDir, getValue) {
  if (!sortBy || !rows || rows.length === 0) {
    return rows
  }

  const dir = sortDir === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    const valueA = getValue(a)
    const valueB = getValue(b)

    if (valueA === valueB) return 0
    if (valueA === null || valueA === undefined || valueA === '') return 1
    if (valueB === null || valueB === undefined || valueB === '') return -1

    const numA = Number(valueA)
    const numB = Number(valueB)

    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      return (numA - numB) * dir
    }

    return String(valueA).localeCompare(String(valueB), 'es', { sensitivity: 'base' }) * dir
  })
}