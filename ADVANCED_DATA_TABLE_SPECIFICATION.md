# Advanced Data Table Component Specification

**Purpose:** Complete specification for an advanced, feature-rich data table component with drag-and-drop column reordering, resizing, filtering, bulk selection, and persistent user preferences.

**Use Case:** This document can be used as a reference for implementing a similar table component in any project requiring advanced data management capabilities.

---

## 🎯 Core Features Overview

### 1. **Column Management**
- ✅ Drag-and-drop column reordering
- ✅ Column visibility toggle (show/hide columns)
- ✅ Column width resizing (drag-to-resize)
- ✅ Persistent column preferences (localStorage)
- ✅ Column width constraints (min/max limits)

### 2. **Data Interaction**
- ✅ Multi-column sorting (click headers to sort)
- ✅ Row click handlers
- ✅ Row selection (single, multi, range selection)
- ✅ Bulk operations
- ✅ Keyboard shortcuts

### 3. **User Preferences**
- ✅ Row density control (compact/comfortable/spacious)
- ✅ Persistent preferences via localStorage
- ✅ Column order persistence
- ✅ Column visibility persistence
- ✅ Column width persistence

### 4. **Visual Features**
- ✅ Sticky headers
- ✅ Alternating row colors
- ✅ Row hover effects
- ✅ Selected row highlighting
- ✅ Custom cell rendering
- ✅ Badge/tag components
- ✅ Tooltips
- ✅ Loading states
- ✅ Empty states

### 5. **Data Export**
- ✅ CSV export functionality
- ✅ Customizable export handlers

---

## 📋 Component Architecture

### Core Components

#### 1. **DataTable (Main Component)**

**Props:**
```typescript
{
  data: Array<Object>              // Array of row data objects
  columns: Array<Column>           // Column configuration array
  loading?: boolean                // Loading state
  onRowClick?: (row) => void       // Callback when row is clicked
  density?: 'compact' | 'comfortable' | 'spacious'  // Row density
  showColumnControls?: boolean     // Show column management UI
  exportable?: boolean             // Show export button
  onExport?: () => void            // Export handler
  className?: string               // Additional CSS classes
  emptyMessage?: string            // Message when no data
  selectedIds?: Set<number|string> // Currently selected row IDs
}
```

**Column Configuration:**
```typescript
{
  key: string                      // Unique column identifier
  label: string                    // Display label
  width?: number | string          // Default width (px or percentage)
  render?: (value, row, index, density) => ReactNode  // Custom cell renderer
}
```

#### 2. **SortableHeader Component**
- Clickable header for sorting
- Visual sort indicators (↑ ↓ ↕)
- Drag handle for column reordering
- Hover effects

#### 3. **SortableResizableHeader Component**
- All features of SortableHeader
- Resize handle on right border
- Visual feedback during resize
- Width constraints (min: 50px, max: 800px)

#### 4. **CompactBadge Component**
- Small badge/tag component
- Color variants
- Size variants (xs, sm, md)

#### 5. **Tooltip Component**
- Hover tooltips
- Positioned above element
- Auto-positioning

---

## 🔧 Technical Implementation Details

### State Management

#### Local Storage Keys
- `dataTable_density` - User's preferred row density
- `dataTable_columnOrder` - Saved column order (JSON array)
- `dataTable_visibleColumns` - Saved visible columns (JSON array)
- `dataTable_columnWidths` - Saved column widths (JSON object)

#### Internal State
```javascript
const [density, setDensity] = useState('compact')
const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
const [columnOrder, setColumnOrder] = useState([])
const [visibleColumns, setVisibleColumns] = useState([])
const [columnWidths, setColumnWidths] = useState({})
const [isResizing, setIsResizing] = useState(false)
const [resizingColumn, setResizingColumn] = useState(null)
```

### Drag and Drop Implementation

**Library:** `@dnd-kit/core` and `@dnd-kit/sortable`

**Features:**
- Column headers can be dragged to reorder
- Requires 8px movement before activation (prevents accidental drags)
- Keyboard support for accessibility
- Visual feedback during drag (opacity change)

**Sensors:**
```javascript
useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 }
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  })
)
```

### Column Resizing

**Implementation:**
1. Resize handle positioned on right border of each column
2. On mouse down: capture start position and initial width
3. On mouse move: calculate new width (delta = currentX - startX)
4. Apply constraints: min 50px, max 800px
5. Update state and save to localStorage
6. On mouse up: clean up event listeners

**Visual Feedback:**
- Resize handle appears on hover (gray bar)
- Handle becomes blue when actively resizing
- Cursor changes to `col-resize`

### Sorting

**Implementation:**
- Click header to sort by that column
- First click: ascending (↑)
- Second click: descending (↓)
- Third click: remove sort (↕)
- Visual indicators show current sort state

**Sort Logic:**
```javascript
const sortedData = useMemo(() => {
  if (!sortConfig.key) return data
  
  return [...data].sort((a, b) => {
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1
    }
    return 0
  })
}, [data, sortConfig])
```

---

## 🎨 Visual Design Specifications

