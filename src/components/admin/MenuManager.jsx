import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Star, Check, X, Pencil } from 'lucide-react'
import { useMenu } from '../../store/MenuContext'
import { useAvailability } from '../../store/AvailabilityContext'
import { rupees } from '../../lib/format'

function EditableField({ value, onSave, isArray = false }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')

  useEffect(() => {
    if (isArray) {
      setVal(Array.isArray(value) ? value.join(', ') : value)
    } else {
      setVal(value ?? '')
    }
  }, [value, isArray])

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group relative flex cursor-text items-center gap-1 rounded hover:bg-black/5 px-1 -ml-1 transition-colors"
      >
        <span>
          {isArray 
            ? (Array.isArray(value) ? value.map(v => rupees(v)).join(' / ') : rupees(value)) 
            : value}
        </span>
        <Pencil className="size-3 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    )
  }

  const handleSave = () => {
    setEditing(false)
    if (isArray) {
      const parsed = val.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))
      if (parsed.length > 0) {
        onSave(parsed.length === 1 ? parsed[0] : parsed)
      }
    } else {
      if (val.trim()) {
        onSave(val.trim())
      }
    }
  }

  return (
    <input
      type="text"
      autoFocus
      className="w-full min-w-0 border-b border-brass/40 bg-transparent px-1 font-inherit text-inherit focus:border-brass focus:outline-none"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave()
        if (e.key === 'Escape') {
          setEditing(false)
          setVal(isArray ? (Array.isArray(value) ? value.join(', ') : value) : (value ?? ''))
        }
      }}
      onBlur={handleSave}
    />
  )
}

