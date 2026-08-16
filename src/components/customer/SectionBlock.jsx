import { CrownRule, DotTriad } from '../ornament/Ornaments'
import ItemRow from './ItemRow'

/** A group of items under its crown-tipped rule — the printed card's unit. */
function GroupBlock({ group, query }) {
  return (
    <section aria-labelledby={`group-${group.id}`} className="mt-9 first:mt-0">
      <header className="text-center">
        <div className="flex items-center justify-center gap-3">
          <DotTriad />
          <h3
            id={`group-${group.id}`}
            className="font-display text-[0.82rem] font-medium tracking-[0.24em] text-ink uppercase letterpress"
          >
            {group.name}
          </h3>
          <DotTriad />
        </div>
        <CrownRule className="mt-1" />
      </header>

      <ul className="mt-1 divide-y divide-brass/15">
        {group.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            group={group}
            highlight={Boolean(query) && item.name.toLowerCase().startsWith(query.toLowerCase())}
          />
        ))}
      </ul>

      {group.footnote && (
        <p className="mt-2 font-body text-[0.7rem] text-ink-soft italic">*{group.footnote}</p>
      )}

      {group.addOn && (
        <p className="mt-2 font-mono text-[10px] tracking-[0.06em] text-brass-dim">
          + Add {group.addOn.label.toLowerCase()} for {group.addOn.price} — choose it on your bill
        </p>
      )}
    </section>
  )
}

/** One page of the printed menu: its title, its note, its groups. */
export default function SectionBlock({ section, query }) {
  return (
    <section id={`section-${section.id}`} aria-labelledby={`heading-${section.id}`} className="scroll-mt-32">
      <header className="pt-10 pb-2 text-center">
        <p className="font-mono text-[10px] tracking-[0.26em] text-brass-dim uppercase">
          {section.kicker}
        </p>
        <h2
          id={`heading-${section.id}`}
          className="mt-2 font-display text-[1.35rem] leading-tight font-medium tracking-[0.14em] text-ink uppercase letterpress"
        >
          {section.name}
        </h2>
        <div className="mx-auto mt-2 w-28">
          <CrownRule />
        </div>
      </header>

      {section.note && (
        <p className="mx-auto max-w-prose px-2 pt-2 pb-1 text-center font-body text-[0.78rem] leading-relaxed text-ink-soft italic">
          {section.note}
        </p>
      )}

      <div className="mt-3">
        {section.groups.map((group) => (
          <GroupBlock key={group.id} group={group} query={query} />
        ))}
      </div>
    </section>
  )
}
