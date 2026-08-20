import './DataTable.css';

/**
 * Generic table shell matching the Figma "6/6" search+count header pattern
 * used across Staff Accounts, Patient Records, and Audit Logs.
 *
 * columns: [{ key, label, render?: (row) => node }]
 */
export default function DataTable({
  columns,
  rows,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search patients, kiosks, alert..',
  emptyMessage = 'No results found.',
  loading = false,
}) {
  return (
    <div className="mk-datatable">
      <div className="mk-datatable__toolbar">
        <input
          className="mk-datatable__search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="mk-datatable__count">
          {rows.length}/{rows.length}
        </span>
      </div>

      <table className="mk-datatable__table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={columns.length} className="mk-datatable__empty">
                Loading…
              </td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="mk-datatable__empty">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading &&
            rows.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
