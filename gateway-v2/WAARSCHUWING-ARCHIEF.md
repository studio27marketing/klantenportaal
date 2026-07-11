# WAARSCHUWING: ARCHIEF, NOOIT DEPLOYEN

Deze map is een VEROUDERDE kopie van de klantenportaal-gateway uit de ClickUp/Make-tijd
(o.a. projectFacturatieSave via cu.field en bedrijfUpload via cu.uploadAttachment).

- De ECHTE bron van de live worker `s27-portal-gateway-v2` is de GitHub-monorepo
  **studio27marketing/teamportaal** (src/modules/*.mjs, build naar src/worker.js).
  Deploy gebeurt uitsluitend via een push naar main daar (CI).
- De live gateway draait 100% op de hub-D1; een `wrangler deploy` vanuit deze map zou
  het volledige klantpad terugrollen naar de oude ClickUp/Make-versie.
- Daarom is de workernaam in `wrangler.toml` hernoemd naar
  `s27-portal-gateway-v2-ARCHIEF-NIET-DEPLOYEN`, zodat een per-ongeluk-deploy nooit
  de live worker overschrijft.

Golf 1 van het plan "klantenportaal 100% hub" (11-07-2026).
