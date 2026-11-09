/* Public deployment setting only. Never put credentials in this file.
 * The previous URLs used /api/api because an IIS /api application can contain
 * controllers whose routes also begin with /api. Preserve that path by default;
 * confirm it against the actual IIS deployment before release.
 * For a backend hosted at the origin root, use "/api" instead.
 * For a separate API host, use its complete HTTPS base URL and configure CORS.
 */
window.AmnikonApiConfig = Object.freeze({
    baseUrl: "/api/api",
    turnstile: Object.freeze({ enabled: false, siteKey: "" })
});
