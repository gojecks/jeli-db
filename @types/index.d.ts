/**
 * jdb core interface
 */
export class jdb {
    constructor(db_name:String, version?:Number);
    open(options:IDBCoreOptions):IDBCorePromise;
    isClientMode():{open:Function; requiresLogin:Function};
    requiresLogin():{open:Function};
}

export interface IDBCoreOptions {
    disableApiLoading?:Boolean;
    isClientMode?:Boolean;
    isLoginRequired?:Boolean;
    serviceHost?:String;
    live?:Boolean;
    storage?:String;
    location?:String;
    key?:String;
    folderPath?:String;
    ajax?:Function;
    interceptor?:Function;
    organisation:String;
}

export interface IDBCorePromise {
    onSuccess(cb:Function): IDBCorePromise;
    onError(cb:Function): IDBCorePromise;
    then(cb:Function): IDBCorePromise;
    onUpgrade(cb:Function): IDBCorePromise;
}

export interface IDBPromise {
    then(succ:Function, err:Function):IDBPromise;
}

export interface IDBCoreEvent {
    message:String;
    mode:String;
    result:IDBApplicationInstance;
    errorCode?:Number;
}

export  class IDBApplicationInstance {
    constructor(appName:String, version: String, requiredMethods?:Array<String>);
    name:String;
    version:Number;
    env: {
        usage:Function;
        logger:Function;
        dataTypes:any;
        requestMapping:any;
        resource:Function;
        appKey?:Function;
    };
    onUpdate?:IDBApplicationRealtime;
    clientService?:IDBClientService;
    scheduler?:IDBApplicationScheduler;
    helpers:IDBCoreHelpers;
    close(flag?:Boolean):void;
    api(URL:String, postData?:any, tbl?:String):IDBPromise;
    createTable(name:String, columns:Array<any>):IDBCorePromise;
    drop(flag?:Boolean):IDBCorePromise;
    export(type:String, table:String):{initialize(title?:String):any};
    import(table:String, handler:IDBEventHandler):{getFile():any; getData():any}
    info():Array<IDBTableInfoSet>;
    jql(query:String, handler:IDBEventHandler, parser?:any):IDBCoreEvent;
    rename(newName:String):IDBPromise;
    sync():IDBCoreSync;
    table(name:String, mode:String): IDBCorePromise;
    transaction(table:String|Array<String>, mode?:String): IDBCorePromise;
    users(): IDBUsers;
}

export interface IDBUsers {
    add(userInfo:any);
    remove(userInfo:any);
    authorize(authorizeData:any);
    reAuthorize(authorizeData:any);
    updateUser(userInfo:any);
    validatePassword(userInfo:any);
    isExists(queryInfo:any);
    addAuthority(authorityInfo:any);
    removeAuthority(authorityInfo:any);
}

export interface IDBCoreTransaction {
    delete(query:String|any):this;
    insert(data:Array<any>):this;
    update(data:any, query?:any):this;
    select(selectFields:String, definition?:IDBCoreTransactionSelect):this;
    getColumn():Array<any>;
    qsl():any;
    execute():IDBCorePromise;
}

export interface IDBCoreTransactionSelect {
    where:String,
    like:String,
    limit:String,
    orderBy:String,
    groupBy:String,
    groupByStrict:String,
    ref:Boolean,
    join:Array<{
        table:String,
        on:String,
        type:String,
        where:any,
        feilds:any
    }>
}

export interface IDBTable {
    info:any;
    Alter:IDBTableAlter;
    columns:Array<any>;
    truncate(flag?:Boolean):IDBCoreEvent;
    drop(flag?:Boolean):IDBCoreEvent;
    onUpdate?:IDBApplicationRealtime;
}

export interface IDBTableAlter {
    drop(columnName):void;
    add:IDBTableAlterAdd;
    rename(newName):String;
}

export interface IDBTableAlterAdd {
    primary();
    unique();
    foreign();
    mode();
    column();
}


export interface IDBTableInfoSet {
    name:String;
    records:any;
    columns:Array<any>;
    primaryKey:any;
    foreignKey?: any;
    allowedMode:String;
    lastModified:Number|any;
}

export interface IDBEventHandler {
    onSuccess(fn:Function):void;
    onError(fn:Function):void;
}

export interface IDBCoreHelpers {}

export interface IDBTableColum {
    type:String;
    defaultValue?:any;
    AUTO_INCREMENT?:Boolean;
    PRIMARY_KEY?: any;
}

export interface IDBApplicationRealtime {
    once():void;
    disconnect():void;
    start():void;
    callback:Function;
    timer:Number;
    payload:any;
    types:Array<String>;
    trial:Number;
    url:String;
}

export interface IDBClientService {
    getByRef(tbl:String, query:IDBQuery):IDBPromise;
    getAll(tbl:String, query:IDBQuery):IDBPromise;
    getOne(tbl:String, query:IDBQuery):IDBPromise;
    push(tblName:String, data:any):IDBPromise;
    delete(tblName:String, data:any):IDBPromise;
    query(query:IDBQuery):IDBPromise;
    getNumRows(query:IDBQuery, tblName:String):IDBPromise;
}

export interface IDBQuery {

}

export interface IDBApplicationScheduler {

}

export  class IDBCoreSync {
    constructor(appName:String);
    Entity(tablesToSync?:String|Array<String>):{
        configSync(config?:IDBCoreOptions, forceSyc?:Boolean):{
            processEntity(handler:IDBEventHandler):void
        } | IDBClientService;
    };
}