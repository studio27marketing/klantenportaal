# WAARSCHUWING: ARCHIEF, NOOIT DEPLOYEN

Deze map is de OERVERSIE van de klantenportaal-gateway (v1) en is definitief archief.

- De ECHTE bron van de live worker `s27-portal-gateway-v2` is de GitHub-monorepo
  **studio27marketing/teamportaal** (src/modules/*.mjs, build naar src/worker.js).
  Deploy gebeurt uitsluitend via een push naar main daar (CI).
- Een `wrangler deploy` vanuit deze map hoort nooit meer te gebeuren; daarom is de
  workernaam in `wrangler.toml` hernoemd naar `s27-portal-gateway-ARCHIEF-NIET-DEPLOYEN`.

Golf 1 van het plan "klantenportaal 100% hub" (11-07-2026).
