# API Contracts - CRO Tool Backend

Este documento describe los contratos de API entre el frontend y el backend. Todos los endpoints deben seguir estas especificaciones.

**Base URL:** `/api`

**Autenticación:** Bearer Token (enviado en header `Authorization: Bearer <token>`)

**Formato de Respuesta:** JSON

**Códigos de Estado HTTP:**
- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Solicitud inválida
- `401 Unauthorized` - No autenticado
- `404 Not Found` - Recurso no encontrado
- `422 Unprocessable Entity` - Error de validación
- `500 Internal Server Error` - Error del servidor

---

## 1. Autenticación

### 1.1 Login

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "string (required, valid email format)",
  "password": "string (required, min 1 character)"
}
```

**Response 200:**
```json
{
  "token": "string (JWT token)",
  "user": {
    "id": "string",
    "email": "string",
    "name": "string"
  }
}
```

**Response 422:**
```json
{
  "message": "Email and password are required"
}
```

**Ejemplo:**
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

---

### 1.2 Obtener Usuario Actual

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": "string",
  "email": "string",
  "name": "string"
}
```

**Response 401:**
```json
{
  "message": "Authentication required"
}
```

---

## 2. Proyectos

### 2.1 Listar Proyectos

**Endpoint:** `GET /api/projects`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "projects": [
    {
      "id": "string",
      "name": "string",
      "pageUrl": "string",
      "industry": "string (optional)",
      "elementType": "string (optional)",
      "notes": "string",
      "status": "draft" | "active" | "archived",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)",
      "previewHtml": "string (HTML content)",
      "language": "string",
      "tone": "string (optional)",
      "styleComplexity": "simple" | "technical (optional)",
      "styleLength": "short" | "med" | "long (optional)",
      "productSummary": "string (optional, max 200 characters)",
      "pageIntent": "string (optional, max 200 characters)",
      "funnelStage": "discovery" | "consideration" | "conversion (optional)",
      "valueProps": ["string"] (optional),
      "typicalObjections": ["string"] (optional),
      "marketLocale": "string (optional)",
      "allowedFacts": ["string"] (optional),
      "mustNotClaim": ["string"] (optional),
      "riskLevel": "Conservative" | "Standard" | "Exploratory (optional)",
      "forbiddenWords": ["string"],
      "mandatoryClaims": ["string"],
      "prohibitedClaims": ["string"] (optional),
      "requiredDisclaimer": "string (optional, max 200 characters)",
      "toneAllowed": ["string"],
      "toneDisallowed": ["string"],
      "pageContext": "string (legacy field)",
      "croGuidelines": "string (legacy field)",
      "brandGuardrails": "string (legacy field)"
    }
  ],
  "total": "number"
}
```

---

### 2.2 Crear Proyecto

**Endpoint:** `POST /api/projects`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (required, min 1 character)",
  "pageUrl": "string (required, valid URL format)",
  "notes": "string (optional)"
}
```

**Response 201:**
```json
{
  "id": "string",
  "name": "string",
  "pageUrl": "string",
  "industry": "string (optional)",
  "elementType": "string (optional)",
  "notes": "string",
  "status": "draft",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "previewHtml": "string",
  "language": "en",
  "tone": "professional (optional)",
  "styleComplexity": "simple (optional)",
  "styleLength": "short (optional)",
  "productSummary": "string (optional)",
  "pageIntent": "string (optional)",
  "funnelStage": "discovery (optional)",
  "valueProps": [] (optional),
  "typicalObjections": [] (optional),
  "marketLocale": "string (optional)",
  "allowedFacts": [] (optional),
  "mustNotClaim": [] (optional),
  "riskLevel": "Conservative (optional)",
  "forbiddenWords": [],
  "mandatoryClaims": [],
  "prohibitedClaims": [] (optional),
  "requiredDisclaimer": "string (optional)",
  "toneAllowed": [],
  "toneDisallowed": [],
  "pageContext": "string (legacy field)",
  "croGuidelines": "string (legacy field)",
  "brandGuardrails": "string (legacy field)"
}
```

**Response 422:**
```json
{
  "message": "Project name is required" | "Page URL is required"
}
```

**Validaciones:**
- `name`: Requerido, no puede estar vacío
- `pageUrl`: Requerido, debe ser una URL válida

---

### 2.3 Obtener Proyecto

