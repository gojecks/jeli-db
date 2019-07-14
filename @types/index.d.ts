/**
 * jdb core interface
 */
export = jdb;
 export as namespace jdb;

declare function jdb(db_name:String, version?:Number):jdb.IJDBInstance;
declare namespace jdb {
    interface IJDBInstance {
        open(options:IDBCoreOptions):IDBCorePromise;
        isClientMode():{open:Function; requiresLogin:Function};
        requiresLogin():{open:Function};
    }
    
    interface IDBCoreOptions {
        app_id?:String;
        inProduction?:Boolean;
        handler?: {
            onSuccess: Function;
            onError: Function;
        };
        disableApiLoading?:Boolean;
        isClientMode?:Boolean;
        isLoginRequired?:Boolean;
        logService?:Function;
        conflictResolver?:Function;
        serviceHost?:String;
        live?:Boolean;
        ignoreSync?:Boolean|Array<String>;
        storage?:String;
        location?:String;
        key?:String;
        folderPath?:String;
        ajax?:Function;
        interceptor?:(options: IDBHTTPRequest, requestState: IDBRequestState)=>any; 
        organisation:String;
    }

    type eventResponse = (event:IDBCoreEvent) => any;

    interface IDBHTTPRequest {
        url: string;
        __appName__: string;
        data: any;
        headers: any;
        dataType: string;
        contentType: string;
        type: string;
        cache: boolean;
    }

    interface IDBRequestState {
        METHOD: string;
        CACHE?: string;
        URL: string;
        AUTH_TYPE: number;
        PRIVATE_API?: boolean;
    }
    
    interface IDBCorePromise {
        onSuccess(cb:eventResponse): IDBCorePromise;
        onError(cb:Function): IDBCorePromise;
        then(cb:Function): IDBCorePromise;
        onUpgrade(cb:Function): IDBCorePromise;
        onCreate(cb:eventResponse): IDBCorePromise;
    }
    
    interface IDBPromise {
        then(succ:Function, err:Function):IDBPromise;
    }
    
    interface IDBCoreEvent {
        message:String;
        mode:String;
        result:IDBApplicationInstance;
        errorCode?:Number;
    }

    interface IDBStoreProcedure {
        create(storeName: string, query: string): this;
        delete(storeName: string): void;
        execute(storeName: string, params?:any): IDBCorePromise; 
    }
    
    interface IDBApplicationInstance {
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
        storeProc: IDBStoreProcedure;
        onUpdate?:IDBApplicationRealtime;
        clientService?:IDBClientService;
        scheduler?:IDBApplicationScheduler;
        helpers:IDBCoreHelpers;
        close(flag?:Boolean):void;
        api(URL:String, postData?:any, tbl?:String):IDBPromise;
        createTbl(name:String, columns:Array<any>):IDBCorePromise;
        drop(flag?:Boolean):IDBCorePromise;
        export(type:String, table:String):{initialize(title?:String):any};
        import(table:String, handler:IDBEventHandler):{getFile():any; getData():any}
        info():Array<IDBTableInfoSet>;
        jQl(query:String, handler:IDBEventHandler, parser?:any):IDBCoreEvent;
        rename(newName:String):IDBPromise;
        sync():IDBCoreSync;
        table(name:String, mode:String): IDBCorePromise;
        transaction(table:String|Array<String>, mode?:String): IDBCorePromise;
        users(): IDBUsers;
    }
    
    interface IDBUsers {
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
    
    interface IDBCoreTransaction {
        delete(query:String|any):this;
        insert(data:Array<any>):this;
        update(data:any, query?:any):this;
        dataProcessing(process: Boolean): this;
        select(selectFields:String, definition?:IDBCoreTransactionSelect):this;
        getColumn():Array<any>;
        qsl():any;
        execute():IDBCorePromise;
    }

    interface IDBCoreTransactionResult {
        message:String;
        mode:String;
        result:IDBCoreTransaction;
    }
    
    interface IDBCoreTransactionSelect {
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
    
    interface IDBTable {
        info:any;
        Alter:IDBTableAlter;
        columns:Array<any>;
        truncate(flag?:Boolean):IDBCoreEvent;
        drop(flag?:Boolean):IDBCoreEvent;
        onUpdate?:IDBApplicationRealtime;
    }
    
    interface IDBTableAlter {
        drop(columnName):void;
        add:IDBTableAlterAdd;
        rename(newName:String): void;
    }

    interface IDBTransactionResult {
        message: String;
    }

    interface IDBSelectTransactionEvent {
        state: String;
        jDBNumRows():Number;
        getRow(index: Number);
        getResult():Array<any>;
        first():any;
        openCursor(listener: Function): void;
        limit(start: number, end: Number): Array<any>|any;
    }

    interface IDBSelectTransactionCursorEvent {
        result: {
            value: Array<any>;
        };
        continue():void;
        previous():void;
        index():Number;
    }
    
    interface IDBTableAlterAdd {
        primary();
        unique();
        foreign();
        mode();
        column();
    }
    
    
    interface IDBTableInfoSet {
        name:String;
        records:any;
        columns:Array<any>;
        primaryKey:any;
        foreignKey?: any;
        allowedMode:String;
        lastModified:Number|any;
    }
    
    interface IDBEventHandler {
        onSuccess(fn:any):void;
        onError(fn:eventResponse):void;
    }
    
    interface IDBCoreHelpers {}
    
    interface IDBTableColum {
        type:String;
        defaultValue?:any;
        AUTO_INCREMENT?:Boolean;
        PRIMARY_KEY?: any;
    }
    
    interface IDBApplicationRealtime {
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
    
    interface IDBClientService {
        getByRef(tbl:String, query:IDBQuery):IDBPromise;
        getAll(tbl:String, query:IDBQuery):IDBPromise;
        getOne(tbl:String, query:IDBQuery):IDBPromise;
        push(tblName:String, data:any):IDBPromise;
        delete(tblName:String, data:any):IDBPromise;
        query(query:IDBQuery):IDBPromise;
        getNumRows(query:IDBQuery, tblName:String):IDBPromise;
    }
    
    interface IDBQuery {
    
    }
    
    interface IDBApplicationScheduler {
    
    }
    
    interface IDBCoreSync {
        constructor(appName:String);
        Entity(tablesToSync?:String|Array<String>):{
            configSync(config?:IDBCoreOptions, forceSyc?:Boolean):{
                processEntity(handler:IDBEventHandler):void
            } | IDBClientService;
        };
    }
}
