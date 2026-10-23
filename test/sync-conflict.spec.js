const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

// one vm realm per test, same reason as jql.spec.js (global scripts, cross-realm instanceof checks)
function sandboxWith(files, epilogue) {
    const sandbox = { console, setTimeout, clearTimeout };
    vm.createContext(sandbox);
    vm.runInContext(files.map(read).concat([epilogue || '']).join('\n;\n'), sandbox, { filename: 'jdb-sync.js' });
    return sandbox;
}

const SYNC_FILES = ['src/connectors/sync/snapshot.js', 'src/connectors/sync/process.js', 'src/connectors/sync/helpers.js', 'src/connectors/sync/startstate.js'];

// in-memory stand-in for privateApi: tables, rows, pending records and every HTTP call made
const HARNESS = `
globalThis.__state = { tables: {}, rows: {}, pending: {}, resource: { resourceManager: {} }, calls: [], config: {}, server: {}, confirm: true };
globalThis.confirm = function () { return __state.confirm; };
var __resource = {
    getTableLastSyncDate: function (tbl) { var r = __state.resource.resourceManager[tbl]; return r && r.lastSyncedDate; },
    getTableNames: function () { return Object.keys(__state.resource.resourceManager); },
    getResource: function () { return __state.resource; },
    removeTableFromResource: function (tbl) { delete __state.resource.resourceManager[tbl]; },
    putTableResource: function (tbl, def) { __state.resource.resourceManager[tbl] = def; }
};
var __resolver = {
    get records() { return __state.pending; },
    has: function (tbl) { return !!__state.pending[tbl]; },
    isResolved: function (tbl) { delete __state.pending[tbl]; return this; },
    handleFailedRecords: function () { return this; },
    get: function (tbl) { return { data: {} }; }
};
DatabaseSyncConnector = { coreApi: {
    constants: { RESOURCEMANAGER: 'rm', RECORDRESOLVERS: 'rr' },
    DB_EVENT_NAMES: { RESOLVE_SCHEMA: 'onResolveSchema', DROP_TABLE: 'onDropTable' },
    storeMapping: { delRecordName: 'del' },
    getActiveDB: function () { return { get: function (key) { return key == 'rm' ? __resource : __resolver; } }; },
    getConfigData: function (key) { return __state.config[key]; },
    getTable: function (app, tbl, copy) { var t = __state.tables[tbl]; return t ? (copy ? Object.assign({}, t) : t) : null; },
    getTableData: function (app, tbl) { return __state.rows[tbl] || []; },
    tableExists: function (app, tbl) { return !!__state.tables[tbl]; },
    truncateTable: function (app, tbl) { __state.rows[tbl] = []; },
    resolveUpdate: function (app, tbl, records) { __state.rows[tbl] = (__state.rows[tbl] || []).concat(records.insert); return Promise.resolve(); },
    updateDB: function (app, tbl, fn, lastSynced) {
        var ret = {}; if (fn) fn(ret); if (tbl && __state.tables[tbl]) Object.assign(__state.tables[tbl], ret);
        if (tbl && lastSynced && __state.resource.resourceManager[tbl]) __state.resource.resourceManager[tbl].lastSyncedDate = lastSynced;
    },
    storageFacade: {
        broadcast: function (app, event, args) { if (event == 'onResolveSchema') Object.keys(args[1]).forEach(function (t) { __state.tables[t] = args[1][t]; }); },
        remove: function () {}
    },
    buildHttpRequestOptions: function (app, opts) { return opts; },
    $http: function (opts) {
        __state.calls.push([opts.path, (opts.data && opts.data.loadData) || null]);
        var handler = __state.server[opts.path];
        return handler ? handler(opts) : Promise.reject({ message: 'no route ' + opts.path });
    },
    autoSync: function (app, tbl) { __state.calls.push(['autoSync', tbl]); return Promise.resolve({ _hash: 'pushed' }); }
} };
syncHelper.finalizeProcess = function () { __state.done('finalizeProcess'); };
syncHelper.killState = function () { __state.done('killState'); };
globalThis.__run = function (tables, serverResource) {
    var p = syncHelper.process.startSyncProcess('app', 1);
    p.getSet('entity', tables);
    p.getSet('networkResolver', { logger: [], conflictResolver: null, resolveDeletedTable: function () { return true; } });
    p.getSet('allowDataSyncing', __state.allowDataSyncing || false);
    return new Promise(function (resolve) {
        __state.done = resolve;
        startSyncState('app', JSON.parse(serverResource), {});
    });
};
globalThis.__check = function (tbl) {
    var p = syncHelper.process.startSyncProcess('app', 1);
    p.getSet('schemas', __state.serverSchemas || {});
    return syncHelper.SyncConflictChecker('app', tbl, p).then(function (r) { return { ok: r }; }, function (e) { return { rejected: e }; });
};
globalThis.__Snap = SnapShot;
globalThis.__sync = syncHelper;
`;

function setup(state) {
    const sandbox = sandboxWith(SYNC_FILES, HARNESS);
    Object.assign(sandbox.__state, JSON.parse(JSON.stringify(state || {})));
    return sandbox;
}

