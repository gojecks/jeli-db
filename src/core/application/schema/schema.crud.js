/**
 * 
 * @param {*} core 
 */
function SchemaCrudProcess(core) {
    this.task = {};
    this.db = core;

    this.addTask = function(table, definition) {
        if (definition && table) {
            if (this.task.hasOwnProperty(table)) {
                this.task[table].transactions.push.apply(this.task[table].transactions, definition.transactions);
            } else {
                this.task[table] = definition;
            }
        }
    }
}

SchemaCrudProcess.prototype.process = function(next) {
    /**
     * check for crudTask before finalizing
     */
    var tables = Object.keys(this.task);
    var processNext = () => {
        if (tables.length) {
            var tableName = tables.shift();
            processCRUD(tableName);
        } else {
            next();
        }
    };

    /**
     * 
     * @param {*} data 
     * @param {*} conf 
     * @param {*} tableName 
     */
    var performCrud = (data, conf, tableName) => {
        var query = {
            insert: 'insert -%1% -%0%',
            update: 'update -%0% -%1% -%2%',
            delete: "delete -%0% -%1%",
            batch: 'batch -%data%',
            insertreplace: 'insert -%1% -%0% -replace -%2%'
        }[conf.type];

        if (conf.skipDataProcessing) {
            query += " -skip";
        }

        this.db.jQl(query, null, [tableName, data, conf.column || conf.query])
        .then(res => nextCRUD(res, tableName), res => nextCRUD(res, tableName));
    }

    /**
     * 
     * @param {*} res 
     * @param {*} tableName 
     */
    var nextCRUD = (res, tableName) => {
        console.group("JDB CRUD");
        console.log(res);
        console.groupEnd();
        processCRUD(tableName);
    };


    /**
     * 
     * @param {*} current 
     */
    var processCRUD = (tableName)  => {
        var conf = this.task[tableName].transactions.shift();
        if (!conf) {
            return processNext();
        }

        if (conf.filePath) {
            this.fetch(conf.filePath)
                .then(data => performCrud(data, conf, tableName), function(res) {
                    nextCRUD({
                        message: "Failed for (" + tableName + ") table: unable to retrieve data from: " + conf.filePath,
                        status: res.status
                    });
                });
        } else if (conf.data || conf.query) {
            performCrud((conf.data || conf.query), conf, tableName);
        } else if (conf.replicate && conf.replicate.table) {
            var query = "select -* -%table%";
            if (conf.replicate.query) {
                query += " -where(%query%)";
            }
            /**
             * query the DB and insert the records
             */
            this.db.jQl(query, null, conf.replicate)
            .then(res => performCrud(res.getResult(), conf, tableName),res => nextCRUD(res, tableName));
        } else {
            nextCRUD({
                message: "No task to perform"
            }, tableName);
        }
    }

    processNext();
};

SchemaCrudProcess.prototype.fetch = function(url) {
    return fetch(url).then(res => res.json());
}