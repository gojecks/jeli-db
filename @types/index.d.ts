/**
 * jdb core interface
 */
export = jdb;
 export as namespace jdb;

declare function jdb(db_name: string, version?: number): jdb.IJDBInstance;
declare namespace jdb {
    interface IJDBInstance {
        open(options: IDBCoreOptions): IDBCorePromise;
        isClientMode(): {open: Function; requiresLogin: Function};
        requiresLogin(): {open: Function};
    }

    interface IDBCoreOptions {
        app_id?: string;
        inProduction?: boolean;
        handler?: {
            onSuccess: Function;
            onError: Function;
        };
        disableApiLoading?: boolean;
        isClientMode?: boolean;
        isLoginRequired?: boolean;
        logService?: Function;
        conflictResolver?: Function;
        serviceHost?: string;
        live?: boolean;
        ignoreSync?: boolean|Array<String>;
        storage?: string;
        location?: string;
        key?: string;
        folderPath?: string;
        ajax?: Function;
        interceptor?: (options: IDBHTTPRequest, requestState: IDBRequestState) => any;
        organisation?: string;
        schemaPath?: string;
        useFrontendOnlySchema?: boolean;
    }

    type eventResponse = (event: IDBCoreEvent<IDBApplicationInstance|any>) => any;
    type IDBCorePromiseResponse = (event: IDBCoreEvent<IDBApplicationInstance|any>, next: Function) => any;

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

    interface IDBPromise {
        onSuccess(cb: eventResponse): this;
        onError(cb: Function): this;
        then(succ: Function, err?: Function): IDBPromise;
    }

    interface IDBCorePromise extends IDBPromise {
        onUpgrade(cb: IDBCorePromiseResponse): this;
        onCreate(cb: IDBCorePromiseResponse): this;
    }

    interface IDBCoreEvent<P=any> {
        message?: string;
        mode?: string;
        result: P;
        errorCode?: number;
    }

    interface IDBCoreTransactionEvent {
        timing: number;
        message: string;
    }

    interface IDBStoreProcedure {
        create(storeName: string, query: string): this;
        delete(storeName: string): void;
        execute(storeName: string, params?: any): IDBPromise;
    }

    interface IDBApplicationInstance {
        name: string;
        version: number;
        env: {
            usage: Function;
            logger: Function;
            dataTypes: any;
            requestMapping: any;
            resource: Function;
            appKey?: Function;
        };
        storeProc: IDBStoreProcedure;
        onUpdate?: IDBApplicationRealtime;
        clientService?: IDBClientService;
        scheduler?: IDBApplicationScheduler;
        helpers: IDBCoreHelpers;
        close(flag?: boolean): void;
        api(URL: string, postData?: any, tbl?: string): IDBPromise;
        createTbl(name: string, columns: Array<any>): IDBPromise;
        drop(flag?: boolean): IDBPromise;
        export(type: string, table: string): {initialize(title?: string): any};
        import(table: string, handler: IDBEventHandler): {getFile(): any; getData(): any};
        info(): Array<IDBTableInfoSet>;
        jQl(query: string, handler: IDBEventHandler, parser?: any): void;
        rename(newName: string): IDBPromise;
        sync(): IDBCoreSync;
        table(name: string, mode: string): IDBPromise;
        transaction(table: string|Array<String>, mode?: string): IDBPromise;
        batchTransaction(data: Array<IDBBatchTransactionDataTypes>): IDBPromise;
        users(): IDBUsers;
    }

    interface IDBUsers {
        add(userInfo: any): IDBPromise;
        remove(userInfo: any): IDBPromise;
        authorize(authorizeData: any): IDBPromise;
        reAuthorize(authorizeData: any): IDBPromise;
        updateUser(userInfo: any): IDBPromise;
        validatePassword(userInfo: any): IDBPromise;
        isExists(queryInfo: any): IDBPromise;
        addAuthority(authorityInfo: any): IDBPromise;
        removeAuthority(authorityInfo: any): IDBPromise;
    }

    interface IDBAuthorizedUserInstance {
        getUserInfo<UserInfo>(): UserInfo;
        getAccessToken<AccessToken>(): AccessToken;
        isPasswordReset(): boolean;
    }

