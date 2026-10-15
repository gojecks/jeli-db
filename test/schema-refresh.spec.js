const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// one vm realm per test group, same reason as jql.spec.js (global scripts, cross-realm instanceof checks)
function sandboxWith(files, prelude, epilogue) {
    const sandbox = { console, setTimeout, clearTimeout };
    vm.createContext(sandbox);
    const source = files.map(file => (file.startsWith('code:') ? file.slice(5) : read(file)));
    vm.runInContext([prelude || ''].concat(source, [epilogue || '']).join('\n;\n'), sandbox, { filename: 'jdb-app.js' });
    return sandbox;
}

describe('schema refresh', function () {
    describe('ResourceManager#getTableDifferences', function () {
        let sandbox;
        before(function () {
            sandbox = sandboxWith(['src/utils/common.js', 'src/core/application/resolvers/resource.js'],
                'privateApi = { storageFacade: { get: function () { return null; }, set: function () {} }, storeMapping: { resourceName: "r" } };',
                'globalThis.__diff = function (server, local) { var rm = new ResourceManager("app"); rm._resource = server; return rm.getTableDifferences(local); };');
        });

        it('reloads a table whose schema changed, even though its _hash did not', function () {
            const server = { resourceManager: { organisation: { _hash: 'h1', lastModified: 2000, lastSyncedDate: 2000 }, users: { _hash: 'u', lastModified: 100, lastSyncedDate: 100 } } };
            const local = { resourceManager: { organisation: { _hash: 'h1', lastModified: 1000, lastSyncedDate: 1000 }, users: { _hash: 'u', lastModified: 100, lastSyncedDate: 100 } } };
            assert.deepStrictEqual(Array.from(sandbox.__diff(server, local)), ['organisation']);
        });

        it('still reloads on a data change and for tables new to this browser', function () {
            const server = { resourceManager: { a: { _hash: 'new', lastSyncedDate: 5 }, b: { _hash: 'x', lastSyncedDate: 1 } } };
            const local = { resourceManager: { a: { _hash: 'old', lastSyncedDate: 1 } } };
            assert.deepStrictEqual(Array.from(sandbox.__diff(server, local)), ['a', 'b']);
        });
    });

    describe('jQl unknown-column retry', function () {
        function setup(serverSchema) {
            const sandbox = sandboxWith([
                'src/utils/common.js',
                'src/core/application/database/transactions/querybuilder.js',
                'src/core/helpers/promise.core.js',
                'src/core/adapters/core.plugins.js',
                'code:Database = { plugins: PluginsInstance };',
                'src/core/application/database/index.js',
                'src/plugins/update.plugins.js'
            ], '', [
                'globalThis.__state = { attempts: 0, refreshed: [] };',
                'privateApi = { getConfigData: function (prop) { return prop === "useFrontendOnlySchema" && __state.serverSchema; } };',
                // stands in for schema.server.js: the column exists once the table has been refreshed
                'refreshTableSchemas = function (db, version, tables) { __state.refreshed.push(tables[0]); __state.columnKnown = __state.columnAdded; return Promise.resolve(tables); };',
                'Database.plugins.get("update").fn = function (query, handler) { return function () { __state.attempts++; ' +
                    'if (__state.columnKnown) return handler.onSuccess({ updated: 1 }); ' +
                    'handler.onError({ type: "update", error: { fields: [["branding"]], logs: ["column (branding) was not found on this table (organisation), to add a new column use the addColumn FN - ref #0"] } }); }; };',
                'globalThis.__instance = Object.create(BaseInstance.prototype); __instance.name = "core"; __instance.version = 1;'
            ].join('\n'));
            Object.assign(sandbox.__state, serverSchema);
            return sandbox;
        }

        it('refreshes the table and succeeds when the server has the column', async function () {
            const sandbox = setup({ serverSchema: true, columnAdded: true });
            const result = await sandbox.__instance.jQl('update -organisation -{"branding":{"name":"Acme"}} -{"name":"agency"}');
            assert.strictEqual(result.updated, 1);
            assert.deepStrictEqual(Array.from(sandbox.__state.refreshed), ['organisation']);
            assert.strictEqual(sandbox.__state.attempts, 2);
        });

        it('fails with the original error, once, when the column is still unknown', async function () {
            const sandbox = setup({ serverSchema: true, columnAdded: false });
            await assert.rejects(sandbox.__instance.jQl('update -organisation -{"branding":{}} -{"name":"agency"}'),
                err => /was not found on this table/.test(err.error.logs[0]));
            assert.strictEqual(sandbox.__state.attempts, 2);
            assert.strictEqual(sandbox.__state.refreshed.length, 1);
        });

        it('does not retry for databases that keep their schema locally', async function () {
            const sandbox = setup({ serverSchema: false, columnAdded: true });
            await assert.rejects(sandbox.__instance.jQl('update -organisation -{"branding":{}} -{"name":"agency"}'));
            assert.strictEqual(sandbox.__state.refreshed.length, 0);
            assert.strictEqual(sandbox.__state.attempts, 1);
        });
    });

    describe('refreshTableSchemas', function () {
        it('loads the table resource and schema, keeps it in the resource manager and broadcasts it', async function () {
            const sandbox = sandboxWith(['src/utils/constants.js', 'src/core/application/database/schema/schema.server.js'], '', [
                'globalThis.__calls = { http: [], put: [], broadcast: null, saved: 0 };',
                'privateApi = {',
                '  buildHttpRequestOptions: function (db, options) { return Object.assign({ db: db }, options); },',
                '  $http: function (request) { __calls.http.push(request.path); return Promise.resolve(request.path === "/database/resource"',
                '    ? { resource: { resourceManager: { organisation: { lastModified: 9 } } } }',
                '    : { schemas: { organisation: { TBL_NAME: "organisation", columns: [{ branding: { type: "OBJECT" } }] } } }); },',
                '  getActiveDB: function () { return { get: function () { return { putTableResource: function (t, d) { __calls.put.push([t, d.lastModified]); }, setResource: function () { __calls.saved++; } }; } }; },',
                '  storageFacade: { broadcast: function (db, event, args) { __calls.broadcast = [db, event, args]; } }',
                '};',
                'globalThis.__refresh = refreshTableSchemas;'
            ].join('\n'));
            const refreshed = await sandbox.__refresh('core', 3, ['organisation']);
            assert.deepStrictEqual(Array.from(refreshed), ['organisation']);
            assert.deepStrictEqual(Array.from(sandbox.__calls.http), ['/database/resource', '/database/schema']);
            assert.deepStrictEqual(JSON.parse(JSON.stringify(sandbox.__calls.put)), [['organisation', 9]]);
            assert.strictEqual(sandbox.__calls.saved, 1);
            const [db, event, args] = sandbox.__calls.broadcast;
            assert.strictEqual(`${db}:${event}:${args[0]}`, 'core:onResolveSchema:3');
            assert.ok(args[1].organisation.columns[0].branding);
        });
    });
});
