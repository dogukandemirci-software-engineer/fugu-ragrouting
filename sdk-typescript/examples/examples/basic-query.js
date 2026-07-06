"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
async function main() {
    const apiKey = process.env.FUGU_API_KEY;
    if (!apiKey) {
        throw new Error('Set FUGU_API_KEY env var to a valid fugu_sk_... key');
    }
    const client = new index_1.FuguClient({
        apiKey,
        baseUrl: process.env.FUGU_BASE_URL ?? 'http://localhost:3001/api',
    });
    const result = await client.query('what does FUGU combine to answer questions');
    console.log('Answer:', result.answer);
    console.log('Strategy used:', result.explain.strategy_final);
    console.log('Sources:', result.results.length);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
