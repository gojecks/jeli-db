const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const plain = value => JSON.parse(JSON.stringify(value));

// minimal in-memory IndexedDB: requests and transactions run in later ticks, in the order they were made
function fakeIndexedDB() {
    const databases = new Map();
    let pending = 0;
    const later = fn => { pending++; setTimeout(() => { try { fn(); } finally { pending--; } }); };

    function connection(entry) {
        return {
            objectStoreNames: { contains: name => entry.stores.has(name) },
            createObjectStore: name => entry.stores.set(name, new Map()),
            close() { },
            transaction(name) {
                const ops = [];
                const tx = { error: null };
                const request = op => { const req = {}; ops.push(() => op(req)); return req; };
                const store = entry.stores.get(name);
                tx.objectStore = () => ({
                    put: value => { const copy = structuredClone(value); return request(req => { store.set(copy._rev, copy); req.onsuccess && req.onsuccess(); }); },
                    delete: key => request(req => { store.delete(key); req.onsuccess && req.onsuccess(); }),
                    clear: () => request(req => { store.clear(); req.onsuccess && req.onsuccess(); }),
                    openCursor: () => request(req => {
                        const entries = Array.from(store.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1));
                        let i = 0;
                        const step = () => {
                            req.result = i < entries.length ? { key: entries[i][0], value: structuredClone(entries[i][1]), continue() { i++; ops.unshift(step); } } : null;
                            req.onsuccess && req.onsuccess();
                        };
                        step();
                    })
                });
                later(() => {
                    try { while (ops.length) ops.shift()(); } catch (e) { tx.error = e; return tx.onabort && tx.onabort(); }
                    tx.oncomplete && tx.oncomplete();
                });
                return tx;
            }
        };
    }

    return {
        databases,
        idle: () => new Promise(resolve => { const check = () => pending ? setTimeout(check, 2) : resolve(); check(); }),
        deleteDatabase: name => later(() => databases.delete(name)),
        open(name, version) {
            const req = {};
            later(() => {
                if (!databases.has(name)) databases.set(name, { version: 0, stores: new Map() });
                const entry = databases.get(name);
                req.result = connection(entry);
                if (version > entry.version) {
                    const oldVersion = entry.version;
                    entry.version = version;
                    req.onupgradeneeded && req.onupgradeneeded({ oldVersion });
                }
                req.onsuccess && req.onsuccess();
            });
            return req;
        }
    };
}

describe('indexeddb adapter', function () {
    let idb, sandbox;

    const storageUtils = {
        storeMapping: { resourceName: '_r_', pendingSync: '_l_', nextSchemaSyncDate: '_nsd_' },
        generateStruct: cache => ({ version: cache.get('version'), tables: {} })
    };
    const open = name => new Promise(resolve => {
        const adapter = sandbox.IndexedDBAdapter({ name: name || 'app' }, storageUtils, () => resolve(adapter));
    });
    const usersTable = () => ({ TBL_NAME: 'users', DB_NAME: 'app', lastInsertId: 0, columns: [{ name: {} }] });
    async function seed(rows, name) {
        const db = await open(name);
        db.broadcast('onResolveSchema', [1, { users: usersTable() }]);
        db.setItem('_r_', { resourceManager: { users: {} } });
        db.broadcast('insert', ['users', rows, true]);
        await idb.idle();
        return db;
    }
    const reopenRows = async name => plain((await open(name)).getItem('users:data'));

    beforeEach(function () {
        idb = fakeIndexedDB();
        sandbox = { console, setTimeout, self: { indexedDB: idb } };
        vm.createContext(sandbox);
        vm.runInContext(fs.readFileSync(path.join(ROOT, 'packages/indexeddb-adapter/index.js'), 'utf8') + '\nglobalThis.IndexedDBAdapter = IndexedDBAdapter;', sandbox);
    });

    it('opens with a Map-backed store for generateStruct', async function () {
        const db = await open();
        db.setItem('version', 3);
        assert.strictEqual(db.getItem().version, 3);
        assert.ok(db.usage() > 2);
    });

    it('keeps each database in its own IndexedDB', async function () {
        (await open('a')).setItem('version', 1);
        (await open('b')).setItem('version', 2);
        await idb.idle();
        assert.strictEqual((await open('a')).getItem('version'), 1);
        assert.strictEqual((await open('b')).getItem('version'), 2);
    });

    it('persists inserts, updates, deletes and truncates', async function () {
        const db = await seed([{ _id: 'r1', name: 'Ann' }, { _id: 'r2', name: 'Bob' }]);
        assert.deepStrictEqual(await reopenRows(), [{ _id: 'r1', name: 'Ann' }, { _id: 'r2', name: 'Bob' }]);

        const rows = db.getItem('users:data');
        rows[0].name = 'Anna';
        db.broadcast('update', ['users', [{ _id: 'r1', name: 'Anna' }]]);
        rows.splice(1, 1);
        db.broadcast('delete', ['users', ['r2']]);
        await idb.idle();
        assert.deepStrictEqual(await reopenRows(), [{ _id: 'r1', name: 'Anna' }]);

        db.broadcast('onTruncateTable', ['users']);
        await idb.idle();
        assert.deepStrictEqual(await reopenRows(), []);
    });

    it('keeps rows when an existing table is re-resolved', async function () {
        const db = await seed([{ _id: 'r1', name: 'Ann' }]);
        db.broadcast('onResolveSchema', [2, { users: Object.assign(usersTable(), { data: [] }) }]);
        await idb.idle();
        assert.deepStrictEqual(await reopenRows(), [{ _id: 'r1', name: 'Ann' }]);
    });

    it('copies its own records out of the old shared database', async function () {
        const legacy = new Map([
            ['version', { _rev: 'version', _data: 4 }],
            ['_r_', { _rev: '_r_', _data: { resourceManager: { users: {} } } }],
            ['users', { _rev: 'users', _data: usersTable() }],
            ['users:data', { _rev: 'users:data', _data: [{ _id: 'r1', name: 'Ann' }] }],
            ['other', { _rev: 'other', _data: {} }]
        ]);
        idb.databases.set('_jEliDB_', { version: 1, stores: new Map([['_jEli_DB_Store_', legacy]]) });
        const db = await open();
        assert.strictEqual(db.getItem('version'), 4);
        assert.deepStrictEqual(plain(db.getItem('users:data')), [{ _id: 'r1', name: 'Ann' }]);
        assert.strictEqual(db.isExists('other'), false);
    });

    it('renames a table and the database', async function () {
        const db = await seed([{ _id: 'r1', name: 'Ann' }]);
        db.setItem('_r_', { resourceManager: { people: {} } });
        db.broadcast('onRenameTable', ['users', 'people']);
        await new Promise(resolve => db.broadcast('onRenameDataBase', ['app', 'shop', resolve]));
        await idb.idle();
        const renamed = await open('shop');
        assert.strictEqual(renamed.getItem('people').DB_NAME, 'shop');
        assert.deepStrictEqual(plain(renamed.getItem('people:data')), [{ _id: 'r1', name: 'Ann' }]);
        assert.strictEqual(idb.databases.has('_jEliDB_:app'), false);
    });

    it('clears everything', async function () {
        const db = await seed([{ _id: 'r1', name: 'Ann' }]);
        assert.strictEqual(await new Promise(resolve => db.clear(resolve)), true);
        assert.strictEqual((await open()).isExists('users'), false);
    });
});
