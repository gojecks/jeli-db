const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/**
 * The app is a set of global scripts (no module system), concatenated at
 * build time by grunt. class/const/let declarations don't attach to a vm
 * context's global object, and objects crossing the vm/host realm boundary
 * fail the app's own `isobject()` (instanceof) checks -- so everything here,
 * including the test assertions' setup code, runs inside ONE vm realm.
 */
function loadSandbox() {
    const appSrc = [
        read('src/utils/common.js'),
        read('src/core/application/database/transactions/querybuilder.js'),
        read('src/core/helpers/promise.core.js'),
        read('src/core/adapters/core.plugins.js'),
        'Database = { plugins: PluginsInstance };',
        // jQl() reads DB config through the app-wide privateApi; these DBs don't load their schema from a server
        'privateApi = { getConfigData: function () { return false; } };',
        read('src/core/application/database/index.js'),
        read('src/plugins/insert.plugins.js'),
        read('src/plugins/update.plugins.js'),
        read('src/plugins/delete.plugins.js'),
        read('src/plugins/batch.plugin.js'),
        read('src/plugins/drop.plugins.js'),
        read('src/plugins/env.sync.plugin.js'),
        read('src/plugins/env.import.plugin.js'),
        read('src/plugins/truncate.plugin.js'),
        read('src/plugins/cs.plugins.js'),
        read('src/plugins/env.cls.plugin.js'),
        read('src/plugins/env.help.plugin.js'),
        read('src/plugins/api.plugin.js'),
        read('src/plugins/create.plugins.js'),
        read('src/plugins/schema.js'),
        read('src/plugins/env.plugins.js'),
        read('src/plugins/env.export.plugin.js'),
        read('src/plugins/alter.plugins.js'),
        read('src/plugins/select.plugins.js'),
        // synthetic plugin for the "disabled command" test -- registered here
        // (in-realm) rather than from host code, since the plugins registry's
        // own isobject() check does an `instanceof Object` that a host-realm
        // object literal fails across the vm/host realm boundary
        "Database.plugins.jQl('disabledcmd', { disabled: true, fn: function () { return function () {}; } });",
        'globalThis.__BaseInstance = BaseInstance;',
        'globalThis.__Database = Database;',
        'globalThis.__QueryBuilder = QueryBuilder;',
        // lets host test code hand in an object-form jQl task without
        // tripping the same cross-realm instanceof check: JSON.parse here
        // runs inside this realm, so it builds a same-realm plain object
        'globalThis.__mk = function (obj) { return JSON.parse(JSON.stringify(obj)); };',
    ].join('\n;\n');

    const sandbox = { console, setTimeout, clearTimeout };
    vm.createContext(sandbox);
    vm.runInContext(appSrc, sandbox, { filename: 'jdb-app.js' });
    return sandbox;
}

// Real plugin fn's need a live DB context (db.transaction(...), db.table(...), ...)
// that a bare BaseInstance doesn't have. These tests validate dispatch/schema
// resolution -- what jQl hands to a plugin's fn -- not the plugin bodies
// themselves, so every plugin's fn is swapped for a probe that just echoes
// the resolved query back.
function probe(query, handler) {
    return function (db) { handler.onSuccess(query); };
}

function withProbes(sandbox, names) {
    names.forEach(name => {
        sandbox.__Database.plugins.get(name).fn = probe;
    });
}