**Endpoint:** `GET /api/projects/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "id": "string",
  "name": "string",
  "pageUrl": "string",
  "notes": "string",
  "status": "draft" | "active" | "archived",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "previewHtml": "string",
  "language": "string",
  "pageContext": "string",
  "croGuidelines": "string",
  "brandGuardrails": "string",
  "forbiddenWords": ["string"],
  "mandatoryClaims": ["string"],
  "toneAllowed": ["string"],
  "toneDisallowed": ["string"]
}
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

---

### 2.4 Actualizar Proyecto

**Endpoint:** `PATCH /api/projects/:id`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "pageUrl": "string (optional)",
  "industry": "string (optional)",
  "elementType": "string (optional)",
  "notes": "string (optional)",
  "status": "draft" | "active" | "archived" (optional),
  "previewHtml": "string (optional)",
  "language": "string (optional)",
  "tone": "string (optional)",
  "styleComplexity": "simple" | "technical (optional)",
  "styleLength": "short" | "med" | "long (optional)",
  "productSummary": "string (optional, max 200 characters)",
  "pageIntent": "string (optional, max 200 characters)",
  "funnelStage": "discovery" | "consideration" | "conversion (optional)",
  "valueProps": ["string"] (optional),
  "typicalObjections": ["string"] (optional),
  "marketLocale": "string (optional)",
  "allowedFacts": ["string"] (optional),
  "mustNotClaim": ["string"] (optional),
  "riskLevel": "Conservative" | "Standard" | "Exploratory (optional)",
  "forbiddenWords": ["string"] (optional),
  "mandatoryClaims": ["string"] (optional),
  "prohibitedClaims": ["string"] (optional),
  "requiredDisclaimer": "string (optional, max 200 characters)",
  "toneAllowed": ["string"] (optional),
  "toneDisallowed": ["string"] (optional),
  "pageContext": "string (optional, legacy field)",
  "croGuidelines": "string (optional, legacy field)",
  "brandGuardrails": "string (optional, legacy field)"
}
```

**Response 200:**
```json
{
  "id": "string",
  "name": "string",
  "pageUrl": "string",
  "notes": "string",
  "status": "draft" | "active" | "archived",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "previewHtml": "string",
  "language": "string",
  "pageContext": "string",
  "croGuidelines": "string",
  "brandGuardrails": "string",
  "forbiddenWords": ["string"],
  "mandatoryClaims": ["string"],
  "toneAllowed": ["string"],
  "toneDisallowed": ["string"]
}
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

**Response 422:**
```json
{
  "message": "Project name cannot be empty"
}
```

**Validaciones:**
- Si se envía `name`, no puede estar vacío

---

### 2.5 Eliminar Proyecto

**Endpoint:** `DELETE /api/projects/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```
(Empty body)
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

**Nota:** Debe eliminar en cascada todos los puntos, variantes y goals asociados.

---

### 2.6 Duplicar Proyecto

**Endpoint:** `POST /api/projects/:id/duplicate`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{}
```

**Response 201:**
```json
{
  "id": "string (nuevo ID)",
  "name": "string (nombre original + ' (Copy)')",
  "pageUrl": "string",
  "industry": "string (optional)",
  "elementType": "string (optional)",
  "notes": "string",
  "status": "draft",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "previewHtml": "string",
  "language": "string",
  "tone": "string (optional)",
  "styleComplexity": "simple" | "technical (optional)",
  "styleLength": "short" | "med" | "long (optional)",
  "productSummary": "string (optional)",
  "pageIntent": "string (optional)",
  "funnelStage": "discovery" | "consideration" | "conversion (optional)",
  "valueProps": [] (optional),
  "typicalObjections": [] (optional),
  "marketLocale": "string (optional)",
  "allowedFacts": [] (optional),
  "mustNotClaim": [] (optional),
  "riskLevel": "Conservative" | "Standard" | "Exploratory (optional)",
  "forbiddenWords": ["string"],
  "mandatoryClaims": ["string"],
  "prohibitedClaims": [] (optional),
  "requiredDisclaimer": "string (optional)",
  "toneAllowed": ["string"],
  "toneDisallowed": ["string"],
  "pageContext": "string (legacy field)",
  "croGuidelines": "string (legacy field)",
  "brandGuardrails": "string (legacy field)"
}
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

---

### 2.7 Cargar Preview de Página

**Endpoint:** `GET /api/projects/:id/preview`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "previewHtml": "string (HTML content)"
}
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

---

## 3. Puntos de Optimización

### 3.1 Listar Puntos

**Endpoint:** `GET /api/projects/:projectId/points`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "string",
    "projectId": "string",
    "name": "string",
    "selector": "string (CSS selector)",
    "text": "string",
    "objective": "string",
    "context": "string (optional)",
    "generationRules": "string (optional)",
    "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
    "deviceScope": "All" | "Mobile" | "Desktop" (optional),
    "status": "Active" | "Paused" (optional),
    "minChars": "number (optional)",
    "maxChars": "number (optional)",
    "maxWords": "number (optional)",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

---

### 3.2 Crear Punto

**Endpoint:** `POST /api/projects/:projectId/points`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (required, min 1 character)",
  "selector": "string (optional, CSS selector)",
  "text": "string (optional)",
  "objective": "string (optional)",
  "context": "string (optional)",
  "generationRules": "string (optional)",
  "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
  "deviceScope": "All" | "Mobile" | "Desktop" (optional),
  "status": "Active" | "Paused" (optional),
  "minChars": "number (optional, min 0)",
  "maxChars": "number (optional, min 0)",
  "maxWords": "number (optional, min 0)"
}
```