### Row Density

**Compact:**
- Padding: `py-2` (8px vertical)
- Best for: Maximum data visibility
- Shows more rows per viewport

**Comfortable:**
- Padding: `py-3` (12px vertical)
- Best for: Balanced view
- Default for most use cases

**Spacious:**
- Padding: `py-4` (16px vertical)
- Best for: Easy scanning
- More whitespace for readability

### Table Container

**Height Calculation:**
- Uses viewport height: `h-[calc(100vh-200px)]`
- Adjusts based on available space
- Horizontal scroll for wide tables
- Vertical scroll for long data sets

**Styling:**
- Sticky header (remains visible while scrolling)
- Alternating row colors (white/gray-50)
- Row hover effect (bg-gray-50)
- Selected row highlighting (bg-blue-50 with ring)

### Column Headers

**Styling:**
- Background: `bg-gray-50`
- Sticky positioning: `sticky top-0 z-20`
- Hover effect: `hover:bg-gray-100`
- Border: `border-r border-gray-300` (right border for resize handle)

**Visual Indicators:**
- Sort icon: ↑ (asc), ↓ (desc), ↕ (none)
- Drag handle: ⋮⋮ (grip dots)
- Resize handle: 8px wide bar on right edge

---

## 🔄 Advanced Features

### Bulk Selection (Wrapper Component Feature)

**Selection Methods:**
1. **Individual Selection:** Click checkbox
2. **Multi-Selection:** Ctrl/Cmd + Click
3. **Range Selection:** Shift + Click (selects all rows between first and last)
4. **Select All:** Header checkbox or Ctrl+A

**Keyboard Shortcuts:**
- `Ctrl+A` / `Cmd+A`: Select all visible rows
- `Ctrl+Shift+A` / `Cmd+Shift+A`: Deselect all
- `Delete`: Delete selected rows (if handler provided)
- `Escape`: Clear selection

**Visual Feedback:**
- Selected rows: Blue background (`bg-blue-50`)
- Selection ring: Blue ring (`ring-2 ring-blue-200`)
- Bulk action bar appears when items selected

### Filtering (Wrapper Component Feature)

**Filter Types:**
- Dropdown filters (single select)
- Multi-select filters
- Text search filters
- Date range filters

**Filter Integration:**
- Filters applied before data reaches DataTable
- Filter state managed in wrapper component
- Clear filters button
- Results count display

### Export Functionality

**CSV Export:**
- Exports all visible/filtered data
- Handles special characters (commas, quotes, newlines)
- Customizable filename with timestamp
- Triggered via button in table controls

---

## 📱 Responsive Behavior

### Mobile Considerations
- Horizontal scroll for wide tables
- Touch-friendly drag handles
- Simplified column controls
- Responsive column widths

### Breakpoint Handling
- Table maintains minimum width (1200px)
- Container scrolls horizontally when needed
- Column widths adapt to screen size
- Density controls remain accessible

---

## 🎯 User Experience Patterns

### 1. **Column Management Workflow**

**Reordering:**
1. User drags column header
2. Visual feedback shows drop position
3. Column moves to new position
4. Order saved to localStorage
5. Preference persists across sessions

**Hiding/Showing:**
1. Click "Columns" button
2. Checkbox list appears
3. Toggle columns on/off
4. Changes apply immediately
5. Preference saved to localStorage

**Resizing:**
1. Hover over column border
2. Resize handle appears
3. Drag to desired width
4. Width updates in real-time
5. Width saved to localStorage

### 2. **Data Exploration Workflow**

**Sorting:**
1. Click column header to sort
2. Indicator shows sort direction
3. Data reorders immediately
4. Can sort by multiple columns (if implemented)

**Filtering:**
1. Apply filters via filter controls
2. Table updates to show filtered data
3. Row count updates
4. Clear filters to reset

**Density Adjustment:**
1. Click density button (Compact/Comfortable/Spacious)
2. Row spacing changes immediately
3. More/fewer rows visible
4. Preference saved

### 3. **Bulk Operations Workflow**

1. Select rows (individual, multi, or range)
2. Bulk action bar appears
3. Choose action (assign, delete, export, etc.)
4. Confirm action (if destructive)
5. Action applied to all selected rows
6. Selection cleared

---

## 🔌 Integration Points

### Data Flow

```
Parent Component
    ↓ (provides data, columns, handlers)
Wrapper Component (e.g., IssuesTable)
    ↓ (applies filters, manages selection)
DataTable Component
    ↓ (handles display, sorting, column management)
Row Rendering
    ↓ (custom renderers for cells)
Cell Components (Badges, Tooltips, etc.)
```

### Callback Functions

**Required:**
- None (component is self-contained)

**Optional:**
- `onRowClick(row)` - Handle row click
- `onExport()` - Handle export action
- Custom `render` functions in column config

### State Synchronization

**Parent → Table:**
- Data updates automatically re-render
- Column config changes trigger re-initialization
- Selected IDs synced from parent

**Table → Parent:**
- Row clicks trigger parent callback
- Export triggers parent export handler
- Selection state managed by parent (if needed)

