import fs from 'fs';

const filePath = 'src/components/modules/Inventarios.jsx';
let content = fs.readFileSync(filePath, 'utf8').split('\r\n').join('\n');

// 1. Update handleSubmitEntrada
const oldSubmitCheck = `      const rawDigits = String(entradaForm.numeroFacturaOnlyDigits || entradaForm.numeroFactura || '').replace(/\\D/g, '')
      if (!entradaForm.proveedorId || !rawDigits) {
        throw new Error('Proveedor y número de factura son obligatorios (ingresa el número).')
      }`;

const newSubmitCheck = `      const rawDigits = String(entradaForm.numeroFacturaOnlyDigits || entradaForm.numeroFactura || '').replace(/\\D/g, '')
      if (!rawDigits) {
        throw new Error('El número de factura es obligatorio (ingresa solo números).')
      }`;

if (content.includes(oldSubmitCheck)) {
  content = content.replace(oldSubmitCheck, newSubmitCheck);
  console.log('Updated handleSubmitEntrada check!');
} else {
  console.error('Could not find oldSubmitCheck');
}

const oldPayloadProveedor = `        proveedorId: Number(entradaForm.proveedorId),`;
const newPayloadProveedor = `        proveedorId: entradaForm.proveedorId ? Number(entradaForm.proveedorId) : null,`;

if (content.includes(oldPayloadProveedor)) {
  content = content.replace(oldPayloadProveedor, newPayloadProveedor);
  console.log('Updated handleSubmitEntrada payload proveedorId!');
} else {
  console.error('Could not find oldPayloadProveedor');
}

// 2. Update select JSX
const oldSelect = `<div><label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor *</label><select value={entradaForm.proveedorId} onChange={(e) => setEntradaForm({ ...entradaForm, proveedorId: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" required><option value="">Seleccionar proveedor...</option>{proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} · NIT: {p.nit || 'Sin NIT'}</option>)}</select></div>`;

const newSelect = `<div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Proveedor <span className="text-xs font-normal text-gray-500">(Opcional)</span>
                      </label>
                      <select
                        value={entradaForm.proveedorId}
                        onChange={(e) => setEntradaForm({ ...entradaForm, proveedorId: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        <option value="">Sin proveedor / No especificado</option>
                        {proveedores.filter((p) => p.activo).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} · NIT: {p.nit || 'Sin NIT'}
                          </option>
                        ))}
                      </select>
                    </div>`;

if (content.includes(oldSelect)) {
  content = content.replace(oldSelect, newSelect);
  console.log('Updated select JSX to optional!');
} else {
  console.error('Could not find oldSelect');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Inventarios.jsx updated successfully!');
