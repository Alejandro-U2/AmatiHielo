import { useEffect, useMemo, useState } from 'react'
import { ReceiptText, ShoppingCart, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { getRecetas } from '../../services/recetasService'
import { createVentaPos, listMetodosPago, listVentasPos } from '../../services/posService'
import {
  capitalizeWords,
  isValidNIT,
  isValidNombreCliente,
  isValidTelefono,
  sanitizeNombreCliente,
  sanitizeNIT,
  sanitizeTelefono,
} from '../../utils/validation'

function PuntoVenta() {
  const [activeTab, setActiveTab] = useState('venta')
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [cart, setCart] = useState([])
  const [paymentMethods, setPaymentMethods] = useState(['Efectivo', 'Transferencia'])
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('todos')
  const [showPayment, setShowPayment] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [needsInvoice, setNeedsInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState({ nit: '', nombreCliente: '', numeroTelefono: '' })

  const loadData = async () => {
    try {
      setLoading(true)
      const [recipes, salesData, methods] = await Promise.all([
        getRecetas(),
        listVentasPos(),
        listMetodosPago().catch(() => []),
      ])
      setProducts(recipes.map((recipe) => ({
        id: recipe.id,
        codigo: recipe.codigo,
        nombre: recipe.nombre,
        categoria: recipe.categoria || 'General',
        presentacion: recipe.presentacion,
        precio: Number(recipe.precioSugerido || recipe.costoTotal || 0),
        ingredientes: recipe.ingredientes || [],
      })))
      setSales(salesData)
      if (methods.length) setPaymentMethods(methods.map((method) => method.nombre))
    } catch (error) {
      toast.error(error.message || 'No fue posible cargar el punto de venta.')
      setProducts([])
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const categories = useMemo(
    () => ['todos', ...new Set(products.map((product) => product.categoria).filter(Boolean))],
    [products],
  )
  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || product.nombre.toLowerCase().includes(term) || product.codigo.toLowerCase().includes(term)
    return matchesSearch && (category === 'todos' || product.categoria === category)
  })
  const subtotal = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const iva = subtotal * 0.12
  const total = subtotal + iva
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)

  const addToCart = (product) => {
    if (!product.ingredientes.length || product.ingredientes.some((ingredient) => !ingredient.productoId)) {
      toast.error('Este producto tiene un BOM incompleto y no puede venderse.')
      return
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item)
        : [...current, { ...product, cantidad: 1 }]
    })
  }

  const updateQuantity = (id, quantity) => {
    setCart((current) => quantity <= 0
      ? current.filter((item) => item.id !== id)
      : current.map((item) => item.id === id ? { ...item, cantidad: quantity } : item))
  }

  const closePayment = () => {
    if (processing) return
    setShowPayment(false)
    setNeedsInvoice(false)
    setInvoiceData({ nit: '', nombreCliente: '', numeroTelefono: '' })
  }

  const confirmSale = async () => {
    if (!cart.length) return
    if (needsInvoice && (!invoiceData.nit || !invoiceData.nombreCliente || !invoiceData.numeroTelefono)) {
      toast.error('Para emitir factura debe proporcionar NIT, nombre y teléfono.')
      return
    }
    if (needsInvoice && (!isValidNIT(invoiceData.nit) || !isValidNombreCliente(invoiceData.nombreCliente) || !isValidTelefono(invoiceData.numeroTelefono))) {
      toast.error('Revise los datos de facturación.')
      return
    }
    try {
      setProcessing(true)
      const sale = await createVentaPos({
        metodoPago: paymentMethod,
        necesitaFactura: needsInvoice,
        nit: invoiceData.nit || null,
        nombreCliente: invoiceData.nombreCliente || null,
        numeroTelefono: invoiceData.numeroTelefono || null,
        items: cart.map((item) => ({ recetaId: item.id, cantidad: item.cantidad, precioUnitario: item.precio })),
      })
      toast.success(`Venta ${sale.ticket} registrada. Inventario descontado según BOM.`)
      setCart([])
      closePayment()
      await loadData()
    } catch (error) {
      toast.error(error.message || 'No fue posible registrar la venta.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="dashboard-shell p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Punto de Venta (POS)</h2>
          <p className="text-gray-600">Venta con consumo directo de materias primas desde el BOM</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600"><ReceiptText size={18} /> Ventas: <strong>Q{totalSales.toFixed(2)}</strong></div>
      </div>

      <div className="mb-6 border-b border-gray-200 flex gap-5">
        {['venta', 'historial'].map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`pb-3 font-medium ${activeTab === tab ? 'border-b-2 border-cyan-500 text-cyan-600' : 'text-gray-500'}`}>
            {tab === 'venta' ? 'Realizar Venta' : 'Historial de Ventas'}
          </button>
        ))}
      </div>

      {activeTab === 'venta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2">
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto por nombre o código..." className="w-full sm:flex-1 px-4 py-2 border border-gray-300 rounded-lg" />
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
                {categories.map((item) => <option key={item} value={item}>{item === 'todos' ? 'Todas las categorías' : item}</option>)}
              </select>
              <button type="button" onClick={loadData} className="px-4 py-2 bg-gray-200 rounded-lg">Recargar</button>
            </div>
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex justify-between mb-4"><h3 className="text-lg font-semibold text-gray-800">Productos de Venta</h3>{loading && <span className="text-sm text-gray-500">Cargando...</span>}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const completeBom = product.ingredientes.length > 0 && product.ingredientes.every((ingredient) => ingredient.productoId)
                  return <button key={product.id} type="button" onClick={() => addToCart(product)} className="text-left bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-4 hover:shadow-lg disabled:opacity-60" disabled={!completeBom}>
                    <h4 className="font-semibold text-gray-800 text-sm">{product.nombre}</h4><p className="text-xs text-gray-500 mb-2">{product.codigo}</p>
                    <div className="flex justify-between items-center"><span className="text-lg font-bold text-cyan-700">Q{product.precio.toFixed(2)}</span><span className={`text-xs px-2 py-1 rounded-full ${completeBom ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{completeBom ? 'Disponible' : 'BOM incompleto'}</span></div>
                    <p className="text-xs text-gray-600 mt-2">{product.presentacion || 'Sin presentación'}</p>
                  </button>
                })}
                {!filteredProducts.length && <div className="col-span-full py-10 text-center text-sm text-gray-500">No hay productos de venta disponibles.</div>}
              </div>
            </div>
          </section>

          <aside className="bg-white rounded-lg shadow-md p-4 md:p-6 h-fit lg:sticky lg:top-6">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><ShoppingCart size={20} /> Carrito</h3>{cart.length > 0 && <button type="button" onClick={() => setCart([])} className="text-sm text-red-600">Vaciar</button>}</div>
            {!cart.length ? <div className="text-center py-12 text-gray-400">Carrito vacío<p className="text-sm mt-2">Selecciona productos para vender</p></div> : <>
              <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">{cart.map((item) => <div key={item.id} className="bg-gray-50 rounded-lg p-3"><div className="flex justify-between"><span className="font-medium text-sm">{item.nombre}</span><button type="button" onClick={() => updateQuantity(item.id, 0)} className="text-red-500" aria-label={`Eliminar ${item.nombre}`}><Trash2 size={16} /></button></div><div className="flex justify-between items-center mt-2"><div className="flex items-center gap-2"><button type="button" onClick={() => updateQuantity(item.id, item.cantidad - 1)} className="w-7 h-7 bg-gray-200 rounded">-</button><span>{item.cantidad}</span><button type="button" onClick={() => updateQuantity(item.id, item.cantidad + 1)} className="w-7 h-7 bg-cyan-500 text-white rounded">+</button></div><strong>Q{(item.precio * item.cantidad).toFixed(2)}</strong></div></div>)}</div>
              <div className="border-t pt-4 space-y-2"><div className="flex justify-between text-sm"><span>Subtotal</span><strong>Q{subtotal.toFixed(2)}</strong></div><div className="flex justify-between text-sm"><span>IVA (12%)</span><strong>Q{iva.toFixed(2)}</strong></div><div className="flex justify-between text-lg font-bold border-t pt-2"><span>Total</span><span className="text-cyan-700">Q{total.toFixed(2)}</span></div></div>
              <button type="button" onClick={() => setShowPayment(true)} className="w-full mt-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg">Procesar Pago</button>
            </>}
          </aside>
        </div>
      )}

      {activeTab === 'historial' && <div className="bg-white rounded-lg shadow-md overflow-x-auto"><table className="min-w-full"><thead className="bg-cyan-50"><tr>{['Fecha', 'Ticket', 'Cliente', 'Total', 'Método', 'Acciones'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase">{heading}</th>)}</tr></thead><tbody className="divide-y">{sales.map((sale) => <tr key={sale.id}><td className="px-4 py-4 text-sm">{sale.fecha}</td><td className="px-4 py-4 font-mono text-sm">{sale.ticket}</td><td className="px-4 py-4 text-sm">{sale.cliente}</td><td className="px-4 py-4 text-sm font-bold text-green-600">Q{sale.total.toFixed(2)}</td><td className="px-4 py-4 text-sm">{sale.metodoPago}</td><td className="px-4 py-4"><button type="button" onClick={() => setSelectedSale(sale)} className="px-3 py-2 bg-cyan-600 text-white text-sm rounded-lg">Ver ticket</button></td></tr>)}{!sales.length && <tr><td colSpan="6" className="px-4 py-10 text-center text-sm text-gray-500">No hay ventas registradas.</td></tr>}</tbody></table></div>}

      {showPayment && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[94vh] overflow-y-auto"><div className="bg-green-600 text-white px-5 py-4 flex justify-between"><div><h3 className="text-xl font-bold">Procesar Pago</h3><p>Total a cobrar: Q{total.toFixed(2)}</p></div><button type="button" onClick={closePayment} aria-label="Cerrar"><X /></button></div><div className="p-5 space-y-4"><div><label className="block text-sm font-medium mb-2">Método de Pago</label><div className="grid grid-cols-2 gap-2">{paymentMethods.map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className={`py-2 border-2 rounded-lg ${paymentMethod === method ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300'}`}>{method}</button>)}</div></div><div><label className="block text-sm font-medium mb-2">¿Necesita Factura?</label><div className="flex gap-2"><button type="button" onClick={() => setNeedsInvoice(true)} className={`flex-1 py-2 border-2 rounded-lg ${needsInvoice ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>Sí</button><button type="button" onClick={() => setNeedsInvoice(false)} className={`flex-1 py-2 border-2 rounded-lg ${!needsInvoice ? 'border-gray-500 bg-gray-50' : 'border-gray-300'}`}>No</button></div></div>{needsInvoice && <div className="bg-blue-50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2"><input placeholder="NIT" value={invoiceData.nit} onChange={(event) => setInvoiceData({ ...invoiceData, nit: sanitizeNIT(event.target.value) })} className="px-3 py-2 border rounded-lg" /><input placeholder="Nombre del cliente" value={invoiceData.nombreCliente} onChange={(event) => setInvoiceData({ ...invoiceData, nombreCliente: sanitizeNombreCliente(event.target.value) })} onBlur={(event) => setInvoiceData({ ...invoiceData, nombreCliente: capitalizeWords(event.target.value) })} className="px-3 py-2 border rounded-lg" /><input placeholder="Teléfono" value={invoiceData.numeroTelefono} onChange={(event) => setInvoiceData({ ...invoiceData, numeroTelefono: sanitizeTelefono(event.target.value) })} className="px-3 py-2 border rounded-lg" /></div>}<div className="bg-cyan-50 p-3 flex justify-between font-bold"><span>Total</span><span>Q{total.toFixed(2)}</span></div></div><div className="px-5 py-3 bg-gray-50 flex justify-end gap-3"><button type="button" onClick={closePayment} disabled={processing} className="px-4 py-2 bg-gray-500 text-white rounded-lg">Cancelar</button><button type="button" onClick={confirmSale} disabled={processing} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg">{processing ? 'Validando...' : 'Confirmar Venta'}</button></div></div></div>}
      {selectedSale && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg max-w-2xl w-full p-6"><div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Ticket {selectedSale.ticket}</h3><button type="button" onClick={() => setSelectedSale(null)} aria-label="Cerrar"><X /></button></div><p>Cliente: {selectedSale.cliente}</p><p>Método de pago: {selectedSale.metodoPago}</p><p className="font-bold mt-3">Total: Q{selectedSale.total.toFixed(2)}</p><div className="mt-4 border-t pt-4">{selectedSale.detalles?.map((detail) => <div key={detail.id} className="flex justify-between py-1 text-sm"><span>{detail.nombre} x {detail.cantidad}</span><span>Q{detail.total.toFixed(2)}</span></div>)}</div></div></div>}
    </div>
  )
}

export default PuntoVenta