---

## 🛠️ Implementation Checklist

### Core Features
- [ ] Basic table rendering with data
- [ ] Column configuration system
- [ ] Sticky headers
- [ ] Row click handling
- [ ] Loading state
- [ ] Empty state

### Column Management
- [ ] Drag-and-drop column reordering
- [ ] Column visibility toggle
- [ ] Column width resizing
- [ ] LocalStorage persistence
- [ ] Reset column widths

### Sorting & Filtering
- [ ] Column sorting (click to sort)
- [ ] Sort indicators
- [ ] Filter integration (in wrapper)
- [ ] Clear filters

### User Preferences
- [ ] Row density control
- [ ] Density persistence
- [ ] Column order persistence
- [ ] Column visibility persistence
- [ ] Column width persistence

### Advanced Features
- [ ] Bulk selection
- [ ] Keyboard shortcuts
- [ ] CSV export
- [ ] Custom cell renderers
- [ ] Tooltips
- [ ] Badge components

### Visual Polish
- [ ] Alternating row colors
- [ ] Hover effects
- [ ] Selected row highlighting
- [ ] Smooth animations
- [ ] Responsive design

---

## 📚 Dependencies

### Required Libraries
- `react` - React framework
- `@dnd-kit/core` - Drag and drop core
- `@dnd-kit/sortable` - Sortable utilities
- `@dnd-kit/utilities` - DnD utilities

### Optional Libraries
- `tailwindcss` - Styling (or equivalent CSS framework)
- Custom badge/tooltip components

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Touch support for mobile
- Keyboard navigation support

---

## 🎓 Best Practices

### Performance
1. **Memoization:** Use `useMemo` for sorted/filtered data
2. **Callbacks:** Use `useCallback` for event handlers
3. **Virtual Scrolling:** Consider for very large datasets (1000+ rows)
4. **Lazy Loading:** Load data in chunks if needed

### Accessibility
1. **Keyboard Navigation:** Full keyboard support
2. **ARIA Labels:** Proper labels for screen readers
3. **Focus Management:** Visible focus indicators
4. **Screen Reader:** Announce sort/filter changes

### User Experience
1. **Visual Feedback:** Clear indicators for all actions
2. **Persistence:** Save user preferences automatically
3. **Reset Options:** Provide way to reset preferences
4. **Loading States:** Show loading indicators
5. **Error Handling:** Graceful error states

### Code Organization
1. **Component Separation:** Split into logical components
2. **Custom Hooks:** Extract reusable logic
3. **Configuration:** Make component configurable
4. **Documentation:** Comment complex logic

---

## 📝 Example Usage

### Basic Implementation

```jsx
import DataTable from './components/DataTable'

const columns = [
  { key: 'id', label: 'ID', width: 80 },
  { key: 'name', label: 'Name', width: 200 },
  { key: 'status', label: 'Status', width: 120 },
  { 
    key: 'actions', 
    label: 'Actions', 
    width: 150,
    render: (value, row) => (
      <button onClick={() => handleAction(row)}>Action</button>
    )
  }
]

const data = [
  { id: 1, name: 'Item 1', status: 'Active' },
  { id: 2, name: 'Item 2', status: 'Inactive' },
]

function MyTable() {
  return (
    <DataTable
      data={data}
      columns={columns}
      onRowClick={(row) => console.log('Clicked:', row)}
      onExport={() => exportToCSV(data)}
    />
  )
}
```

### Advanced Implementation with Filters

```jsx
import { useState, useMemo } from 'react'
import DataTable from './components/DataTable'

function FilteredTable() {
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all'
  })
  
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filters.status !== 'all' && item.status !== filters.status) return false
      if (filters.category !== 'all' && item.category !== filters.category) return false
      return true
    })
  }, [data, filters])
  
  return (
    <div>
      {/* Filter Controls */}
      <div className="filters">
        <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      
      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
      />
    </div>
  )
}
```

---

## 🚀 Future Enhancements

### Potential Features
- [ ] Virtual scrolling for large datasets
- [ ] Multi-column sorting
- [ ] Column grouping
- [ ] Row expansion/collapse
- [ ] Inline editing
- [ ] Column pinning (freeze columns)
- [ ] Advanced filtering UI
- [ ] Export to other formats (Excel, PDF)
- [ ] Print optimization
- [ ] Column search/filter
- [ ] Row actions menu
- [ ] Undo/redo for bulk operations

---

## 📖 Summary

This specification describes a production-ready, feature-rich data table component with:

✅ **Column Management:** Reorder, resize, show/hide columns
✅ **Data Interaction:** Sort, filter, select, bulk operations
✅ **User Preferences:** Persistent settings via localStorage
✅ **Visual Polish:** Modern UI with smooth interactions
✅ **Accessibility:** Keyboard navigation and screen reader support
✅ **Performance:** Optimized with memoization and efficient rendering

The component is designed to be:
- **Reusable** across different projects
- **Configurable** for various use cases
- **Extensible** for custom requirements
- **Maintainable** with clear architecture

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Status:** Complete Specification




