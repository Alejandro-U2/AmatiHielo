import fs from 'fs';

// 1. Update backend/src/controllers/inventarioController.js
const backendPath = 'backend/src/controllers/inventarioController.js';
let backendContent = fs.readFileSync(backendPath, 'utf8').split('\r\n').join('\n');

const oldBackendSnippet = `  const numeroFactura = String(body.numeroFactura ?? body.numero_factura ?? '').trim()
  if (!Number.isInteger(proveedorId) || !numeroFactura || detalles.length === 0) {
    return res.status(400).json({ message: 'Proveedor, numero de factura y al menos un producto son obligatorios.' })
  }`;

const newBackendSnippet = `  let numeroFactura = String(body.numeroFactura ?? body.numero_factura ?? '').trim()
  if (numeroFactura) {
    const digitsOnly = numeroFactura.replace(/\\D/g, '')
    if (digitsOnly) {
      numeroFactura = \`Fac-\${digitsOnly}\`
    }
  }
  if (!Number.isInteger(proveedorId) || !numeroFactura || detalles.length === 0) {
    return res.status(400).json({ message: 'Proveedor, numero de factura y al menos un producto son obligatorios.' })
  }`;

if (backendContent.includes(oldBackendSnippet)) {
  backendContent = backendContent.replace(oldBackendSnippet, newBackendSnippet);
  console.log('Updated backend numeroFactura prefix normalization!');
} else {
  console.error('Could not find oldBackendSnippet');
}

const oldResponsableSnippet = `const responsable = req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema'`;
const newResponsableSnippet = `const responsable = String(body.responsable || req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema').trim()`;

if (backendContent.includes(oldResponsableSnippet)) {
  backendContent = backendContent.replace(oldResponsableSnippet, newResponsableSnippet);
  console.log('Updated backend responsable handling!');
} else {
  console.error('Could not find oldResponsableSnippet');
}

fs.writeFileSync(backendPath, backendContent, 'utf8');

// 2. Update src/components/modules/Inventarios.jsx
const frontendPath = 'src/components/modules/Inventarios.jsx';
let frontendContent = fs.readFileSync(frontendPath, 'utf8').split('\r\n').join('\n');

// Import getCurrentUser if not present
if (!frontendContent.includes('getCurrentUser')) {
  frontendContent = frontendContent.replace(
    "import { sanitizeSoloLetras, capitalizeWords } from '../../utils/validation'",
    "import { sanitizeSoloLetras, capitalizeWords } from '../../utils/validation'\nimport { getCurrentUser } from '../../services/authService'"
  );
  console.log('Added getCurrentUser import in Inventarios.jsx!');
}

// Update initial entradaForm state
const oldInitialEntradaForm = `  const [entradaForm, setEntradaForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    proveedorId: '',
    numeroFactura: '',
    fechaFactura: '',
    observaciones: '',
    documento: null,
    detalles: [],
  })`;

const newInitialEntradaForm = `  const [entradaForm, setEntradaForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    proveedorId: '',
    numeroFactura: '',
    numeroFacturaOnlyDigits: '',
    responsable: '',
    fechaFactura: '',
    observaciones: '',
    documento: null,
    detalles: [],
  })`;

if (frontendContent.includes(oldInitialEntradaForm)) {
  frontendContent = frontendContent.replace(oldInitialEntradaForm, newInitialEntradaForm);
  console.log('Updated initial entradaForm state!');
} else {
  console.error('Could not find oldInitialEntradaForm');
}

// Update resetEntradaForm
const oldResetEntradaForm = `  const resetEntradaForm = (item = null) => {
    setEntradaForm({
      fecha: new Date().toISOString().slice(0, 10),
      proveedorId: '',
      numeroFactura: '',
      fechaFactura: '',
      observaciones: '',
      documento: null,
      detalles: item?.id
        ? [{ productoId: String(item.id), unidad: item.unidad || 'unidad', cantidad: '', costoUnitario: String(item.precio_compra ?? item.costo_unitario ?? '') }]
        : [{ productoId: '', unidad: 'unidad', cantidad: '', costoUnitario: '' }],
    })
  }`;

const newResetEntradaForm = `  const resetEntradaForm = (item = null) => {
    const currentUser = getCurrentUser()
    const nombreResponsable = currentUser?.nombre || currentUser?.username || 'Usuario actual'
    const rawDigits = String(item?.numero_factura || item?.numeroFactura || '').replace(/\\D/g, '')

    setEntradaForm({
      fecha: new Date().toISOString().slice(0, 10),
      proveedorId: '',
      numeroFactura: rawDigits ? \`Fac-\${rawDigits}\` : '',
      numeroFacturaOnlyDigits: rawDigits,
      responsable: nombreResponsable,
      fechaFactura: '',
      observaciones: '',
      documento: null,
      detalles: item?.id
        ? [{ productoId: String(item.id), unidad: item.unidad || 'unidad', cantidad: '', costoUnitario: String(item.precio_compra ?? item.costo_unitario ?? '') }]
        : [{ productoId: '', unidad: 'unidad', cantidad: '', costoUnitario: '' }],
    })
  }`;

if (frontendContent.includes(oldResetEntradaForm)) {
  frontendContent = frontendContent.replace(oldResetEntradaForm, newResetEntradaForm);
  console.log('Updated resetEntradaForm with current user and invoice digits!');
} else {
  console.error('Could not find oldResetEntradaForm');
}

