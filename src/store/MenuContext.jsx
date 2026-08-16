import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { backend, isCloudConfigured } from './backend'
import { MENU as SEED_MENU, ITEM_INDEX as SEED_INDEX, findItem as seedFindItem, TOTAL_ITEMS as SEED_TOTAL, CHEF_SPECIALS as SEED_SPECIALS } from '../data/menu'

/**
 * Database-driven menu.
 *
 * In cloud mode, loads the menu from Supabase and subscribes to realtime
 * changes so a price edit in the admin CMS propagates to every customer phone
 * instantly. Falls back to the static seed data in menu.js if the database
 * tables are empty or in local mode.
 *
 * Every component that used to import MENU / findItem / ITEM_INDEX from
 * data/menu.js now reads from this context instead.
 */

const MenuContext = createContext(null)

function buildIndex(menu) {
  return menu.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        sectionId: section.id,
        sectionName: section.name,
        groupId: group.id,
        groupName: group.name,
        tiers: group.tiers,
        addOn: group.addOn,
        basePrice: item.price ?? item.prices?.[0],
      })),
    ),
  )
}

export function MenuProvider({ children }) {
  const [menu, setMenu] = useState(SEED_MENU)
  const [loading, setLoading] = useState(isCloudConfigured)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const data = await backend.listMenu()
      if (!mounted.current) return
      if (data) {
        setMenu(data)
      }
      // null means use seed fallback (local mode or empty DB)
    } catch {
      // On failure, keep the current menu — never leave a blank screen.
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (isCloudConfigured) refresh()
    const unsubscribe = backend.subscribeMenu(refresh)
    return () => {
      mounted.current = false
      unsubscribe?.()
    }
  }, [refresh])

  const itemIndex = useMemo(() => buildIndex(menu), [menu])
  const totalItems = itemIndex.length
  const chefSpecials = useMemo(() => itemIndex.filter((item) => item.chef), [itemIndex])

  const findItem = useCallback(
    (itemId) => itemIndex.find((item) => item.id === itemId),
    [itemIndex],
  )

  // Menu mutation methods (for admin CMS)
  const updateItem = useCallback(
    async (itemId, patch) => {
      // Optimistic update
      setMenu((current) =>
        current.map((section) => ({
          ...section,
          groups: section.groups.map((group) => ({
            ...group,
            items: group.items.map((item) =>
              item.id === itemId ? { ...item, ...patch } : item,
            ),
          })),
        })),
      )
      try {
        await backend.updateMenuItem(itemId, patch)
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const createItem = useCallback(
    async (item) => {
      try {
        await backend.createMenuItem(item)
        await refresh()
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const deleteItem = useCallback(
    async (itemId) => {
      setMenu((current) =>
        current.map((section) => ({
          ...section,
          groups: section.groups.map((group) => ({
            ...group,
            items: group.items.filter((item) => item.id !== itemId),
          })),
        })),
      )
      try {
        await backend.deleteMenuItem(itemId)
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const updateGroup = useCallback(
    async (groupId, patch) => {
      setMenu((current) =>
        current.map((section) => ({
          ...section,
          groups: section.groups.map((group) =>
            group.id === groupId ? { ...group, ...patch } : group,
          ),
        })),
      )
      try {
        await backend.updateMenuGroup(groupId, patch)
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const updateSection = useCallback(
    async (sectionId, patch) => {
      setMenu((current) =>
        current.map((section) =>
          section.id === sectionId ? { ...section, ...patch } : section,
        ),
      )
      try {
        await backend.updateMenuSection(sectionId, patch)
      } catch {
        refresh()
      }
    },
    [refresh],
  )

  const value = useMemo(
    () => ({
      menu,
      itemIndex,
      totalItems,
      chefSpecials,
      findItem,
      loading,
      refresh,
      // Mutations
      updateItem,
      createItem,
      deleteItem,
      updateGroup,
      updateSection,
      isCloud: isCloudConfigured,
    }),
    [menu, itemIndex, totalItems, chefSpecials, findItem, loading, refresh, updateItem, createItem, deleteItem, updateGroup, updateSection],
  )

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (!context) throw new Error('useMenu must be used inside <MenuProvider>')
  return context
}
