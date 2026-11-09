(function () {
    "use strict";
    const endpoints = new Set(["contact", "support", "careers"]);

    function endpoint(name) {
        if (!endpoints.has(name)) throw new Error("Unknown form endpoint.");
        const configured = window.AmnikonApiConfig?.baseUrl;
        if (typeof configured !== "string" || !configured.trim()) {
            throw new Error("The website API address has not been configured.");
        }
        const value = configured.trim();
        // Root-relative addresses keep the API independent of /pages/* paths.
        if ((!value.startsWith("/") || value.startsWith("//")) && !/^https?:\/\//i.test(value)) {
            throw new Error("Configure a root-relative or complete HTTP(S) API address.");
        }
        const base = new URL(value, window.location.origin);
        if (base.username || base.password || base.search || base.hash) {
            throw new Error("The API address cannot contain credentials, query parameters or fragments.");
        }
        const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
        if (base.protocol !== "https:" && !(base.protocol === "http:" && loopback)) {
            throw new Error("The deployed API must use HTTPS.");
        }
        base.pathname = base.pathname.replace(/\/+$/, "") + "/" + name;
        return base.href;
    }

    const attempts = new Map();
    const transientFields = new Set(["submissionid", "website_confirmation", "cf-turnstile-response"]);
    const storageKey = name => "amnikon-submission-" + name;
    async function hash(value) {
        const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
        return Array.from(new Uint8Array(await window.crypto.subtle.digest("SHA-256", bytes)))
            .map(b => b.toString(16).padStart(2, "0")).join("");
    }
    async function submissionId(name, payload) {
        if (!endpoints.has(name)) throw new Error("Unknown form endpoint.");
        let values;
        if (typeof FormData !== "undefined" && payload instanceof FormData) {
            values = [];
            for (const [key, value] of payload.entries()) {
                if (transientFields.has(key.toLowerCase())) continue;
                values.push([key, typeof Blob !== "undefined" && value instanceof Blob
                    ? [value.name, value.size, await hash(await value.arrayBuffer())] : String(value)]);
            }
        } else {
            values = Object.entries(payload).filter(([key]) => !transientFields.has(key.toLowerCase()));
        }
        values.sort(([a], [b]) => a.localeCompare(b));
        const fingerprint = await hash(JSON.stringify(values));
        let previous = attempts.get(name);
        try { previous = JSON.parse(window.sessionStorage.getItem(storageKey(name))) || previous; } catch (_) { /* Private browsing can disable session storage. */ }
        if (previous?.fingerprint === fingerprint) return previous.id;
        const current = { id: window.crypto.randomUUID(), fingerprint };
        attempts.set(name, current);
        // Store only a random identifier and fingerprint, never form content or files.
        try { window.sessionStorage.setItem(storageKey(name), JSON.stringify(current)); } catch (_) { }
        return current.id;
    }
    function completeSubmission(name) {
        attempts.delete(name);
        try { window.sessionStorage.removeItem(storageKey(name)); } catch (_) { }
    }

    window.AmnikonApi = Object.freeze({ endpoint, submissionId, completeSubmission });
})();
