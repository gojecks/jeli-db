var constants = {
    STORAGE: '_storage_',
    DATATYPES: 'dataTypes',
    RESOLVERS: 'resolvers',
    RESOURCEMANAGER: 'resourceManager',
    RECORDRESOLVERS: 'recordResolvers'
};

var DB_EVENT_NAMES = {
    RESOLVE_SCHEMA: 'onResolveSchema',
    CREATE_TABLE: 'onCreateTable',
    ALTER_TABLE: 'onAlterTable',
    DROP_TABLE: 'onDropTable',
    TRUNCATE_TABLE: 'onTruncateTable',
    RENAME_TABLE: 'onRenameTable',
    TRANSACTION_DELETE: 'delete',
    TRANSACTION_INSERT: 'insert',
    TRANSACTION_UPDATE: 'update',
    RENAME_DATABASE: 'onRenameDataBase',
    DROP_TABLE: 'onDropTable',
    UPDATE_TABLE: 'onUpdateTable'
};
/**
 * @internal
 */
var _globalInterceptors = new Map();