function ItemRow({ item }) {
  const { updateItem, deleteItem } = useMenu()
  const { unavailable, toggle } = useAvailability()
  const isAvailable = !unavailable.has(item.id)

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${item.name}?`)) {
      deleteItem(item.id)
    }
  }

  return (
    <li className="group flex items-start gap-3 py-2 px-3 border-b border-brass/10 last:border-0 hover:bg-brass/5">
      <div className="mt-1">
        <button
          type="button"
          onClick={() => toggle(item.id)}
          className="flex items-center justify-center"
          title={isAvailable ? "Mark unavailable" : "Mark available"}
        >
          <div className={`size-2.5 rounded-full ${isAvailable ? 'bg-veg' : 'bg-oxblood'}`} />
        </button>
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-body text-sm text-ink">
          <div className="flex-1 font-medium">
            <EditableField 
              value={item.name} 
              onSave={(name) => updateItem(item.id, { name })} 
            />
          </div>
          <button
            type="button"
            onClick={() => updateItem(item.id, { chef: !item.chef })}
            className={`shrink-0 ${item.chef ? 'text-brass' : 'text-ink-soft/30 hover:text-brass/50'}`}
            title="Toggle Chef Special"
          >
            <Star className={`size-4 ${item.chef ? 'fill-current' : ''}`} />
          </button>
          <div className="font-mono text-[11px] text-ink-soft min-w-[60px] text-right">
            <EditableField 
              value={item.prices ?? item.price} 
              isArray={true}
              onSave={(val) => {
                if (Array.isArray(val)) updateItem(item.id, { prices: val, price: null })
                else updateItem(item.id, { price: val, prices: null })
              }} 
            />
          </div>
        </div>
        
        <div className="mt-0.5 text-xs font-body text-ink-soft italic">
          <EditableField 
            value={item.note || 'Add a note...'} 
            onSave={(note) => updateItem(item.id, { note: note === 'Add a note...' ? '' : note })} 
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleDelete}
        className="shrink-0 text-oxblood/40 opacity-0 transition-opacity hover:text-oxblood group-hover:opacity-100 p-1"
        title="Delete item"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  )
}

function AddItemForm({ groupId, onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  const handleSave = () => {
    if (!name.trim() || !price.trim()) return
    const numPrice = Number(price)
    if (isNaN(numPrice)) return

    onAdd({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''),
      group_id: groupId,
      name: name.trim(),
      price: numPrice,
      sort_order: Date.now()
    })
  }

  return (
    <div className="flex items-center gap-2 p-2 mt-2 border border-brass/30 bg-white/50">
      <input
        type="text"
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 border-b border-brass/40 bg-transparent px-1 py-1 font-body text-sm focus:border-brass focus:outline-none"
        autoFocus
      />
      <input
        type="text"
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-20 border-b border-brass/40 bg-transparent px-1 py-1 font-mono text-sm focus:border-brass focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        className="grid size-7 place-items-center bg-brass/10 text-brass-dim hover:bg-brass/20"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="grid size-7 place-items-center text-ink-soft hover:bg-black/5"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

function GroupList({ group }) {
  const { createItem } = useMenu()
  const [isAdding, setIsAdding] = useState(false)

  return (
    <div className="mb-6 pl-4 border-l-2 border-brass/20">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h4 className="font-mono text-[11px] tracking-[0.15em] text-ink-soft uppercase font-semibold">
          {group.name}
        </h4>
        <span className="font-mono text-[10px] text-brass-dim">
          {group.items.length} items
        </span>
      </div>

      <ul className="bg-ivory border border-brass/20 rounded-sm">
        {group.items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
        {group.items.length === 0 && (
          <li className="py-4 text-center font-body text-xs text-ink-soft italic">
            No items in this group
          </li>
        )}
      </ul>

      {isAdding ? (
        <AddItemForm 
          groupId={group.id} 
          onAdd={(item) => {
            createItem(item)
            setIsAdding(false)
          }} 
          onCancel={() => setIsAdding(false)} 
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 border border-dashed border-brass/30 py-2 font-mono text-[10px] tracking-wide text-ink-soft uppercase hover:bg-brass/5"
        >
          <Plus className="size-3" />
          Add Item
        </button>
      )}
    </div>
  )
}

function SectionAccordion({ section }) {
  const [expanded, setExpanded] = useState(false)
  
  const itemCount = section.groups.reduce((sum, g) => sum + g.items.length, 0)

  return (
    <section className="mb-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between border border-brass/40 bg-ivory p-3 transition-colors hover:bg-brass/5"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="size-4 text-brass-dim" />
          ) : (
            <ChevronRight className="size-4 text-brass-dim" />
          )}
          <div className="text-left">
            <h3 className="font-display text-base font-medium tracking-wide text-ink">
              {section.name}
            </h3>
            {section.kicker && (
              <p className="font-mono text-[9px] tracking-wider text-ink-soft uppercase mt-0.5">
                {section.kicker}
              </p>
            )}
          </div>
        </div>
        <span className="font-mono text-[10px] text-brass-dim bg-brass/10 px-2 py-0.5 rounded-full">
          {itemCount} items
        </span>
      </button>

      {expanded && (
        <div className="p-4 border border-t-0 border-brass/40 bg-parchment/50">
          {section.groups.map(group => (
            <GroupList key={group.id} group={group} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function MenuManager({ open, onClose }) {
  const { menu, isCloud } = useMenu()

  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink-deep/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Menu Manager"
    >
      <div className="mx-auto max-w-3xl bg-parchment p-5 shadow-2xl">
        <header className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-lg font-medium tracking-[0.12em] text-ink uppercase">
              Menu Manager
            </h2>
            <p className="mt-1 max-w-md font-body text-xs leading-relaxed text-ink-soft">
              Edit categories, items, and pricing. Changes sync to all phones.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu manager"
            className="grid size-9 shrink-0 place-items-center border border-brass/40 text-ink hover:bg-brass/10"
          >
            <X className="size-4" />
          </button>
        </header>

        {!isCloud && (
          <div className="mb-6 border-l-2 border-oxblood bg-oxblood/[0.07] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-ink">
            <strong>Local Mode Active:</strong> Menu editing requires a database connection. Changes made here won't persist after a reload.
          </div>
        )}

        <div className="space-y-1">
          {menu.map(section => (
            <SectionAccordion key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  )
}
