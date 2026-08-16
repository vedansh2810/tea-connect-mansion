import CustomerMenu from './components/customer/CustomerMenu'
import TableGate from './components/customer/TableGate'
import AdminDashboard from './components/admin/AdminDashboard'
import PassGate from './components/admin/PassGate'
import { CartProvider } from './store/CartContext'
import { OrdersProvider } from './store/OrdersContext'
import { AvailabilityProvider } from './store/AvailabilityContext'
import { useRoute } from './lib/useRoute'

/**
 * Two screens off one URL:
 *
 *   ?table=4        the customer's menu for table 4
 *   ?view=admin     the kitchen pass
 *   (no table)      the scan prompt
 *
 * Both sit inside OrdersProvider, so an order placed on one is on the other
 * immediately — in this tab, and in any other tab on this browser.
 *
 * Each view carries its own way across: the pass has a "Customer view" button
 * in its header, and in demo mode the menu has a link in its footer. No
 * floating switcher — it would sit on top of the very layout it demonstrates.
 */
export default function App() {
  const { view, table, demo, navigate } = useRoute()

  if (view === 'admin') {
    return (
      <PassGate>
        <OrdersProvider>
          <AvailabilityProvider>
            <AdminDashboard onOpenMenu={() => navigate({ view: 'menu', table: table ?? '4' })} />
          </AvailabilityProvider>
        </OrdersProvider>
      </PassGate>
    )
  }

  return (
    <OrdersProvider>
      <AvailabilityProvider>
        {table ? (
          <CartProvider table={table}>
            <CustomerMenu
              table={table}
              demo={demo}
              onChangeTable={() => navigate({ view: 'menu', table: null })}
              onOpenPass={() => navigate({ view: 'admin' })}
            />
          </CartProvider>
        ) : (
          <TableGate
            demo={demo}
            onTable={(next) => navigate({ view: 'menu', table: next })}
            onOpenPass={() => navigate({ view: 'admin' })}
          />
        )}
      </AvailabilityProvider>
    </OrdersProvider>
  )
}
