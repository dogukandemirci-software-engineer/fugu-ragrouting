"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuguClient = exports.FuguApiError = void 0;
class FuguApiError extends Error {
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'FuguApiError';
    }
}
exports.FuguApiError = FuguApiError;
class FuguClient {
    constructor(options) {
        if (!options.apiKey)
            throw new Error('FuguClient requires an apiKey');
        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl ?? 'http://localhost:3001/api').replace(/\/+$/, '');
        this.fetchImpl = options.fetchImpl ?? fetch;
    }
    async query(query, options) {
        const res = await this.fetchImpl(`${this.baseUrl}/queries/v1/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                query,
                strategy: options?.strategy,
                top_k: options?.top_k,
            }),
            signal: options?.signal,
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
            const message = body?.error?.message ?? `Request failed with status ${res.status}`;
            throw new FuguApiError(message, res.status, body?.error?.code);
        }
        return body;
    }
}
exports.FuguClient = FuguClient;
