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

const plain = value => JSON.parse(JSON.stringify(value));

describe('schema import', function () {
    describe('CSV round trip', function () {
        let sandbox;
        before(function () {
            sandbox = sandboxWith(['src/utils/common.js', 'src/core/import-export/export.core.js', 'src/core/import-export/import.core.js'], '',
                'globalThis.__exp = jExport; globalThis.__imp = JImportHelper;');
        });

        it('keeps commas, quotes, newlines and objects in values and maps them by column', function () {
            const exp = sandbox.__exp.handlers.csv('app', true);
            exp.put('users', ['name:VARCHAR', 'age:number', 'meta:object'], [
                { _ref: 'r1', _data: { age: 30, name: 'Doe, "Jo"\nline', meta: { a: 1, b: [1, 2] } } },
                { _ref: 'r2', _data: { name: 'Al' } }
            ]);
            exp.put('empty', ['id:number'], []);
            const schema = plain(sandbox.__imp.csv(exp.close().print()));

            assert.deepStrictEqual(schema.users.definition, { name: { type: 'VARCHAR' }, age: { type: 'number' }, meta: { type: 'object' } });
            assert.deepStrictEqual(schema.users.crud.transactions[0].data, [
                { name: 'Doe, "Jo"\nline', age: 30, meta: { a: 1, b: [1, 2] } },
                { name: 'Al', age: null, meta: null }
            ]);
            assert.deepStrictEqual(schema.empty, { type: 'create', definition: { id: { type: 'number' } } });
        });

        it('keeps string columns as strings', function () {
            const schema = plain(sandbox.__imp.csv('t\nref,code:VARCHAR,n:number\n1,007,007'));
            assert.deepStrictEqual(schema.t.crud.transactions[0].data, [{ code: '007', n: 7 }]);
        });

        it('drops blank and comment lines from JQL', function () {
            assert.deepStrictEqual(Array.from(sandbox.__imp.jql('/** JQL **/\n\ncreate -a -[{}]\r\n  \n/** end **/\ninsert -[] -a')),
                ['create -a -[{}]', 'insert -[] -a']);
        });
    });

    describe('CoreSchemaProcessService', function () {
        function setup(existing) {
            const sandbox = sandboxWith(['src/utils/common.js', 'src/core/application/database/schema/schema.crud.js', 'src/core/application/database/schema/process.schema.js'], [
                `globalThis.__tables = new Set(${JSON.stringify(existing || [])});`,
                'globalThis.__calls = { created: [], queries: [], dropped: [] };',
                'privateApi = { tableExists: function (db, tbl) { return __tables.has(tbl); } };'
            ].join('\n'), [
                'globalThis.__core = {',
                '  name: "app",',
                '  createTbl: function (tbl, def, cfg) { __tables.add(tbl); __calls.created.push([tbl, def, cfg]); return { message: "Table(" + tbl + ") created successfully" }; },',
                '  table: function (tbl) { return { columns: { id: { type: "number" } }, drop: function () { __tables.delete(tbl); __calls.dropped.push(tbl); }, alter: { add: {} } }; },',
                '  jQl: function (query, h, params) { __calls.queries.push([query, params[0]]); return params[0] === "bad" ? Promise.reject({ message: "boom" }) : Promise.resolve({ message: "ok" }); }',
                '};',
                'globalThis.__run = function (data, options) { data = JSON.parse(data); return new Promise(function (resolve) { var s = new CoreSchemaProcessService(__core, options && JSON.parse(options)); s.process(data, function () { s.processCrud(function (logs, journal) { resolve({ logs: logs, journal: journal }); }); }); }); };',
                'globalThis.__plan = function (data, skip) { return CoreSchemaProcessService.plan(__core, JSON.parse(data), skip); };'
            ].join('\n'));
            return sandbox;
        }

        const rows = [{ name: 'a' }];
        const create = { type: 'create', definition: [{ name: { type: 'VARCHAR' } }], additionalConfig: { primaryKey: 'id', _hash: 'old', lastSyncedDate: 1, lastModified: 2 }, crud: { transactions: [{ type: 'insert', data: rows }] } };

        it('creates new tables, strips sync bookkeeping and keeps their rows local until synced', async function () {
            const sandbox = setup();
            const { journal } = await sandbox.__run(JSON.stringify({ users: create }));
            assert.deepStrictEqual(plain(journal), { created: ['users'], skipped: [], altered: [], errors: [] });
            assert.deepStrictEqual(plain(sandbox.__calls.created[0][2]), { primaryKey: 'id' });
            assert.deepStrictEqual(plain(sandbox.__calls.queries), [['insert -%1% -%0% -ignoreSync', 'users']]);
        });

        it('skips an existing table together with its rows', async function () {
            const sandbox = setup(['users']);
            const { journal } = await sandbox.__run(JSON.stringify({ users: create }));
            assert.deepStrictEqual(plain(journal.skipped), ['users']);
            assert.strictEqual(sandbox.__calls.created.length, 0);
            assert.strictEqual(sandbox.__calls.queries.length, 0);
        });

        it('appends rows to an existing table only when asked, pushing them live', async function () {
            const sandbox = setup(['users']);
            await sandbox.__run(JSON.stringify({ users: create }), JSON.stringify({ skipExisting: false }));
            assert.deepStrictEqual(plain(sandbox.__calls.queries), [['insert -%1% -%0%', 'users']]);
        });

        it('clones, drops and records failures without stopping', async function () {
            const sandbox = setup(['src', 'old']);
            const { journal } = await sandbox.__run(JSON.stringify({
                copy: { type: 'clone', from: 'src' },
                old: { type: 'drop' },
                missing: { type: 'truncate' },
                bad: { type: 'crud', transactions: [{ type: 'insert', data: rows }] },
                next: create
            }));
            assert.deepStrictEqual(plain(sandbox.__calls.created.map(c => [c[0], c[1]])), [['copy', { id: { type: 'number' } }], ['next', create.definition]]);
            assert.deepStrictEqual(plain(sandbox.__calls.dropped), ['old']);
            assert.deepStrictEqual(plain(journal.created), ['copy', 'next']);
            assert.deepStrictEqual(plain(journal.errors.map(e => e.table)), ['missing', 'bad']);
        });

        it('plans without changing anything', function () {
            const sandbox = setup(['users']);
            const plan = plain(sandbox.__plan(JSON.stringify({ users: create, posts: create, users2: { type: 'drop' } })));
            assert.deepStrictEqual(plan.map(p => [p.table, p.skipped, p.rows, p.destructive]), [
                ['users', true, 0, false], ['posts', false, 1, false], ['users2', false, 0, true]
            ]);
            assert.strictEqual(sandbox.__calls.created.length, 0);
        });
    });

    describe('import().fromText (JQL)', function () {
        function setup(existing) {
            return sandboxWith([
                'src/utils/common.js',
                'src/core/application/database/transactions/querybuilder.js',
                'src/core/helpers/promise.core.js',
                'src/core/adapters/core.plugins.js',
                'code:Database = { plugins: PluginsInstance };',
                'src/core/import-export/import.core.js',
                'src/core/application/database/index.js',
                'src/plugins/create.plugins.js',
                'src/plugins/insert.plugins.js'
            ], '', [
                `globalThis.__tables = new Set(${JSON.stringify(existing || [])});`,
                'globalThis.__queries = [];',
                'privateApi = { tableExists: function (db, tbl) { return __tables.has(tbl); } };',
                'globalThis.__instance = Object.create(DatabaseInstance.prototype); __instance.name = "app";',
                '__instance.jQl = function (q) { __queries.push(q); if (/^create -(\\w+)/.test(q)) __tables.add(RegExp.$1); return /bad/.test(q) ? Promise.reject({ message: "boom" }) : Promise.resolve({ result: { message: "ok" } }); };'
            ].join('\n'));
        }

        const text = ['/** JQL **/', 'create -users -[{"name":{"type":"VARCHAR"}}]', 'insert -[{"name":"a"}] -users  -hard',
            'create -logs -[{}]', 'insert -[{"x":1}] -logs  -hard', 'bad -line'].join('\n');

        it('skips existing tables with their rows, keeps new rows local and reports errors', async function () {
            const sandbox = setup(['logs']);
            const res = plain(await sandbox.__instance.import(null, true, {}).fromText(text, 'jql'));
            assert.deepStrictEqual(plain(sandbox.__queries), [
                'create -users -[{"name":{"type":"VARCHAR"}}]',
                'insert -[{"name":"a"}] -users  -hard -ignoreSync',
                'bad -line'
            ]);
            assert.deepStrictEqual(res.result.created, ['users']);
            assert.deepStrictEqual(res.result.skipped, ['logs']);
            assert.strictEqual(res.result.errors.length, 1);
            assert.strictEqual(res.result.message, 'Completed with 1 error(s)');
        });

        it('previews the same plan without running anything', function () {
            const sandbox = setup(['logs']);
            const plan = plain(sandbox.__instance.import(null, true, {}).preview(text, 'jql'));
            assert.deepStrictEqual(plan.map(p => [p.action, p.table, p.skipped]), [
                ['create', 'users', false], ['insert', 'users', false], ['create', 'logs', true], ['insert', 'logs', true], ['bad', null, false]
            ]);
            assert.strictEqual(sandbox.__queries.length, 0);
        });

        it('rejects an unsupported format', async function () {
            const sandbox = setup();
            await assert.rejects(sandbox.__instance.import(null, true, {}).fromText('x', 'xml'), err => err.message === 'Unsupported File Format');
        });
    });

    describe('sync push', function () {
        function setup() {
            return sandboxWith(['src/connectors/sync/helpers.js'], '', [
                'globalThis.__calls = [];',
                'syncHelper.setMessage = function () {};',
                'DatabaseSyncConnector = { coreApi: {',
                '  getTable: function () { return { TBL_NAME: "users", columns: [{}], data: { insert: [{ a: 1 }] } }; },',
                '  buildHttpRequestOptions: function (app, opts) { return opts; },',
                '  $http: function (opts) { __calls.push(["http", opts.path, JSON.stringify(opts.data)]); return Promise.resolve({ ok: true }); },',
                '  autoSync: function (app, tbl, type) { __calls.push(["autoSync", tbl, type]); return Promise.resolve({ _hash: "h2" }); }',
                '} };', 'globalThis.__sync = syncHelper;'
            ].join('\n'));
        }

        it('sends the schema only, then pushes pending records through /database/push', async function () {
            const sandbox = setup();
            const res = await sandbox.__sync.push('app', 'users', true);
            assert.deepStrictEqual(plain(sandbox.__calls), [
                ['http', '/database/sync', JSON.stringify({ TBL_NAME: 'users', columns: [{}] })],
                ['autoSync', 'users', 'insert']
            ]);
            assert.deepStrictEqual(plain(res), { ok: true, _hash: 'h2' });
        });

        it('does not push records unless data syncing was requested', async function () {
            const sandbox = setup();
            await sandbox.__sync.push('app', 'users', false);
            assert.deepStrictEqual(plain(sandbox.__calls).map(c => c[0]), ['http']);
        });
    });

    describe('migration files', function () {
        function setup(existing) {
            return sandboxWith([
                'src/utils/common.js',
                'src/core/application/database/transactions/querybuilder.js',
                'src/core/helpers/promise.core.js',
                'src/core/adapters/core.plugins.js',
                'code:Database = { plugins: PluginsInstance };',
                'src/core/import-export/import.core.js',
                'src/core/application/database/schema/schema.crud.js',
                'src/core/application/database/schema/process.schema.js',
                'src/core/application/database/index.js'
            ], '', [
                `globalThis.__tables = new Set(${JSON.stringify(existing || [])});`,
                'privateApi = { tableExists: function (db, tbl) { return __tables.has(tbl); } };',
                'globalThis.__instance = Object.create(DatabaseInstance.prototype); __instance.name = "app";',
                'globalThis.__imp = JImportHelper;'
            ].join('\n'));
        }

        const migration = JSON.stringify([
            { type: 'create', config: { name: 'viewings', columns: { uid: { type: 'string', required: true } } } },
            { type: 'create', config: { schema: { TBL_NAME: 'roles', columns: [{ id: { type: 'string' } }], primaryKey: 'id', index: { id: { unique: true } } }, records: [{ id: 'owner' }] } },
            { type: 'rename', config: { collections: { old: 'renamed' } } },
            { type: 'drop', config: { collections: ['gone'] } },
            { type: 'alter', config: { name: 'roles', columns: [{ type: 'column', name: 'label', definition: { type: 'string' } }] } },
            { type: 'rebuildIndex', config: { collections: ['roles'] } }
        ]);

        it('converts every operation to the import format', function () {
            const sandbox = setup();
            const data = plain(sandbox.__imp.migration(JSON.parse(migration)));
            assert.deepStrictEqual(data.viewings, [{ type: 'create', definition: { uid: { type: 'string', required: true } }, additionalConfig: {} }]);
            assert.deepStrictEqual(data.roles.map(op => op.type), ['create', 'alter', 'rebuildIndex']);
            assert.deepStrictEqual(data.roles[0].additionalConfig, { primaryKey: 'id', index: { id: { unique: true } } });
            assert.deepStrictEqual(data.roles[0].crud.transactions[0].data, [{ id: 'owner' }]);
            assert.strictEqual(data.roles[2].serverOnly, true);
            assert.deepStrictEqual(data.old, [{ type: 'rename', name: 'renamed' }]);
            assert.deepStrictEqual(data.gone, [{ type: 'drop' }]);
        });

        it('previews a migration file with real table names instead of unknown rows', function () {
            const sandbox = setup(['old', 'gone']);
            const plan = plain(sandbox.__instance.import(null, true, {}).preview(migration, 'json'));
            assert.deepStrictEqual(plan.map(p => [p.table, p.action, p.skipped, p.destructive]), [
                ['viewings', 'create', false, false],
                ['roles', 'create', false, false],
                ['roles', 'alter', false, true],
                ['roles', 'rebuildindex', true, false],
                ['old', 'rename', false, true],
                ['gone', 'drop', false, true]
            ]);
            assert.strictEqual(plan[3].serverOnly, true);
        });

        it('rejects any other top-level array with a clear message', async function () {
            const sandbox = setup();
            assert.throws(() => sandbox.__instance.import(null, true, {}).preview('[{"name":"users"}]', 'json'), /Unsupported schema format/);
            await assert.rejects(sandbox.__instance.import(null, true, {}).fromText('[1,2]', 'json'), err => /Unsupported schema format/.test(err.message));
        });
    });
});