**Response 201:**
```json
{
  "id": "string",
  "projectId": "string",
  "name": "string",
  "selector": "string",
  "text": "string",
  "objective": "string",
  "context": "string (optional)",
  "generationRules": "string (optional)",
  "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
  "deviceScope": "All" | "Mobile" | "Desktop" (optional),
  "status": "Active" | "Paused" (optional),
  "minChars": "number (optional)",
  "maxChars": "number (optional)",
  "maxWords": "number (optional)",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

**Response 422:**
```json
{
  "message": "Point name is required"
}
```

**Validaciones:**
- `name`: Requerido, no puede estar vacío

---

### 3.3 Actualizar Punto

**Endpoint:** `PATCH /api/projects/:projectId/points/:pointId`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string (optional)",
  "selector": "string (optional)",
  "text": "string (optional)",
  "objective": "string (optional)",
  "context": "string (optional)",
  "generationRules": "string (optional)",
  "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
  "deviceScope": "All" | "Mobile" | "Desktop" (optional),
  "status": "Active" | "Paused" (optional),
  "minChars": "number (optional, min 0)",
  "maxChars": "number (optional, min 0)",
  "maxWords": "number (optional, min 0)"
}
```

**Response 200:**
```json
{
  "id": "string",
  "projectId": "string",
  "name": "string",
  "selector": "string",
  "text": "string",
  "objective": "string",
  "context": "string (optional)",
  "generationRules": "string (optional)",
  "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
  "deviceScope": "All" | "Mobile" | "Desktop" (optional),
  "status": "Active" | "Paused" (optional),
  "minChars": "number (optional)",
  "maxChars": "number (optional)",
  "maxWords": "number (optional)",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)"
}
```

**Response 404:**
```json
{
  "message": "Point not found"
}
```

**Response 422:**
```json
{
  "message": "Point name cannot be empty"
}
```

**Validaciones:**
- Si se envía `name`, no puede estar vacío
- El `pointId` debe pertenecer al `projectId` especificado

---

### 3.4 Eliminar Punto

**Endpoint:** `DELETE /api/projects/:projectId/points/:pointId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```
(Empty body)
```

**Response 404:**
```json
{
  "message": "Point not found"
}
```

**Nota:** Debe eliminar en cascada todas las variantes asociadas al punto.

---

## 4. Variantes

### 4.1 Listar Variantes

**Endpoint:** `GET /api/projects/:projectId/points/:pointId/variants`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "string",
    "projectId": "string",
    "optimizationPointId": "string",
    "text": "string",
    "uxScore": "number (0-10)",
    "uxRationale": "string",
    "complianceScore": "number (0-10)",
    "complianceRationale": "string",
    "status": "active" | "discarded",
    "createdAt": "string (ISO 8601)",
    "source": "fallback" | "manual"
  }
]
```

**Response 404:**
```json
{
  "message": "Point not found"
}
```

---

### 4.2 Generar Variantes

**Endpoint:** `POST /api/projects/:projectId/points/:pointId/variants/generate`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "count": "number (optional, default: 10, min: 1, max: 50)"
}
```

**Response 201:**
```json
[
  {
    "id": "string",
    "projectId": "string",
    "optimizationPointId": "string",
    "text": "string",
    "uxScore": "number (0-10)",
    "uxRationale": "string",
    "complianceScore": "number (0-10)",
    "complianceRationale": "string",
    "status": "active" | "discarded",
    "createdAt": "string (ISO 8601)",
    "source": "fallback"
  }
]
```

**Response 404:**
```json
{
  "message": "Point not found"
}
```

**Reglas de Negocio:**
- Si `uxScore < 5` O `complianceScore < 5`, el `status` debe ser `"discarded"`
- El `source` debe ser `"fallback"`
- Los scores deben ser determinísticos basados en un seed (para reproducibilidad)

---

### 4.3 Actualizar Variante

**Endpoint:** `PATCH /api/projects/:projectId/variants/:variantId`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "string (optional)",
  "uxScore": "number (optional, 0-10)",
  "uxRationale": "string (optional)",
  "complianceScore": "number (optional, 0-10)",
  "complianceRationale": "string (optional)",
  "status": "active" | "discarded" (optional)
}
```