    interface IDBAddUserInstance {
        getUserInfo<UserInfo>(): UserInfo;
        getLastInsertId(): number;
        getAccessToken<AccessToken>(): AccessToken;
        getResponseData(): any;
    }

    interface IDBCoreTransaction {
        delete(query: string|any): this;
        insert(data: Array<any>): this;
        update(data: any, query?: any): this;
        insertReplace(data: Array<any>, upateRef?: string): this;
        dataProcessing(process: Boolean): this;
        select(selectFields: string, definition?: IDBCoreTransactionSelect): this;
        getColumn(): Array<any>;
        qsl(): any;
        execute(): IDBPromise;
    }

    interface IDBCoreTransactionSelect {
        where?: string;
        like?: string;
        limit?: string;
        orderBy?: string;
        groupBy?: string;
        groupByStrict?: string;
        ref?: boolean;
        join?: Array<{
            table: string;
            on: string;
            type: string;
            where: any;
            feilds: any;
        }>;
    }

    interface IDBTable {
        info: any;
        Alter: IDBTableAlter;
        columns: Array<any>;
        onUpdate?: IDBApplicationRealtime;
        truncate(flag?: boolean): IDBCoreEvent<any>;
        drop(flag?: boolean): IDBCoreEvent<any>;
    }

    interface IDBTableAlter {
        add: IDBTableAlterAdd;
        drop(columnName: string): void;
        rename(newName: string): void;
    }

    interface IDBCoreWriteTransactionsEvents {
        transactions: Array<IDBCoreTransactionEvent|IDBInsertTransactionEvent>;
    }

    interface IDBBatchTransactionDataTypes {
        type: string;
        table: string;
        data?: Array<any>|any;
        query?: any;
    }

    interface IDBSchemaDefinition {
        type: string;
        AUTO_INCREMENT?: boolean;
        ON_UPDATE?: string;
        defaultValue?: any;
        PRIMARY_KEY?: boolean;
        NOT_NULL?: boolean;
    }

    interface IDBSelectTransactionEvent {
        state: String;
        jDBNumRows(): number;
        getRow(index: Number);
        getResult(): Array<any>;
        first(): any;
        openCursor(listener: Function): void;
        limit(start: number, end: Number): Array<any>|any;
    }

    interface IDBInsertTransactionEvent extends IDBCoreTransactionEvent{
        skippedRecords: Array<string>;
    }

    interface IDBSelectTransactionCursorEvent {
        result: {
            value: Array<any>;
        };
        continue(): void;
        previous(): void;
        index(): number;
    }

    interface IDBTableAlterAdd {
        primary(): void;
        unique(columnName: string, settings?:any): void;
        foreign(): void;
        mode(mode: string): void;
        column(colunmName: string, config:IDBSchemaDefinition): void;
    }

    interface IDBTableInfoSet {
        name: string;
        records: any;
        columns: Array<any>;
        primaryKey: any;
        foreignKey?: any;
        allowedMode: string;
        lastModified: number|any;
    }

    interface IDBEventHandler {
        onSuccess(fn: any): void;
        onError(fn: eventResponse): void;
    }

    interface IDBCoreHelpers {}

    interface IDBTableColum {
        type: string;
        defaultValue?: any;
        AUTO_INCREMENT?: boolean;
        PRIMARY_KEY?: any;
    }

    interface IDBApplicationRealtime {
        callback: Function;
        timer: number;
        payload: any;
        types: Array<String>;
        trial: number;
        url: string;
        once(): void;
        disconnect(): void;
        start(): void;
    }

    interface IDBClientService {
        getByRef(tbl: string, query: IDBQuery): IDBPromise;
        getAll(tbl: string, query: IDBQuery): IDBPromise;
        getOne(tbl: string, query: IDBQuery): IDBPromise;
        push(tblName: string, data: any): IDBPromise;
        delete(tblName: string, data: any): IDBPromise;
        query(query: IDBQuery): IDBPromise;
        getNumRows(query: IDBQuery, tblName: string): IDBPromise;
    }

    interface IDBQuery {}

    interface IDBApplicationScheduler {
    }

    interface IDBCoreSync {
        // constructor(appName: string);
        Entity(tablesToSync?: string|Array<String>):{
            configSync(config?: IDBCoreOptions, forceSyc?: boolean): {
                processEntity(handler: IDBEventHandler): void
            } | IDBClientService;
        };
    }
}
