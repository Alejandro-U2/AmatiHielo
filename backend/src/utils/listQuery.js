const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 5

export function parseListQuery(query = {}, { sortColumns = {}, defaultSort = 'created_at', defaultSortDir = 'desc', defaultPageSize = DEFAULT_PAGE_SIZE } = {}) {
  const rawPage = Number.parseInt(query.page, 10)
  const rawSize = Number.parseInt(query.pageSize, 10)
  const rawDesde = typeof query.desde === 'string' && query.desde.trim() !== '' ? query.desde.trim() : null
  const rawHasta = typeof query.hasta === 'string' && query.hasta.trim() !== '' ? query.hasta.trim() : null
  const rawSearch = typeof query.search === 'string' ? query.search.trim() : ''
  const paginate = rawPage > 0 || query.pageSize !== undefined
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = Number.isInteger(rawSize) && rawSize > 0 ? Math.min(rawSize, MAX_PAGE_SIZE) : defaultPageSize
  const sortBy = typeof query.sortBy === 'string' && sortColumns[query.sortBy] ? query.sortBy : defaultSort
  const sortDir = query.sortDir === 'asc' ? 'asc' : defaultSortDir

  return {
    paginate,
    page,
    pageSize,
    search: rawSearch,
    desde: rawDesde,
    hasta: rawHasta,
    sortBy,
    sortDir,
  }
}