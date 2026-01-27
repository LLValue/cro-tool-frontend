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
      "status": "live" | "paused" | "preview",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)",
      "previewHtml": "string (HTML content)",
      "language": "string",
      "tone": "string (optional)",
      "styleComplexity": "simple" | "technical (optional)",
      "styleLength": "short" | "med" | "long (optional)",
      "productSummary": "string (optional, max 5000 characters)",
      "pageIntent": "string (optional, max 5000 characters)",
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
      "requiredDisclaimer": "string (optional, max 5000 characters)",
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
  "status": "paused",
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
  "industry": "string (optional)",
  "elementType": "string (optional)",
  "notes": "string",
  "status": "live" | "paused" | "preview",
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
  "valueProps": ["string"] (optional),
  "typicalObjections": ["string"] (optional),
  "marketLocale": "string (optional)",
  "allowedFacts": ["string"] (optional),
  "mustNotClaim": ["string"] (optional),
  "riskLevel": "Conservative" | "Standard" | "Exploratory (optional)",
  "forbiddenWords": ["string"],
  "mandatoryClaims": ["string"],
  "prohibitedClaims": ["string"] (optional),
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
  "status": "live" | "paused" | "preview (optional)",
  "previewHtml": "string (optional)",
  "language": "string (optional, max 50 characters)",
  "tone": "string (optional, max 5000 characters)",
  "styleComplexity": "simple" | "technical (optional)",
  "styleLength": "short" | "med" | "long (optional)",
  "productSummary": "string (optional, max 5000 characters)",
  "pageIntent": "string (optional, max 5000 characters)",
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
  "requiredDisclaimer": "string (optional, max 5000 characters)",
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
  "status": "live" | "paused" | "preview",
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
  "valueProps": ["string"] (optional),
  "typicalObjections": ["string"] (optional),
  "marketLocale": "string (optional)",
  "allowedFacts": ["string"] (optional),
  "mustNotClaim": ["string"] (optional),
  "riskLevel": "Conservative" | "Standard" | "Exploratory (optional)",
  "forbiddenWords": ["string"],
  "mandatoryClaims": ["string"],
  "prohibitedClaims": ["string"] (optional),
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

**Response 422:**
```json
{
  "message": "Project name cannot be empty"
}
```

**Validaciones:**
- Si se envía `name`, no puede estar vacío
- `language`: máximo 50 caracteres
- Campos de texto largo: máximo 5000 caracteres

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
  "status": "paused",
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
    "generationRules": "string (optional, JSON string)",
    "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
    "deviceScope": "All" | "Mobile" | "Desktop" (optional),
    "status": "Included" | "Excluded" (optional),
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
  "generationRules": "string (optional, JSON string)",
  "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
  "deviceScope": "All" | "Mobile" | "Desktop" (optional),
  "status": "Included" | "Excluded" (optional),
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
  "status": "Included" | "Excluded" (optional),
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
  "generationRules": "string (optional, JSON string)",
  "elementType": "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other" (optional),
  "deviceScope": "All" | "Mobile" | "Desktop" (optional),
  "status": "Included" | "Excluded" (optional),
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
  "status": "Included" | "Excluded" (optional),
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
    "status": "pending" | "approved" | "discarded",
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
    "status": "pending",
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

**Notas:**
- Este endpoint puede tardar hasta 60 segundos en completarse
- El frontend muestra un modal de progreso durante la generación
- Las variantes generadas tienen `status: "pending"` por defecto
- El `source` debe ser `"fallback"` para variantes generadas automáticamente

**Reglas de Negocio:**
- Si `uxScore < 5` O `complianceScore < 5`, el `status` debe ser `"discarded"` automáticamente
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
  "status": "pending" | "approved" | "discarded" (optional)
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
  "status": "pending" | "approved" | "discarded",
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
  "status": "approved",
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
- Cambia el `status` a `"approved"`

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
    "name": "string (optional, max 500 characters)",
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
      "name": "string (required, max 500 characters)",
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
  "message": "Goal name is required" | "Goal value is required" | "Only one primary goal is allowed" | "Event name must be 50 characters or less"
}
```

**Validaciones:**
- `name`: Requerido para todos los goals, máximo 500 caracteres
- `value`: Requerido para todos los goals
- Si `type === "dataLayerEvent"`, el `value` debe tener máximo 50 caracteres
- Debe haber exactamente un goal con `isPrimary: true`

**Reglas de Negocio:**
- Reemplaza todos los goals existentes del proyecto
- El backend debe generar los `id` y `createdAt` para cada goal
- Solo puede haber un goal con `isPrimary: true`

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

**Nota:** Debe incluir métricas de variantes con `status: "approved"` o `status: "discarded"` para mostrar métricas históricas

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
- Solo simular para variantes con `status: "approved"` o `status: "discarded"` (para mostrar métricas históricas)
- `conversionRate = conversions / users` (si users > 0, sino 0)
- `confidence` debe estar entre 0 y 99

---

## 7. Proxy

### 7.1 Fetch URL

**Endpoint:** `GET /api/proxy/fetch`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `url`: string (required, valid URL)

**Response 200:**
```
Content-Type: text/html

