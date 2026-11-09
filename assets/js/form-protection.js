(function () {
    "use strict";
    const states = new WeakMap();
    const config = window.AmnikonApiConfig?.turnstile;
    let provider;
    function securityError(message) { const error = new Error(message); error.isSecurityError = true; return error; }
    function loadProvider() {
        if (window.turnstile) return Promise.resolve();
        if (!provider) provider = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            const timeout = setTimeout(() => reject(securityError("The security check could not load. Please try again later.")), 15000);
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
            script.async = true;
            script.onload = () => { clearTimeout(timeout); resolve(); };
            script.onerror = () => { clearTimeout(timeout); reject(securityError("The security check could not load. Please try again later.")); };
            document.head.appendChild(script);
        });
        return provider;
    }
    function prepare(form) {
        if (states.has(form)) return states.get(form);
        const trap = document.createElement("div");
        trap.setAttribute("aria-hidden", "true");
        trap.style.cssText = "position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden";
        const label = document.createElement("label"); label.textContent = "Leave this field empty";
        const input = document.createElement("input"); input.name = "website_confirmation"; input.type = "text";
        input.tabIndex = -1; input.autocomplete = "off"; input.maxLength = 256;
        label.appendChild(input); trap.appendChild(label); form.appendChild(trap);
        const state = { input, token: "", widget: null, ready: Promise.resolve() };
        states.set(form, state);
        if (config?.enabled) {
            const container = document.createElement("div");
            container.setAttribute("aria-label", "Security check");
            container.style.cssText = "margin:16px 0;min-height:65px;color:inherit";
            container.textContent = "Loading security check…";
            form.insertBefore(container, form.querySelector("button[type='submit']"));
            state.ready = (async () => {
                if (!config.siteKey) throw securityError("The security check is not configured. Please try again later.");
                await loadProvider();
                container.textContent = "";
                state.widget = window.turnstile.render(container, {
                    sitekey: config.siteKey, action: form.dataset.formAction, "response-field": false,
                    callback: token => { state.token = token; },
                    "expired-callback": () => { state.token = ""; },
                    "error-callback": () => { state.token = ""; }
                });
            })();
            state.ready.catch(() => { container.textContent = "Security check unavailable. Please try again later."; });
        }
        return state;
    }
    async function headers(form) {
        const state = prepare(form);
        await state.ready;
        const result = { "X-Website-Check": state.input.value };
        if (config?.enabled) {
            if (!state.token) throw securityError("Please complete the security check before sending the form.");
            result["X-Turnstile-Token"] = state.token;
        }
        return result;
    }
    function reset(form) {
        const state = states.get(form);
        if (!state) return;
        state.token = "";
        if (state.widget !== null && window.turnstile) window.turnstile.reset(state.widget);
    }
    function rejectionMessage(response, result, fallback) {
        const delay = Number(result?.retryAfterSeconds || response.headers?.get("Retry-After"));
        if (response.status === 429) {
            const seconds = Number.isFinite(delay) && delay > 0 ? Math.ceil(delay) : 60;
            return "Too many attempts. Please try again in " + seconds + " seconds. Your details have been kept.";
        }
        if (response.status === 503) return "The service is temporarily unavailable. Your details have been kept. Please try again later.";
        if (response.status >= 500) return fallback;
        return result?.message || result?.Message || fallback;
    }
    function errorMessage(error, fallback) { return error?.isSecurityError ? error.message : fallback; }
    window.AmnikonFormProtection = Object.freeze({ headers, reset, rejectionMessage, errorMessage });
    document.querySelectorAll("form[data-form-action]").forEach(prepare);
})();
