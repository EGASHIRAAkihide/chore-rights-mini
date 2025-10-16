#!/usr/bin/env bash
set -euo pipefail

OUT="docs/design/openapi.yaml"
mkdir -p "$(dirname "$OUT")"

cat > "$OUT" <<'YAML'
openapi: 3.0.3
info:
  title: ChoreRights API
  version: "2025-10-16"
servers:
  - url: https://app.chorerights.local
paths:
  /api/works/register:
    post:
      summary: Register choreography and mint ICC proof
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateWorkPayload"
      responses:
        "200":
          description: Created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CreateWorkResponse"
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    CreateWorkPayload:
      type: object
      required: [title, video, icc, termsAccepted]
      properties:
        title: { type: string }
        description: { type: string }
        video:
          type: object
          properties:
            storageKey: { type: string }
          required: [storageKey]
        icc:
          type: object
          properties:
            country: { type: string, example: JP }
            registrant: { type: string, example: CRG }
            serial: { type: string, example: "000001" }
          required: [country, registrant, serial]
        fingerprint:
          type: object
          properties:
            algo: { type: string, example: pose-v1 }
            hash_or_vector: { type: string }
        delegation:
          type: object
          properties:
            isDelegated: { type: boolean }
            scope:
              type: array
              items:
                type: string
                enum: [license_collect, license_enforce]
        termsAccepted: { type: boolean }
    CreateWorkResponse:
      type: object
      properties:
        id: { type: string, format: uuid }
        icc: { type: string }
        fingerprint:
          type: object
          properties:
            id: { type: string }
            algo: { type: string }
            hash: { type: string }
        polygon:
          type: object
          properties:
            txHash: { type: string }
            network: { type: string, example: mumbai }
        createdAt: { type: string, format: date-time }
YAML

echo "✅ OpenAPI generated at $OUT"