**Response 200:**
```json
{
  "id": "string",
  "projectId": "string",
  "optimizationPointId": "string",
  "text": "string",
  "uxScore": "number (0-10)",
  "uxRationale": "string",
  "complianceScore": "number (0-10)",
  "complianceRationale": "string",
  "status": "active" | "discarded",
  "createdAt": "string (ISO 8601)",
  "source": "fallback" | "manual"
}
```

**Response 404:**
```json
{
  "message": "Variant not found"
}
```

**Reglas de Negocio:**
- Si después de actualizar `uxScore < 5` O `complianceScore < 5`, el `status` debe cambiar automáticamente a `"discarded"`

---

### 4.4 Aprobar Variante

**Endpoint:** `POST /api/projects/:projectId/variants/:variantId/approve`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{}
```

**Response 200:**
```json
{
  "id": "string",
  "projectId": "string",
  "optimizationPointId": "string",
  "text": "string",
  "uxScore": "number (0-10)",
  "uxRationale": "string",
  "complianceScore": "number (0-10)",
  "complianceRationale": "string",
  "status": "active",
  "createdAt": "string (ISO 8601)",
  "source": "fallback" | "manual"
}
```

**Response 404:**
```json
{
  "message": "Variant not found"
}
```

**Reglas de Negocio:**
- Cambia el `status` a `"active"`

---

### 4.5 Descartar Variante

**Endpoint:** `POST /api/projects/:projectId/variants/:variantId/discard`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{}
```

**Response 200:**
```json
{
  "id": "string",
  "projectId": "string",
  "optimizationPointId": "string",
  "text": "string",
  "uxScore": "number (0-10)",
  "uxRationale": "string",
  "complianceScore": "number (0-10)",
  "complianceRationale": "string",
  "status": "discarded",
  "createdAt": "string (ISO 8601)",
  "source": "fallback" | "manual"
}
```

**Response 404:**
```json
{
  "message": "Variant not found"
}
```

**Reglas de Negocio:**
- Cambia el `status` a `"discarded"`

---

### 4.6 Eliminar Variante

**Endpoint:** `DELETE /api/projects/:projectId/variants/:variantId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```
(Empty body)
```

**Response 404:**
```json
{
  "message": "Variant not found"
}
```

---

## 5. Goals (Objetivos)

### 5.1 Obtener Goals

**Endpoint:** `GET /api/projects/:projectId/goals`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
[
  {
    "id": "string",
    "projectId": "string",
    "name": "string",
    "type": "clickSelector" | "urlReached" | "dataLayerEvent",
    "isPrimary": "boolean",
    "value": "string",
    "createdAt": "string (ISO 8601)"
  }
]
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

---

### 5.2 Establecer Goals

**Endpoint:** `PUT /api/projects/:projectId/goals`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "goals": [
    {
      "name": "string (optional)",
      "type": "clickSelector" | "urlReached" | "dataLayerEvent",
      "isPrimary": "boolean",
      "value": "string (required)"
    }
  ]
}
```

**Response 200:**
```json
[
  {
    "id": "string",
    "projectId": "string",
    "name": "string",
    "type": "clickSelector" | "urlReached" | "dataLayerEvent",
    "isPrimary": "boolean",
    "value": "string",
    "createdAt": "string (ISO 8601)"
  }
]
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

**Response 422:**
```json
{
  "message": "Goal name is required" | "Goal value is required" | "Event name must be 50 characters or less"
}
```

**Validaciones:**
- `name`: Requerido para todos los goals
- `value`: Requerido para todos los goals
- Si `type === "dataLayerEvent"`, el `value` debe tener máximo 50 caracteres
- Debe haber exactamente un goal con `isPrimary: true`

**Reglas de Negocio:**
- Reemplaza todos los goals existentes del proyecto
- El backend debe generar los `id` y `createdAt` para cada goal

---

## 6. Reporting (Reportes)

### 6.1 Obtener Reporte

**Endpoint:** `GET /api/projects/:projectId/reporting`

**Headers:**
```
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "metrics": [
    {
      "variantId": "string",
      "pointId": "string",
      "goalType": "clickSelector" | "urlReached" | "dataLayerEvent",
      "users": "number",
      "conversions": "number",
      "conversionRate": "number (0-1)",
      "confidence": "number (0-99)"
    }
  ],
  "lastUpdated": "string (ISO 8601)"
}
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