(HTML content as plain text)
```

**Response 400:**
```json
{
  "message": "URL parameter is required"
}
```

---

### 7.2 Preview con Variantes

**Endpoint:** `GET /api/proxy/preview/:projectId`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `variantIds`: string (optional, comma-separated list of variant IDs)

**Response 200:**
```json
{
  "html": "string (HTML content)"
}
```

O alternativamente:

```
Content-Type: text/html

(HTML content as plain text)
```

**Response 404:**
```json
{
  "message": "Project not found"
}
```

---

## 8. Tipos de Datos

### Enums

```typescript
type ProjectStatus = "live" | "paused" | "preview";
type PointStatus = "Included" | "Excluded";
type VariantStatus = "pending" | "approved" | "discarded";
type VariantSource = "fallback" | "manual";
type GoalType = "clickSelector" | "urlReached" | "dataLayerEvent";
type ElementType = "Title" | "CTA" | "Subheadline" | "Microcopy" | "Other";
type DeviceScope = "All" | "Mobile" | "Desktop";
type FunnelStage = "discovery" | "consideration" | "conversion";
type RiskLevel = "Conservative" | "Standard" | "Exploratory";
type StyleComplexity = "simple" | "technical";
type StyleLength = "short" | "med" | "long";
```

### Formatos

- **IDs**: Strings alfanuméricos únicos
- **Fechas**: ISO 8601 format (ej: `"2024-01-12T10:30:00.000Z"`)
- **URLs**: URLs válidas (ej: `"https://example.com/page"`)
- **CSS Selectors**: Selectores CSS válidos (ej: `".cta-button"`, `"#hero-title"`)
- **HTML**: Strings con contenido HTML válido
- **JSON Strings**: Para campos como `generationRules`, debe ser un string JSON válido

### Límites de Caracteres

- `language`: máximo 50 caracteres
- `goal.name`: máximo 500 caracteres
- `goal.value` (cuando `type === "dataLayerEvent"`): máximo 50 caracteres
- Campos de texto largo (productSummary, pageIntent, tone, etc.): máximo 5000 caracteres

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

8. **Generación de Variantes**: 
   - El endpoint puede tardar hasta 60 segundos
   - El frontend muestra un modal de progreso durante la generación
   - Las variantes generadas tienen `status: "pending"` por defecto
   - Si los scores son bajos (< 5), el status se cambia automáticamente a `"discarded"`

9. **Goals**: 
   - Solo puede haber un goal con `isPrimary: true`
   - El campo `name` es requerido y tiene un máximo de 500 caracteres
   - Para goals de tipo `dataLayerEvent`, el `value` tiene un máximo de 50 caracteres

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
  "objective": "Increase click-through rate",
  "elementType": "Title",
  "deviceScope": "All"
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

**Nota:** Este endpoint puede tardar hasta 60 segundos. El frontend muestra un modal de progreso.

**5. Establecer Goals:**
```bash
PUT /api/projects/{projectId}/goals
Authorization: Bearer <token>
{
  "goals": [
    {
      "name": "Primary URL Goal",
      "type": "urlReached",
      "isPrimary": true,
      "value": "https://example.com/thank-you"
    },
    {
      "name": "Secondary CTA Click",
      "type": "clickSelector",
      "isPrimary": false,
      "value": ".cta-button"
    }
  ]
}
```

**6. Obtener Reporte:**
```bash
GET /api/projects/{projectId}/reporting
Authorization: Bearer <token>
```

---

**Versión del Documento:** 2.0  
**Última Actualización:** 2024-12-19
