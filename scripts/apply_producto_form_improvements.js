import fs from 'fs';

const filePath = 'src/components/modules/Inventarios.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize CRLF to LF for reliable replacements
content = content.split('\r\n').join('\n');

// 1. Add limitDigits helper right above handleProductoFormChange
const limitDigitsHelper = `const limitDigits = (value, maxIntegerDigits = 6, maxDecimalDigits = 2) => {
  if (value === '' || value === null || value === undefined) return ''
  const str = String(value)
  const clean = str.replace(/[^0-9.]/g, '')
  const parts = clean.split('.')
  const integerPart = parts[0].slice(0, maxIntegerDigits)
  if (parts.length > 1) {
    const decimalPart = parts.slice(1).join('').slice(0, maxDecimalDigits)
    return \`\${integerPart}.\${decimalPart}\`
  }
  return integerPart
}

`;

const oldHandleChange = `  const handleProductoFormChange = (field, value) => {
    const updated = { ...productoForm, [field]: value }

    if (field === 'nombre') {
      updated.nombre = capitalizeWords(sanitizeSoloLetras(value))
    }

    if (field === 'cantidadCompra' || field === 'precioPaquete') {
      updated.precioCompra = String(calcularCostoUnitario(updated) || '')
    }
    
    // Auto-generar código cuando cambia la categoría
    if (field === 'categoria' && value) {
      const prefix = categoriasInventario.find((categoria) => categoria.nombre === value)?.codigo || 'GEN'
      updated.codigo = generarCodigoLibre(value, prefix)
    }

    setProductoForm(updated)
  }`;

const newHandleChange = `  const handleProductoFormChange = (field, value) => {
    const updated = { ...productoForm, [field]: value }

    if (field === 'nombre') {
      // Permitir letras, números, espacios y caracteres comunes en nombres de insumos/productos
      let clean = value.replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü\\s\\.\\-\\/\(\)\#\\,]/g, '')
      if (clean.startsWith(' ')) {
        clean = clean.trimStart()
      }
      updated.nombre = clean.slice(0, 100)
    }

    if (field === 'cantidadCompra') {
      updated.cantidadCompra = limitDigits(value, 6, 2)
    }

    if (field === 'precioPaquete') {
      updated.precioPaquete = limitDigits(value, 6, 2)
    }

    if (field === 'minimo') {
      updated.minimo = limitDigits(value, 6, 2)
    }

    if (field === 'cantidadCompra' || field === 'precioPaquete') {
      updated.precioCompra = String(calcularCostoUnitario(updated) || '')
    }
    
    // Auto-generar código cuando cambia la categoría
    if (field === 'categoria' && value) {
      const prefix = categoriasInventario.find((categoria) => categoria.nombre === value)?.codigo || 'GEN'
      updated.codigo = generarCodigoLibre(value, prefix)
    }

    setProductoForm(updated)
  }`;

if (content.includes(oldHandleChange)) {
  content = content.replace(oldHandleChange, limitDigitsHelper + newHandleChange);
  console.log('Updated handleProductoFormChange and added limitDigits!');
} else {
  console.error('Could not find oldHandleChange');
}

// 2. Update payload in handleSubmitProducto
const oldPayloadNombre = `nombre: capitalizeWords(sanitizeSoloLetras(productoForm.nombre)),`;
const newPayloadNombre = `nombre: productoForm.nombre.trim().replace(/\\s+/g, ' '),`;

if (content.includes(oldPayloadNombre)) {
  content = content.replace(oldPayloadNombre, newPayloadNombre);
  console.log('Updated payload nombre in handleSubmitProducto!');
} else {
  console.error('Could not find oldPayloadNombre');
}

// 3. Update modal inputs: nombre, minimo, cantidadCompra, precioPaquete
const oldInputsBlock = `                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Producto</label>
                    <input
                      type="text"
                      value={productoForm.nombre}
                      onChange={(e) => handleProductoFormChange('nombre', e.target.value)}
                      readOnly={modalType === 'view'}
                      placeholder="Bolsa Hielo Cubo 5lb"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productoForm.minimo}
                      onChange={(e) => handleProductoFormChange('minimo', e.target.value)}
                      readOnly={modalType === 'view'}
                      placeholder="0"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      min="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">Opcional. Si lo dejas vacío se guardará en 0.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad por paquete</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productoForm.cantidadCompra}
                        onChange={(e) => handleProductoFormChange('cantidadCompra', e.target.value)}
                        readOnly={modalType === 'view'}
                        placeholder="50"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">Ejemplo: 50 vasos por paquete.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Precio por paquete (Q)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productoForm.precioPaquete}
                        onChange={(e) => handleProductoFormChange('precioPaquete', e.target.value)}
                        readOnly={modalType === 'view'}
                        placeholder="30.00"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">Ejemplo: Q30.00 por el paquete completo.</p>
                    </div>
                  </div>`;

const newInputsBlock = `                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Producto</label>
                    <input
                      type="text"
                      value={productoForm.nombre}
                      onChange={(e) => handleProductoFormChange('nombre', e.target.value)}
                      readOnly={modalType === 'view'}
                      placeholder="Bolsa Hielo Cubo 5lb"
                      maxLength={100}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Permite letras, números y espacios (ej. Bolsa 5lb, Vaso 8oz).</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Mínimo</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={productoForm.minimo}
                      onChange={(e) => handleProductoFormChange('minimo', e.target.value)}
                      readOnly={modalType === 'view'}
                      placeholder="0"
                      maxLength={9}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <p className="mt-1 text-xs text-gray-500">Opcional. Si lo dejas vacío se guardará en 0 (máx. 6 dígitos).</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad por paquete</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={productoForm.cantidadCompra}
                        onChange={(e) => handleProductoFormChange('cantidadCompra', e.target.value)}
                        readOnly={modalType === 'view'}
                        placeholder="50"
                        maxLength={9}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                      <p className="mt-1 text-xs text-gray-500">Ejemplo: 50 vasos por paquete (máx. 6 dígitos).</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Precio por paquete (Q)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={productoForm.precioPaquete}
                        onChange={(e) => handleProductoFormChange('precioPaquete', e.target.value)}
                        readOnly={modalType === 'view'}
                        placeholder="30.00"
                        maxLength={9}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      />
                      <p className="mt-1 text-xs text-gray-500">Ejemplo: Q30.00 por el paquete completo (máx. 6 dígitos).</p>
                    </div>
                  </div>`;

if (content.includes(oldInputsBlock)) {
  content = content.replace(oldInputsBlock, newInputsBlock);
  console.log('Updated inputs block in JSX!');
} else {
  console.error('Could not find oldInputsBlock');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Inventarios.jsx finished successfully!');
