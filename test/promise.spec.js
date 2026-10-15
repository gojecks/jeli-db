const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'src/core/helpers/promise.core.js'), 'utf8');

// promise.core.js is a global script (no exports), so expose its classes from one vm realm
function load() {
    const context = vm.createContext({ console });
    vm.runInContext(`${src}; this.DBPromise = DBPromise; this.DBPromiseExtension = DBPromiseExtension;`, context);
    return context;
}

describe('DBPromise', () => {
    const { DBPromise, DBPromiseExtension } = load();
    const resolved = (value, extension) => new DBPromise(resolve => resolve(value), extension);
    const rejected = (value, extension) => new DBPromise((_, reject) => reject(value), extension);

    it('gives every subscriber the original value', async () => {
        const promise = resolved({ flow: 'email-first' });
        const first = await promise.then(() => undefined);
        const second = await promise.then(policy => policy);
        assert.strictEqual(first, undefined);
        assert.deepStrictEqual(second, { flow: 'email-first' });
    });

    it('chains values through then', async () => {
        assert.strictEqual(await resolved(1).then(v => v + 1).then(v => v * 10), 20);
    });

    it('waits for a promise returned from a callback', async () => {
        await assert.rejects(resolved({ status: 'error' }).then(res => Promise.reject(res)).then(() => 'not reached'), { status: 'error' });
    });

    it('rejects when a callback throws, and catch receives it', async () => {
        const caught = await resolved(1).then(() => { throw new Error('boom'); }).catch(e => e.message);
        assert.strictEqual(caught, 'boom');
    });

    it('passes rejections to the error callback', async () => {
        const seen = await rejected({ code: 400 }).then(() => 'not reached', err => err.code);
        assert.strictEqual(seen, 400);
    });

    it('runs callbacks asynchronously, like a standard Promise', async () => {
        let ran = false;
        const promise = resolved(1).then(() => { ran = true; });
        assert.strictEqual(ran, false);
        await promise;
        assert.strictEqual(ran, true);
    });

    it('keeps extension methods on promises returned by then, catch and finally', () => {
        const extension = new DBPromiseExtension(() => {}, ['progress']).handlers;
        const promise = resolved(1, extension);
        assert.strictEqual(typeof promise.then(v => v).progress, 'function');
        assert.strictEqual(typeof promise.catch(() => {}).progress, 'function');
        assert.strictEqual(typeof promise.finally(() => {}).progress, 'function');
        assert.strictEqual(typeof resolved(1).then(v => v).progress, 'undefined');
    });

    it('routes extension events to handlers registered after then', () => {
        const progress = [];
        const ext = new DBPromiseExtension(() => {}, ['progress']);
        const promise = new DBPromise(() => {}, ext.handlers);
        promise.then(() => {}).progress((loaded, total) => progress.push([loaded, total]));
        ext.call('progress', [5, 10]);
        assert.deepStrictEqual(progress, [[5, 10]]);
    });

    it('keeps onSuccess/onError as aliases', async () => {
        assert.strictEqual(await resolved(2).onSuccess(v => v * 2), 4);
        assert.strictEqual(await rejected('no').onError(e => `handled ${e}`), 'handled no');
    });

    it('still requires an executor', () => {
        assert.throws(() => new DBPromise(), /requires a callback/);
    });
});