**Nota:** Debe incluir métricas de variantes con `status: "active"` o `status: "discarded"` para mostrar métricas históricas

---

### 6.2 Iniciar Simulación

**Endpoint:** `POST /api/projects/:projectId/reporting/simulate`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "durationMs": "number (optional, default: 6000, min: 1000, max: 60000)",
  "intervalMs": "number (optional, default: 200, min: 50, max: 5000)"
}
```

**Response 200:**
```json
{
  "metrics": [
    {
      "variantId": "string",
      "pointId": "string",
      "goalType": "clickSelector" | "urlReached" | "dataLayerEvent",
      "users": "number",
      "conversions": "number",
      "conversionRate": "number (0-1)",
      "confidence": "number (0-99)"
    }
  ],
  "lastUpdated": "string (ISO 8601)"
}
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

**Reglas de Negocio:**
- La simulación debe ser determinística (usar seed basado en projectId)
- Los valores deben actualizarse progresivamente durante `durationMs`
- Solo simular para variantes con `status: "active"` o `status: "discarded"` (para mostrar métricas históricas)
- `conversionRate = conversions / users` (si users > 0, sino 0)
- `confidence` debe estar entre 0 y 99

---

## 7. Tipos de Datos

### Enums

```typescript
type ProjectStatus = "draft" | "active" | "archived";
type VariantStatus = "active" | "discarded";
type VariantSource = "fallback" | "manual";
type GoalType = "clickSelector" | "urlReached" | "dataLayerEvent";
```

### Formatos

- **IDs**: Strings alfanuméricos únicos
- **Fechas**: ISO 8601 format (ej: `"2024-01-12T10:30:00.000Z"`)
- **URLs**: URLs válidas (ej: `"https://example.com/page"`)
- **CSS Selectors**: Selectores CSS válidos (ej: `".cta-button"`, `"#hero-title"`)
- **HTML**: Strings con contenido HTML válido

---

## 9. Manejo de Errores

Todos los errores deben seguir este formato:

```json
{
  "message": "string (descripción del error)"
}
```

### Códigos de Estado Comunes

- **400 Bad Request**: Solicitud mal formada
- **401 Unauthorized**: Token inválido o expirado
- **404 Not Found**: Recurso no encontrado
- **422 Unprocessable Entity**: Error de validación
- **500 Internal Server Error**: Error del servidor

### Ejemplos de Respuestas de Error

**401 Unauthorized:**
```json
{
  "message": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "message": "Project not found"
}
```

**422 Validation Error:**
```json
{
  "message": "Project name is required"
}
```

---

## 10. Paginación (Futuro)

Para endpoints que puedan retornar muchos resultados, se puede implementar paginación:

**Query Parameters:**
- `page`: número de página (default: 1)
- `limit`: items por página (default: 20, max: 100)

**Response con Paginación:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 10. Notas de Implementación

1. **Autenticación**: Todos los endpoints (excepto `/auth/login`) requieren el header `Authorization: Bearer <token>`

2. **Cascadas**: 
   - Eliminar proyecto → elimina puntos, variantes y goals
   - Eliminar punto → elimina variantes asociadas

3. **Validaciones**: El backend debe validar todos los campos requeridos y formatos antes de procesar

4. **Timestamps**: `createdAt` y `updatedAt` deben actualizarse automáticamente por el backend

5. **IDs**: El backend debe generar IDs únicos para todos los recursos creados

6. **Determinismo**: Las simulaciones y generación de variantes deben ser reproducibles usando seeds

7. **CORS**: El backend debe permitir requests desde el origen del frontend

---

## 11. Ejemplos Completos

### Flujo Completo: Crear Proyecto y Generar Variantes

**1. Login:**
```bash
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**2. Crear Proyecto:**
```bash
POST /api/projects
Authorization: Bearer <token>
{
  "name": "Landing Page Test",
  "pageUrl": "https://pack.stage.es",
  "notes": "Test project"
}
```

**3. Crear Punto de Optimización:**
```bash
POST /api/projects/{projectId}/points
Authorization: Bearer <token>
{
  "name": "Hero Title",
  "selector": ".hero-title",
  "objective": "Increase click-through rate"
}
```

**4. Generar Variantes:**
```bash
POST /api/projects/{projectId}/points/{pointId}/variants/generate
Authorization: Bearer <token>
{
  "count": 10
}
```

**5. Obtener Reporte:**
```bash
GET /api/projects/{projectId}/reporting
Authorization: Bearer <token>
```

---

**Versión del Documento:** 1.0  
**Última Actualización:** 2024-01-12

