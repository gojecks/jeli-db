const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const hasSqlite = (() => { try { execFileSync('sqlite3', ['-version']); return true; } catch (e) { return false; } })();

// stands in for cordova's sqlitePlugin: each statement runs through the sqlite3 CLI against a temp file
function fakeSqlitePlugin(dir) {
    let pending = 0;
    const literal = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
    const bind = (sql, args) => { let i = 0; return sql.replace(/\?/g, () => literal(args[i++])); };
    function run(file, sql) {
        const out = execFileSync('sqlite3', ['-json', file, sql], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
        const rows = out ? JSON.parse(out) : [];
        return { rows: { length: rows.length, item: i => rows[i] } };
    }
    return {
        idle: () => new Promise(resolve => { const check = () => pending ? setTimeout(check, 2) : resolve(); check(); }),
        openDatabase(options) {
            const file = path.join(dir, options.name);
            return {
                transaction(callback, onError, onSuccess) {
                    pending++;
                    setTimeout(() => {
                        const queue = [];
                        const tx = { executeSql: (sql, args, ok, fail) => queue.push([sql, args || [], ok, fail]) };
                        try {
                            callback(tx);
                            while (queue.length) {
                                const [sql, args, ok, fail] = queue.shift();
                                let res;
                                try { res = run(file, bind(sql, args)); } catch (e) {
                                    if (!fail || fail(tx, { message: String(e.stderr || e.message) }) !== false) throw e;
                                    continue;
                                }
                                ok && ok(tx, res);
                            }
                            onSuccess && onSuccess();
                        } catch (e) {
                            onError && onError(e);
                        } finally {
                            pending--;
                        }
                    });
                }
            };
        }
    };
}

(hasSqlite ? describe : describe.skip)('sql adapter', function () {
    this.timeout(20000);
    let dir, plugin, sandbox;

    const storageUtils = {
        storeMapping: { resourceName: '_r_', pendingSync: '_l_', nextSchemaSyncDate: '_nsd_' },
        generateStruct: cache => ({ version: cache.get('version'), tables: {} })
    };
    const open = name => new Promise(resolve => {
        const adapter = sandbox.SqlAdapter({ name: name || 'app', location: 'default', key: 'k' }, storageUtils, () => resolve(adapter));
    });
    const usersTable = () => ({
        TBL_NAME: 'users', DB_NAME: 'app', lastInsertId: 0,
        columns: [{ name: {}, zip: {}, age: {}, active: {}, meta: {}, order: {} }]
    });
    async function seed(rows) {
        const db = await open();
        db.broadcast('onResolveSchema', [1, { users: usersTable() }]);
        db.setItem('_r_', { resourceManager: { users: {} } });
        db.broadcast('insert', ['users', rows, true]);
        await plugin.idle();
        return db;
    }
    const reopenRows = async () => plain((await open()).getItem('users:data'));
    const ann = () => ({ _id: 'r1', name: 'Ann', zip: '00123', age: 30, active: true, meta: { tags: ['a'] }, order: 1 });
    const bob = () => ({ _id: 'r2', name: '123', zip: 'null', age: null, active: false, meta: null, order: 2 });

    beforeEach(function () {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jdb-sql-'));
        plugin = fakeSqlitePlugin(dir);
        sandbox = { console, setTimeout, window: { sqlitePlugin: plugin } };
        vm.createContext(sandbox);
        const source = ['packages/sql-adapter/src/utils.js', 'packages/sql-adapter/src/sql.facade.js', 'packages/sql-adapter/index.js'].map(read);
        vm.runInContext(source.concat(['globalThis.SqlAdapter = SqlAdapter;']).join('\n;\n'), sandbox);
    });

    afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

    it('opens with a Map-backed store for generateStruct', async function () {
        const db = await open();
        db.setItem('version', 3);
        await plugin.idle();
        assert.strictEqual(db.getItem().version, 3);
    });

    it('reloads inserted rows with their original types', async function () {
        await seed([ann(), bob()]);
        assert.deepStrictEqual(await reopenRows(), [ann(), bob()]);
    });

    it('persists updates using the in-memory row', async function () {
        const db = await seed([ann(), bob()]);
        db.getItem('users:data')[0].name = 'Anna';
        db.broadcast('update', ['users', [{ _id: 'r1', name: 'Anna' }]]);
        await plugin.idle();
        assert.strictEqual((await reopenRows())[0].name, 'Anna');
    });

    it('persists deletes and truncates', async function () {
        const db = await seed([ann(), bob()]);
        db.broadcast('delete', ['users', ['r1']]);
        await plugin.idle();
        assert.deepStrictEqual((await reopenRows()).map(r => r._id), ['r2']);

        db.broadcast('onTruncateTable', ['users']);
        await plugin.idle();
        assert.deepStrictEqual(await reopenRows(), []);
    });

    it('adds, renames and drops columns', async function () {
        const db = await seed([ann()]);
        const definition = db.getItem('users');
        definition.columns[0].city = {};
        db.getItem('users:data')[0].city = 'Lagos';
        db.broadcast('onAlterTable', ['users', 'city', 1]);
        db.broadcast('onAlterTable', ['users', ['zip', 'postcode'], 0]);
        db.broadcast('onAlterTable', ['users', 'meta', 0]);
        definition.columns[0].postcode = definition.columns[0].zip;
        delete definition.columns[0].zip;
        delete definition.columns[0].meta;
        db.broadcast('onUpdateTable', ['users', { columns: definition.columns }]);
        await plugin.idle();
        const row = (await reopenRows())[0];
        assert.strictEqual(row.city, 'Lagos');
        assert.strictEqual(row.postcode, '00123');
        assert.ok(!('meta' in row) && !('zip' in row));
    });

    it('keeps rows and adds new columns when an existing table is re-resolved', async function () {
        const db = await seed([ann()]);
        const refreshed = usersTable();
        refreshed.columns[0].email = {};
        db.broadcast('onResolveSchema', [2, { users: refreshed }]);
        assert.strictEqual(db.getItem('users:data').length, 1);
        db.broadcast('insert', ['users', [Object.assign(bob(), { _id: 'r3', email: 'b@x.io' })], true]);
        await plugin.idle();
        const rows = await reopenRows();
        assert.deepStrictEqual(rows.map(r => r._id), ['r1', 'r3']);
        assert.strictEqual(rows[1].email, 'b@x.io');
    });

    it('loads tables larger than one page', async function () {
        await seed([]);
        execFileSync('sqlite3', [path.join(dir, 'app.db'), 'WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i < 2500) INSERT INTO users ("_ref", "name") SELECT \'r\' || i, \'"n\' || i || \'"\' FROM n;']);
        const rows = await reopenRows();
        assert.strictEqual(rows.length, 2500);
        assert.strictEqual(rows[2499].name, 'n2500');
    });

    it('renames a table', async function () {
        const db = await seed([ann()]);
        db.setItem('_r_', { resourceManager: { people: {} } });
        db.broadcast('onRenameTable', ['users', 'people']);
        await plugin.idle();
        const reopened = await open();
        assert.strictEqual(reopened.getItem('people').TBL_NAME, 'people');
        assert.strictEqual(reopened.isExists('users'), false);
        assert.strictEqual(plain(reopened.getItem('people:data'))[0].name, 'Ann');
    });

    it('renames the database into a new file', async function () {
        const db = await seed([ann()]);
        await new Promise(resolve => db.broadcast('onRenameDataBase', ['app', 'shop', resolve]));
        await plugin.idle();
        const renamed = await open('shop');
        assert.strictEqual(renamed.getItem('users').DB_NAME, 'shop');
        assert.strictEqual(plain(renamed.getItem('users:data'))[0].name, 'Ann');
        assert.strictEqual((await open('app')).getItem('users:data'), undefined);
    });
});
