# API Contracts — Frontend expectations

Base URL: `/api` (sin trailing slash). Path params: `:id`, `:projectId`, `:pointId`, `:variantId`.

---

## Auth

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/auth/login` | `{ email: string, password: string }` | `{ token: string, user: { id, email, name } }` |
| GET | `/auth/me` | — | `{ id: string, email: string, name: string }` |

---

## Projects

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/projects` | — | `{ projects: ProjectDto[], total: number }` |
| POST | `/projects` | `{ name, pageUrl, industry?, notes? }` | `ProjectDto` |
| GET | `/projects/:id` | — | `ProjectDto` |
| PATCH | `/projects/:id` | `{ name?, pageUrl?, industry?, notes?, status?, previewHtml? }` | `ProjectDto` |
| DELETE | `/projects/:id` | — | `void` |
| POST | `/projects/:id/duplicate` | `{}` | `ProjectDto` |
| GET | `/projects/:projectId/preview` | — | `{ previewHtml: string }` |

**ProjectDto:** `id`, `name`, `pageUrl`, `industry?`, `notes`, `status` ('live' \| 'paused' \| 'preview'), `previewHtml`, `createdAt`, `updatedAt` (ISO strings).

---

## Briefing guardrails

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/projects/:projectId/briefing-guardrails` | — | `BriefingGuardrailsDto` |
| POST | `/projects/:projectId/briefing-guardrails` | Ver abajo | `BriefingGuardrailsDto` |
| PATCH | `/projects/:projectId/briefing-guardrails` | Ver abajo | `BriefingGuardrailsDto` |

Create/Update body: `productDescription?`, `targetAudiences?`, `valueProps?`, `topObjections?`, `language?`, `toneAndStyle?`, `pageContextAndGoal?`, `nextAction?`, `funnelStage?` ('discovery' \| 'consideration' \| 'conversion'), `brandGuidelines?`, `allowedFacts?`, `forbiddenWords?`, `sensitiveClaims?` (todos opcionales).

**BriefingGuardrailsDto:** `id`, `projectId`, más los mismos campos anteriores.

---

## Briefing assistant

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/projects/:projectId/briefing-assistant/generate` | `BriefingAssistantGenerateRequest` | `BriefingAssistantGenerateResponse` |
| POST | `/projects/:projectId/briefing-assistant/approve-proof-points` | `{ approved_ids: string[] }` | `{ allowedFacts: string[] }` |

**BriefingAssistantGenerateRequest:**  
`{ sources: { urls: string[] }, target_language: string, fill_sections: { business_context: boolean, journey_context: boolean, guardrails: boolean } }`

**BriefingAssistantGenerateResponse:**  
`run_id`, `summary` (filled_fields, proof_points_found, needs_review_count), `fields` (objeto con claves tipo `business.product_description`, etc., valor: `{ text, source, review_status, confidence, format_issue, evidence[] }`), `proof_points_pool` (array de proof points con id, text, category, confidence, evidence[]), `sources_used` (id, type, label, url?, char_count).

---

## Points (optimization points)

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/projects/:projectId/points` | — | `OptimizationPointDto[]` |
| POST | `/projects/:projectId/points` | `CreatePointRequest` | `OptimizationPointDto` |
| PATCH | `/projects/:projectId/points/:pointId` | `UpdatePointRequest` | `OptimizationPointDto` |
| DELETE | `/projects/:projectId/points/:pointId` | — | `void` |
| POST | `/projects/:projectId/points/:pointId/ai/brief-draft` | `PointBriefDraftRequest` | `PointBriefDraftResponse` |

**CreatePointRequest / UpdatePointRequest:**  
`name`, `selector?`, `text?`, `objective?`, `context?`, `generationRules?`, `elementType?` ('Title' \| 'CTA' \| 'Subheadline' \| 'Microcopy' \| 'Other'), `deviceScope?` ('All' \| 'Mobile' \| 'Desktop'), `status?` ('Included' \| 'Excluded'), `minChars?`, `maxChars?`, `maxWords?`. Update: todos opcionales.

**OptimizationPointDto:** igual + `id`, `projectId`, `createdAt`, `updatedAt` (ISO).

**PointBriefDraftRequest:**  
`mode` ('suggest' \| 'improve'), `targetLanguage`, `point` (pointName, elementType, cssSelector, deviceScope), `currentElementText?`, `existingBrief` (qualitativeObjective, elementContext, goodIdeas, thingsToAvoid, mustIncludeKeywords[], mustAvoidTerms[], minChars, maxChars), `projectContext` (primaryGoal?, briefAndGuardrails con productDescription, targetAudiences, etc.).

**PointBriefDraftResponse:**  
`suggestedFields` (qualitativeObjective?, elementContext?, goodIdeas?, thingsToAvoid?, minChars?, maxChars?, mustIncludeKeywords?, mustAvoidTerms?), `fieldStates` (por campo: source, reviewStatus, confidence?), `warnings?` (code, message).

---

## Variants

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/projects/:projectId/points/:pointId/variants` | — | `VariantDto[]` |
| POST | `/projects/:projectId/points/:pointId/variants` | `{ text: string }` | `VariantDto` (manual variant) |
| POST | `/projects/:projectId/points/:pointId/variants/generate` | `{ count?: number }` | `VariantDto[]` |
| PATCH | `/projects/:projectId/variants/:variantId` | `UpdateVariantRequest` | `VariantDto` |
| POST | `/projects/:projectId/variants/:variantId/approve` | `{}` | `VariantDto` |
| POST | `/projects/:projectId/variants/:variantId/discard` | `{}` | `VariantDto` |
| DELETE | `/projects/:projectId/variants/:variantId` | — | `void` |

