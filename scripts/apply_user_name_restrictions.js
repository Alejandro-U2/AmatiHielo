import fs from 'fs';

const filePath = 'src/components/modules/GestionUsuarios.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. handleOpenModal: limpiar fieldErrors
if (!content.includes('setFieldErrors({})')) {
  content = content.replace(
    'setModalError(\'\')\r\n\r\n    if ((type === \'edit\'',
    'setModalError(\'\')\r\n    setFieldErrors({})\r\n\r\n    if ((type === \'edit\''
  ).replace(
    'setModalError(\'\')\n\n    if ((type === \'edit\'',
    'setModalError(\'\')\n    setFieldErrors({})\n\n    if ((type === \'edit\''
  );
}

// 2. handleFormField: restringir números y limpiar error del campo
const oldHandleFormField = `  const handleFormField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))`;

const newHandleFormField = `  const handleFormField = (field, value) => {
    let cleanVal = value
    // Restricción: nombres y apellidos no permiten números
    if (['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'].includes(field)) {
      cleanVal = value.replace(/[0-9]/g, '')
    }

    setFormData((prev) => ({
      ...prev,
      [field]: cleanVal,
    }))

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }`;

// Normalize line endings for replacement
content = content.split('\r\n').join('\n');
if (content.includes(oldHandleFormField)) {
  content = content.replace(oldHandleFormField, newHandleFormField);
  console.log('Replaced handleFormField successfully!');
} else {
  console.error('Could not find oldHandleFormField');
}

// 3. handleSubmitUser: validación explícita de números
const oldSubmitPrimerNombre = `    if (!formData.primerNombre.trim()) {
      errors.primerNombre = 'El primer nombre es obligatorio.'
    } else if (!NAME_REGEX.test(formData.primerNombre.trim())) {
      errors.primerNombre = 'Solo se permiten letras, espacios y acentos.'
    }

    if (formData.segundoNombre.trim() && !NAME_REGEX.test(formData.segundoNombre.trim())) {
      errors.segundoNombre = 'Solo se permiten letras, espacios y acentos.'
    }

    // Primer apellido y segundo apellido
    if (!formData.primerApellido.trim()) {
      errors.primerApellido = 'El primer apellido es obligatorio.'
    } else if (!NAME_REGEX.test(formData.primerApellido.trim())) {
      errors.primerApellido = 'Solo se permiten letras, espacios y acentos.'
    }

    if (formData.segundoApellido.trim() && !NAME_REGEX.test(formData.segundoApellido.trim())) {
      errors.segundoApellido = 'Solo se permiten letras, espacios y acentos.'
    }`;

const newSubmitPrimerNombre = `    if (!formData.primerNombre.trim()) {
      errors.primerNombre = 'El primer nombre es obligatorio.'
    } else if (/\\d/.test(formData.primerNombre)) {
      errors.primerNombre = 'No se permiten números en el nombre.'
    } else if (!NAME_REGEX.test(formData.primerNombre.trim())) {
      errors.primerNombre = 'Solo se permiten letras, espacios y acentos.'
    }

    if (formData.segundoNombre.trim()) {
      if (/\\d/.test(formData.segundoNombre)) {
        errors.segundoNombre = 'No se permiten números en el nombre.'
      } else if (!NAME_REGEX.test(formData.segundoNombre.trim())) {
        errors.segundoNombre = 'Solo se permiten letras, espacios y acentos.'
      }
    }

    // Primer apellido y segundo apellido
    if (!formData.primerApellido.trim()) {
      errors.primerApellido = 'El primer apellido es obligatorio.'
    } else if (/\\d/.test(formData.primerApellido)) {
      errors.primerApellido = 'No se permiten números en el apellido.'
    } else if (!NAME_REGEX.test(formData.primerApellido.trim())) {
      errors.primerApellido = 'Solo se permiten letras, espacios y acentos.'
    }

    if (formData.segundoApellido.trim()) {
      if (/\\d/.test(formData.segundoApellido)) {
        errors.segundoApellido = 'No se permiten números en el apellido.'
      } else if (!NAME_REGEX.test(formData.segundoApellido.trim())) {
        errors.segundoApellido = 'Solo se permiten letras, espacios y acentos.'
      }
    }`;

if (content.includes(oldSubmitPrimerNombre)) {
  content = content.replace(oldSubmitPrimerNombre, newSubmitPrimerNombre);
  console.log('Replaced handleSubmitUser validations successfully!');
} else {
  console.error('Could not find oldSubmitPrimerNombre');
}

// 4. Bloqueo en el input onKeyDown y onChange
const oldInputRender = `                          <input
                            type="text"
                            value={formData[field.key]}
                            onChange={(e) => handleFormField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={modalType === 'view'}
                            aria-invalid={Boolean(fieldErrors[field.key])}
                            className={getInputClass(field.key)}
                          />`;

const newInputRender = `                          <input
                            type="text"
                            value={formData[field.key]}
                            onKeyDown={(e) => {
                              // Bloquear números al presionar teclas (0-9 teclado normal o numpad)
                              if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && /[0-9]/.test(e.key)) {
                                e.preventDefault()
                              }
                            }}
                            onChange={(e) => {
                              // Sanitizar en caso de pegar texto con números
                              const sanitized = e.target.value.replace(/[0-9]/g, '')
                              handleFormField(field.key, sanitized)
                            }}
                            placeholder={field.placeholder}
                            disabled={modalType === 'view'}
                            aria-invalid={Boolean(fieldErrors[field.key])}
                            className={getInputClass(field.key)}
                          />`;

if (content.includes(oldInputRender)) {
  content = content.replace(oldInputRender, newInputRender);
  console.log('Replaced input render successfully!');
} else {
  console.error('Could not find oldInputRender');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('GestionUsuarios.jsx updated successfully!');