const local = cols => ({ _hash: 'h', lastModified: 100, columns: [cols], index: {} });
const server = (cols, extra) => Object.assign({ _hash: 'h', lastModified: 200, columns: [cols], index: {} }, extra || {});

describe('sync conflict resolution', function () {
    describe('SnapShot', function () {
        it('reports server-only, local-only and changed columns without touching either schema', function () {
            const sandbox = setup();
            const snapLocal = local({ name: { type: 'VARCHAR' }, age: { type: 'VARCHAR' }, legacy: { type: 'VARCHAR' } });
            const snapServer = server({ name: { type: 'VARCHAR' }, age: { type: 'number' }, email: { type: 'VARCHAR' } });
            const before = JSON.stringify(snapLocal);
            const snap = new sandbox.__Snap(JSON.parse(JSON.stringify(snapServer)), snapLocal);
            assert.deepStrictEqual(plain(snap.changes), { serverOnly: ['email'], localOnly: ['legacy'], changed: ['age'], config: [], total: 3 });
            assert.strictEqual(JSON.stringify(snapLocal), before);
        });

        it('ignores key order and treats null, undefined and {} as equal', function () {
            const sandbox = setup();
            const snap = new sandbox.__Snap(
                { _hash: 'h', columns: [{ a: { type: 'x', required: true } }], index: {}, foreignKey: null },
                { _hash: 'h', columns: [{ a: { required: true, type: 'x' } }] });
            assert.strictEqual(snap.counter, 0);
        });

        it('counts an index added on the server', function () {
            const sandbox = setup();
            const snap = new sandbox.__Snap(server({ name: {} }, { index: { name: { unique: true } } }), local({ name: {} }));
            assert.deepStrictEqual(plain(snap.changes.config), ['index']);
        });
    });

    describe('SyncConflictChecker', function () {
        const base = {
            tables: { users: local({ name: { type: 'VARCHAR' } }) },
            serverSchemas: { users: server({ name: { type: 'VARCHAR' }, email: { type: 'VARCHAR' } }) },
            resource: { resourceManager: { users: { lastSyncedDate: 150 } } }
        };

        it('pulls a server schema change when the local schema was not edited, even if local data writes made it look newer', async function () {
            const sandbox = setup(base);
            sandbox.__state.tables.users.lastModified = 999;
            const res = plain(await sandbox.__check('users'));
            assert.strictEqual(res.ok.direction, 'pull');
        });

        it('treats a schema edited locally and on the server since the last sync as a conflict', async function () {
            const sandbox = setup(base);
            sandbox.__state.tables.users.schemaModified = 160;
            const res = plain(await sandbox.__check('users'));
            assert.strictEqual(res.rejected.reason, 'schema');
        });

        it('pushes a local schema edit when the server has not changed since the last sync, also for server-schema DBs', async function () {
            const sandbox = setup(Object.assign({}, base, { config: { useFrontendOnlySchema: true }, resource: { resourceManager: { users: { lastSyncedDate: 300 } } } }));
            sandbox.__state.tables.users.schemaModified = 400;
            const res = plain(await sandbox.__check('users'));
            assert.strictEqual(res.ok.direction, 'push');
        });

        it('reports newer server records as a data conflict', async function () {
            const sandbox = setup(base);
            sandbox.__state.serverSchemas.users._hash = 'new';
            const res = plain(await sandbox.__check('users'));
            assert.strictEqual(res.rejected.reason, 'data');
        });

        it('pulls a table missing locally with its records instead of crashing', async function () {
            const sandbox = setup(Object.assign({}, base, { tables: {} }));
            const res = plain(await sandbox.__check('users'));
            assert.deepStrictEqual([res.ok.direction, res.ok.withData], ['pull', true]);
        });
    });

    describe('mergePendingRecords', function () {
        it('keeps unsynced local inserts and updates and applies pending deletes over the server rows', function () {
            const sandbox = setup({
                rows: { users: [{ _ref: 'a', _data: { n: 'local-a' } }, { _ref: 'new', _data: { n: 'new' } }, { _ref: 'c', _data: { n: 'c' } }] },
                pending: { users: { data: { insert: { new: true }, update: { a: { n: 'local-a' } }, delete: { b: true } } } }
            });
            const rows = plain(sandbox.__sync.mergePendingRecords('app', 'users', [
                { _id: 'a', n: 'server-a' }, { _id: 'b', n: 'server-b' }, { _id: 'c', n: 'server-c' }
            ]));
            assert.deepStrictEqual(rows, [{ _id: 'c', n: 'server-c' }, { _ref: 'a', _data: { n: 'local-a' } }, { _ref: 'new', _data: { n: 'new' } }]);
        });
    });

    describe('startSyncState', function () {
        const schemaRoute = schemas => opts => Promise.resolve({ schemas: JSON.parse(JSON.stringify(schemas)) });
        const resource = JSON.stringify({ resourceManager: { users: {}, posts: {} } });

        it('updates the local schema from the server and never pushes it over a newer server schema', async function () {
            const sandbox = setup({
                tables: { users: local({ name: { type: 'VARCHAR' } }) },
                resource: { resourceManager: { users: { lastSyncedDate: 50 } } }
            });
            const serverUsers = server({ name: { type: 'VARCHAR' }, email: { type: 'VARCHAR' } });
            sandbox.__state.server['/database/schema'] = schemaRoute({ users: serverUsers });
            const outcome = await sandbox.__run(['users'], JSON.stringify({ resourceManager: { users: {} } }));
            assert.strictEqual(outcome, 'finalizeProcess');
            assert.ok(!sandbox.__state.calls.some(c => c[0] == '/database/sync'));
            assert.deepStrictEqual(Object.keys(sandbox.__state.tables.users.columns[0]), ['name', 'email']);
        });

        it('takes the server records on a data conflict, keeps pending local rows and pushes them', async function () {
            const sandbox = setup({
                allowDataSyncing: true,
                tables: { users: local({ name: {} }) },
                rows: { users: [{ _ref: 'mine', _data: { name: 'mine' } }, { _ref: 'old', _data: { name: 'old' } }] },
                pending: { users: { data: { insert: { mine: true }, update: {}, delete: {} } } },
                resource: { resourceManager: { users: { lastSyncedDate: 50 } } }
            });
            sandbox.__state.server['/database/schema'] = opts => Promise.resolve({ schemas: { users: Object.assign(server({ name: {} }, { _hash: 'srv' }), opts.data && opts.data.loadData.length ? { data: [{ _id: 'theirs', name: 'theirs' }] } : {}) } });
            const outcome = await sandbox.__run(['users'], JSON.stringify({ resourceManager: { users: {} } }));
            assert.strictEqual(outcome, 'finalizeProcess');
            assert.deepStrictEqual(plain(sandbox.__state.rows.users).map(r => r._ref || r._id), ['theirs', 'mine']);
            assert.strictEqual(sandbox.__state.tables.users._hash, 'srv');
            assert.ok(sandbox.__state.calls.some(c => c[0] == 'autoSync'));
            assert.ok(!sandbox.__state.calls.some(c => c[0] == '/database/sync'));
        });

        it('fails the sync when a conflict is declined, even if a later table succeeds', async function () {
            const sandbox = setup({
                confirm: false,
                tables: { users: local({ name: {} }), posts: local({ title: {} }) },
                resource: { resourceManager: { users: {}, posts: {} } }
            });
            sandbox.__state.server['/database/schema'] = schemaRoute({ users: server({ name: {} }, { _hash: 'new' }), posts: local({ title: {} }) });
            // posts is popped first, users (declined) last - and the reverse order below
            assert.strictEqual(await sandbox.__run(['posts', 'users'], resource), 'killState');
            assert.strictEqual(await sandbox.__run(['users', 'posts'], resource), 'killState');
        });

        it('finishes with an error instead of hanging when the server rejects a push', async function () {
            const sandbox = setup({ tables: { users: Object.assign(local({ name: {} }), { schemaModified: 400 }) }, resource: { resourceManager: { users: { lastSyncedDate: 300 } } } });
            sandbox.__state.server['/database/schema'] = schemaRoute({ users: server({ name: {}, email: {} }) });
            sandbox.__state.server['/database/sync'] = () => Promise.resolve({ ok: false });
            assert.strictEqual(await sandbox.__run(['users'], JSON.stringify({ resourceManager: { users: {} } })), 'killState');
        });

        it('finishes with an error instead of hanging when the schema request fails', async function () {
            const sandbox = setup({ tables: { users: local({ name: {} }) }, resource: { resourceManager: { users: {} } } });
            assert.strictEqual(await sandbox.__run(['users'], JSON.stringify({ resourceManager: { users: {} } })), 'killState');
        });
    });

    describe('local schema edits', function () {
        it('stamp schemaModified through alter and update', function () {
            const sandbox = { console };
            vm.createContext(sandbox);
            vm.runInContext([
                'var __table = { DB_NAME: "app", TBL_NAME: "users", columns: [{ name: { type: "VARCHAR" } }], index: {} };',
                'privateApi = { getTable: function () { return __table; }, getTableData: function () { return []; }, updateDB: function (db, tbl, fn) { var ret = {}; fn(ret); Object.assign(__table, ret); }, storageFacade: { broadcast: function () {} } };',
                'tableModelMapper = function () { return function (v) { return v; }; }; DB_EVENT_NAMES = {}; jEliDeepCopy = function (v) { return JSON.parse(JSON.stringify(v)); }; isobject = function (o) { return o && typeof o == "object" && !Array.isArray(o); }; isstring = function (s) { return typeof s == "string"; };',
                read('src/core/application/database/table/alter.js'),
                read('src/core/application/database/table/core.js'),
                'globalThis.__instance = new TableInstance("app", "users"); globalThis.__getTable = function () { return __table; };'
            ].join('\n;\n'), sandbox);
            sandbox.__instance.alter.drop('name');
            assert.ok(sandbox.__getTable().schemaModified > 0);
            delete sandbox.__getTable().schemaModified;
            sandbox.__instance.update({ columns: { name: { type: 'VARCHAR' } } });
            assert.ok(sandbox.__getTable().schemaModified > 0);
        });
    });
});