describe('BaseInstance#jQl', function () {
    let sandbox, instance;

    before(function () {
        sandbox = loadSandbox();
        instance = Object.create(sandbox.__BaseInstance.prototype);
        withProbes(sandbox, [
            'insert', 'update', 'updatemany', 'delete', 'batch', 'drop', 'sync',
            'import', 'truncate', 'truncate-db', 'cs', 'help', 'api', 'create',
            'schema', 'env', 'export', 'alter', 'select'
        ]);
    });

    describe('dispatch fixes', function () {
        it('rejects unknown commands with onError instead of throwing/hanging', async function () {
            await assert.rejects(instance.jQl('bogus -x'), { message: /Invalid command/ });
        });

        it('rejects disabled commands via onError (not the old broken .error)', async function () {
            await assert.rejects(instance.jQl('disabledcmd -x'), { message: /disabled/ });
        });

        it('enforces requiresParam by actual argument count, not command-name length', async function () {
            // 'cs' is a 2-char command with requiresParam:true; before the fix,
            // `taskType.length < 2` never fired for any real command name.
            await assert.rejects(instance.jQl('cs'), { message: /requires parameters/ });
        });

        it('does not hang when a task in a multi-task array fails to dispatch', async function () {
            const result = await Promise.race([
                instance.jQl(['insert -{"a":1} -users', 'bogus -x']),
                new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 2000))
            ]);
            assert.ok(result);
        });
    });

    describe('schema resolution kinds', function () {
        it('position: reads a positional token by declared index (insert)', async function () {
            const q = await instance.jQl('insert -{"name":"Ada"} -users');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.data.name, 'Ada');
        });

        it('flag: resolves by name-presence anywhere in the query, case-insensitively (the matchWord fix)', async function () {
            const q = await instance.jQl('insert -{"name":"Ada"} -users -ignoreSync -hard');
            assert.strictEqual(q.ignoreSync, true);
            assert.strictEqual(q.hard, true);
            assert.strictEqual(q.rollbackOnError, false, 'absent flags must resolve to false, not stay undefined');
        });

        it('flag: still resolves correctly for a legacy-shaped plugin (delete, mixed position+flag)', async function () {
            const q = await instance.jQl('delete -users -age>18 -true -rollbackOnError');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.cond, 'age>18');
            assert.strictEqual(q.rollbackOnError, true);
        });

        it('const: always resolves to the declared value regardless of input (updatemany.isMany, truncate-db.db)', async function () {
            const qm = await instance.jQl('updatemany -users -[{"name":"Ada"}]');
            assert.strictEqual(qm.isMany, true);

            const qt = await instance.jQl('truncate-db -true');
            assert.strictEqual(qt.db, true);
        });

        it('default: fills in a value when the position is omitted (export)', async function () {
            const q = await instance.jQl('export -users');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.type, 'json', 'declared default should apply when omitted');
            assert.strictEqual(q.action, 'print');
        });

        it('default: is overridden when the value is actually provided (export)', async function () {
            const q = await instance.jQl('export -users -csv -d -myfile -MyTitle');
            assert.strictEqual(q.type, 'csv');
            assert.strictEqual(q.action, 'd');
            assert.strictEqual(q.fileName, 'myfile');
            assert.strictEqual(q.title, 'MyTitle');
        });

        it('rest + raw: collects every remaining token unparsed (alter action args)', async function () {
            const q = await instance.jQl('alter -users -a -c -age -{"type":"number"}');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.action, 'a');
            // per-element checks, not deepStrictEqual: q.args is a vm-realm
            // Array (different Array.prototype than this file's), so strict
            // deep equality against a host-realm array literal always fails
            // on the prototype-identity check even when contents match
            assert.strictEqual(q.args.length, 3);
            assert.strictEqual(q.args[0], 'c');
            assert.strictEqual(q.args[1], 'age');
            assert.strictEqual(q.args[2], '{"type":"number"}');
        });

        it('rest + raw: feeds untouched tokens into QueryBuilder.buildSelectQuery (select clauses)', async function () {
            sandbox.__Database.plugins.get('select').fn = function (query, handler) {
                return function (db) {
                    handler.onSuccess({
                        fields: query.fields,
                        table: query.table,
                        built: sandbox.__QueryBuilder.buildSelectQuery(query.clauses, 0)
                    });
                };
            };
            const q = await instance.jQl('select -* -users -where(name~John) -limit(10)');
            assert.strictEqual(q.fields, '*');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.built.where, 'name~John');
            assert.strictEqual(q.built.limit, 10);
        });

        it('object form: bypasses string parsing entirely and applies the same flag/const rules', async function () {
            const q = await instance.jQl(sandbox.__mk({ command: 'insert', data: { name: 'Grace' }, table: 'users', rollbackOnError: true }));
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.data.name, 'Grace');
            assert.strictEqual(q.rollbackOnError, true);
            assert.strictEqual(q.ignoreSync, false, 'unset flags still default to false in object form');
        });
    });

    describe('schema field types', function () {
        it("type:'string' skips JSON coercion -- a numeric-looking table name stays a string", async function () {
            // without a declared type, jSonParser would turn "123" into the
            // number 123, since it's valid JSON; 'table' is typed 'string'
            // specifically to prevent that
            const q = await instance.jQl('insert -{"name":"Ada"} -123');
            assert.strictEqual(q.table, '123');
            assert.strictEqual(typeof q.table, 'string');
        });

        it("type:'boolean' rejects a value that isn't actually a boolean (V1)", async function () {
            await assert.rejects(
                instance.jQl('import -users -json -notABoolean'),
                { message: /field 'isSchema' expected boolean/ }
            );
        });

        it("type:'boolean' rejects a value that isn't actually a boolean (V2)", async function () {
            await assert.rejects(
                instance.jQl('import --table=users --fileType=json --isSchema=notABoolean'),
                { message: /field 'isSchema' expected boolean/ }
            );
        });

        it("type:'array' rejects a non-array value (batch.transactions)", async function () {
            await assert.rejects(
                instance.jQl('batch -{"type":"insert"}'),
                { message: /field 'transactions' expected array/ }
            );
        });

        it("type:'object' rejects a non-object value (update.data)", async function () {
            await assert.rejects(
                instance.jQl('update -users -"not an object" -age>18'),
                { message: /field 'data' expected object/ }
            );
        });

        it('omitted typed fields still fall through to default/undefined without triggering validation', async function () {
            // 'force' is typed boolean but has no default -- omitting it
            // entirely must not throw just because undefined isn't a boolean
            const q = await instance.jQl('sync -users');
            assert.strictEqual(q.force, undefined);
        });

        it('object-form calls validate too, and coerce non-strings for type:"string" fields', async function () {
            await assert.rejects(
                instance.jQl(sandbox.__mk({ command: 'update', table: 'users', data: 'nope', cond: 'age>18' })),
                { message: /field 'data' expected object/ }
            );

            const q = await instance.jQl(sandbox.__mk({ command: 'insert', data: { name: 'Ada' }, table: 123 }));
            assert.strictEqual(q.table, '123');
        });
    });

    describe('V2 syntax (--flag=value), auto-detected per query string', function () {
        it('a plain V1 query is untouched -- no "--" boundary means legacy tokenizer runs', async function () {
            const q = await instance.jQl('insert -{"name":"Ada"} -users -ignoreSync');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.ignoreSync, true);
        });

        it('a "--" sequence inside quoted JSON data does not get misdetected as V2', function () {
            // this is the one real ambiguity in string-sniffing: an inert "--"
            // that's inside quotes/braces must never be treated as a flag
            // boundary. Checking detection directly here (rather than the
            // end-to-end resolved value) because this exact string routes to
            // the *existing* V1 tokenizer either way, and V1's own
            // quote-blind regex split has its own pre-existing, unrelated bug
            // with whitespace-then-dash inside quoted/braced values (same
            // class as the documented `{"score": -5}` case) -- not something
            // this V2 work introduced or is responsible for fixing.
            const isV2 = sandbox.__QueryBuilder.isV2Query('insert -{"note":"see --verbose flag"} -users');
            assert.strictEqual(isV2, false);
        });

        it('position-equivalent fields resolve by name instead of position (insert)', async function () {
            const q = await instance.jQl('insert --data={"name":"Ada"} --table=users');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.data.name, 'Ada');
        });

        it('flag: bare --name resolves to true, absent resolves to false', async function () {
            const q = await instance.jQl('insert --data={"name":"Ada"} --table=users --ignoreSync --hard');
            assert.strictEqual(q.ignoreSync, true);
            assert.strictEqual(q.hard, true);
            assert.strictEqual(q.rollbackOnError, false);
        });

        it('const: still resolves to the declared value, ignoring whatever was actually passed', async function () {
            const q = await instance.jQl('updatemany --table=users --data=[{"name":"Ada"}]');
            assert.strictEqual(q.isMany, true);
        });

        it('default: still fills in a value when omitted', async function () {
            const q = await instance.jQl('export --table=users');
            assert.strictEqual(q.type, 'json');
            assert.strictEqual(q.action, 'print');
        });

        it('rest: unmatched flags are rebuilt as "name(value)" so buildSelectQuery keeps working unchanged (select)', async function () {
            sandbox.__Database.plugins.get('select').fn = function (query, handler) {
                return function (db) {
                    handler.onSuccess({
                        fields: query.fields,
                        table: query.table,
                        built: sandbox.__QueryBuilder.buildSelectQuery(query.clauses, 0)
                    });
                };
            };
            const q = await instance.jQl('select --fields=* --table=users --where=name~John --limit=10');
            assert.strictEqual(q.fields, '*');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.built.where, 'name~John');
            assert.strictEqual(q.built.limit, 10);
        });

        it('known limitation: alter\'s rest args are positional-by-meaning, so V2 does not resolve them correctly yet', async function () {
            // this documents current (imperfect) behavior rather than asserting
            // correctness: alterPluginFn expects args[0]/args[1]/args[2] as bare
            // ordered values (sub-action, column name, config), but the generic
            // V2 rest-adapter can only produce "name(value)" pairs from
            // explicitly-named flags -- there's no positional-order concept in
            // named syntax. V2 support for 'alter' needs its own field design
            // (e.g. --subAction=c --column=age --config={...}), not just this
            // generic mechanism. V1 alter usage is completely unaffected.
            sandbox.__Database.plugins.get('alter').fn = probe;
            const q = await instance.jQl('alter --table=users --action=a --c=age');
            assert.strictEqual(q.table, 'users');
            assert.strictEqual(q.action, 'a');
            assert.deepStrictEqual(Array.from(q.args), ['c(age)']);
        });
    });

    describe('every registered plugin resolves its declared schema', function () {
        const cases = [
            ['insert -{"name":"Ada"} -users -hard', q => q.data.name === 'Ada' && q.table === 'users' && q.hard === true],
            ['update -users -{"name":"Ada"} -age>18 -ignoreSync', q => q.table === 'users' && q.cond === 'age>18' && q.ignoreSync === true],
            ['batch -[{"type":"insert"}] -rollbackOnError', q => Array.isArray(q.transactions) && q.rollbackOnError === true],
            ['drop -t -users -yes -true', q => q.type === 't' && q.name === 'users' && q.flag === 'yes' && q.localOnly === true],
            ['sync -users -true', q => q.table === 'users' && q.force === true],
            ['import -users -json -true', q => q.table === 'users' && q.fileType === 'json' && q.isSchema === true],
            ['truncate -users -yes', q => q.table === 'users' && q.flag === 'yes'],
            ['cs -x', q => q.command === 'cs'],
            ['help -insert', q => q.target === 'insert'],
            ['create -users -[{"name":"id"}]', q => q.table === 'users' && Array.isArray(q.columns)],
            ['schema -add -{"v":1}', q => q.action === 'add' && q.arg.v === 1],
            ['env -myMethod -myArg', q => q.method === 'myMethod' && q.arg === 'myArg'],
        ];

        cases.forEach(([queryStr, check]) => {
            it('`' + queryStr + '`', async function () {
                const q = await instance.jQl(queryStr);
                assert.ok(check(q), 'unexpected resolved query: ' + JSON.stringify(q));
            });
        });

        it('`cls` (no fields declared, resolves via probe-free real plugin)', async function () {
            const q = await instance.jQl('cls');
            assert.strictEqual(q.result.message, true);
        });

        it('`api -/path -{"a":1}` (path/data resolved and handed to db.api)', async function () {
            sandbox.__Database.plugins.get('api').fn = function (query, handler) {
                return function (db) { handler.onSuccess({ path: query.path, data: query.data }); };
            };
            const q = await instance.jQl('api -/some/path -{"a":1}');
            assert.strictEqual(q.path, '/some/path');
            assert.strictEqual(q.data.a, 1);
        });
    });
});
