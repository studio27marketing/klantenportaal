/* Studio 27 Teamportaal — minimale statische host. Cloudflare serveert bestanden uit
 * ../team; niet-bestaande paden vallen via not_found_handling (SPA) terug op index.html.
 * Geen API-logica hier: de team-frontend praat cross-origin met s27-portal-gateway-v2. */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