// Update handleSubmitEntrada
const oldSubmitEntrada = `      if (!entradaForm.proveedorId || !entradaForm.numeroFactura.trim()) throw new Error('Proveedor y número de factura son obligatorios.')
      if (entradaForm.detalles.some((detalle) => !detalle.productoId || Number(detalle.cantidad) <= 0 || Number(detalle.costoUnitario) < 0)) throw new Error('Completa producto, cantidad y costo de cada fila.')
      const documentoPath = await uploadEntradaInventarioDocumento(entradaForm.documento)
      await createEntradaInventario({
        fecha: entradaForm.fecha, proveedorId: Number(entradaForm.proveedorId), numeroFactura: entradaForm.numeroFactura,
        fechaFactura: entradaForm.fechaFactura || null, observaciones: entradaForm.observaciones, documentoPath,
        estado: confirmar ? 'Confirmada' : 'Borrador',
        detalles: entradaForm.detalles.map((detalle) => ({ productoId: Number(detalle.productoId), unidad: detalle.unidad, cantidad: Number(detalle.cantidad), costoUnitario: Number(detalle.costoUnitario) })),
      })`;

const newSubmitEntrada = `      const rawDigits = String(entradaForm.numeroFacturaOnlyDigits || entradaForm.numeroFactura || '').replace(/\\D/g, '')
      if (!entradaForm.proveedorId || !rawDigits) {
        throw new Error('Proveedor y número de factura son obligatorios (ingresa el número).')
      }
      if (entradaForm.detalles.some((detalle) => !detalle.productoId || Number(detalle.cantidad) <= 0 || Number(detalle.costoUnitario) < 0)) {
        throw new Error('Completa producto, cantidad y costo de cada fila.')
      }
      const formattedFactura = \`Fac-\${rawDigits}\`
      const currentUser = getCurrentUser()
      const responsableFinal = entradaForm.responsable || currentUser?.nombre || currentUser?.username || 'Usuario actual'

      const documentoPath = await uploadEntradaInventarioDocumento(entradaForm.documento)
      await createEntradaInventario({
        fecha: entradaForm.fecha,
        proveedorId: Number(entradaForm.proveedorId),
        numeroFactura: formattedFactura,
        responsable: responsableFinal,
        fechaFactura: entradaForm.fechaFactura || null,
        observaciones: entradaForm.observaciones,
        documentoPath,
        estado: confirmar ? 'Confirmada' : 'Borrador',
        detalles: entradaForm.detalles.map((detalle) => ({
          productoId: Number(detalle.productoId),
          unidad: detalle.unidad,
          cantidad: Number(detalle.cantidad),
          costoUnitario: Number(detalle.costoUnitario),
        })),
      })`;

if (frontendContent.includes(oldSubmitEntrada)) {
  frontendContent = frontendContent.replace(oldSubmitEntrada, newSubmitEntrada);
  console.log('Updated handleSubmitEntrada with Fac-x and responsable!');
} else {
  console.error('Could not find oldSubmitEntrada');
}

// Update modal header bar: Responsable and Numero Factura input
const oldModalTopBar = `<div><span className="block text-xs font-semibold text-gray-500">Responsable</span><span className="font-semibold text-gray-700">Usuario actual</span></div>`;
const newModalTopBar = `<div><span className="block text-xs font-semibold text-gray-500">Responsable</span><span className="font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 text-xs sm:text-sm inline-block truncate max-w-full" title={entradaForm.responsable || 'Usuario actual'}>{entradaForm.responsable || getCurrentUser()?.nombre || getCurrentUser()?.username || 'Usuario actual'}</span></div>`;

if (frontendContent.includes(oldModalTopBar)) {
  frontendContent = frontendContent.replace(oldModalTopBar, newModalTopBar);
  console.log('Updated modal top bar responsable display!');
} else {
  console.error('Could not find oldModalTopBar');
}

const oldNumeroFacturaInput = `<div><label className="block text-sm font-semibold text-gray-700 mb-2">Número de factura *</label><input value={entradaForm.numeroFactura} onChange={(e) => setEntradaForm({ ...entradaForm, numeroFactura: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" required /></div>`;

const newNumeroFacturaInput = `<div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Número de factura *</label>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3 py-2 rounded-l-lg border-2 border-r-0 border-gray-200 bg-gray-100 text-gray-700 font-bold text-sm select-none">
                          Fac-
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entradaForm.numeroFacturaOnlyDigits || ''}
                          onKeyDown={(e) => {
                            if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && !/[0-9]/.test(e.key)) {
                              e.preventDefault()
                            }
                          }}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\\D/g, '').slice(0, 15)
                            setEntradaForm({
                              ...entradaForm,
                              numeroFacturaOnlyDigits: digits,
                              numeroFactura: digits ? \`Fac-\${digits}\` : '',
                            })
                          }}
                          placeholder="12345"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-gray-800"
                          required
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Solo números. Se registrará como: <strong className="text-cyan-700 font-mono">{entradaForm.numeroFactura || 'Fac-...'}</strong>
                      </p>
                    </div>`;

if (frontendContent.includes(oldNumeroFacturaInput)) {
  frontendContent = frontendContent.replace(oldNumeroFacturaInput, newNumeroFacturaInput);
  console.log('Updated numeroFactura input with Fac- prefix and numeric-only restriction!');
} else {
  console.error('Could not find oldNumeroFacturaInput');
}

fs.writeFileSync(frontendPath, frontendContent, 'utf8');
console.log('Finished updating Inventarios.jsx successfully!');