**UpdateVariantRequest:** `text?`, `uxScore?`, `uxRationale?`, `complianceScore?`, `complianceRationale?`, `status?` ('pending' \| 'approved' \| 'discarded').

**VariantDto:** `id`, `projectId`, `optimizationPointId`, `text`, `uxScore`, `uxRationale`, `complianceScore`, `complianceRationale`, `status`, `createdAt`, `source` ('ai' \| 'fallback' \| 'manual'), `angle?`, `reviewStatus?`, `riskFlags?`.

---

## Goals

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/projects/:projectId/goals` | — | `GoalDto[]` |
| PUT | `/projects/:projectId/goals` | `{ goals: GoalDto[] }` (sin id, projectId, createdAt) | `GoalDto[]` |

**GoalDto:** `id`, `projectId`, `name?`, `type` ('clickSelector' \| 'urlReached' \| 'dataLayerEvent'), `isPrimary: boolean`, `value: string`, `createdAt`.

---

## Reporting & results

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/projects/:projectId/reporting` | — | `ReportingResponse` |
| POST | `/projects/:projectId/reporting/simulate` | `{ durationMs?, intervalMs? }` | `ReportingResponse` |
| POST | `/projects/:projectId/results/simulate-month` | `{}` | `SimulateMonthResponse` (incl. `id`; `id: ""` si no persistió) |
| POST | `/projects/:projectId/results/reset` | `{}` | `{ success: boolean, message? }` |
| GET | `/projects/:projectId/results/simulations` | — | `SimulationsListResponse` |
| GET | `/projects/:projectId/results/simulations/:simulationId` | — | `SimulationDetailResponse` |
| DELETE | `/projects/:projectId/results/simulations/:simulationId` | — | `204 No Content` |

**ReportingResponse:** `metrics: Array<{ variantId, pointId, goalType, users, conversions, conversionRate, confidence }>`, `lastUpdated` (ISO).

**SimulateMonthResponse:** `id` (string; "" si no hubo datos y no se persistió), `combinations`, `frames`, `controlMetrics`.  
CombinationRow: `comboId`, `points[]`, `metrics`.  
SimulationFrame: `day`, `combos[]` (comboId, users, conversions, conversionRate, uplift, winProbability).

**SimulationsListResponse:** `simulations: SimulationSummaryDto[]`. Orden: `createdAt` desc.  
**SimulationSummaryDto:** `id`, `monthlyUsers`, `days`, `seed` (string | null), `createdAt` (ISO), `summary`: `{ totalCombinations`, `bestCombinationId`, `bestUplift`, `controlConversionRate }`.

**SimulationDetailResponse:** `id`, `projectId`, `monthlyUsers`, `days`, `seed`, `combinations`, `frames`, `controlMetrics`, `createdAt` (ISO). 404 si no existe o no pertenece al proyecto.

---

## Proxy

| Method | Path | Params / Request | Response |
|--------|------|------------------|----------|
| GET | `/proxy/fetch` | Query: `url` | HTML (text/html). Frontend interpreta como `{ html: string }`. |
| GET | `/proxy/preview/:projectId` | Query opcional: `variantIds` (comma-separated) | `{ html: string }` o texto; frontend normaliza a `{ html: string }`. |
