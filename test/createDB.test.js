var db;
jdb.JDB_STORAGE_SYSTEM('indexeddb', jIDBAdapter);
jdb.JDB_STORAGE_SYSTEM('sql', jSQLAdapter);
jdb('TestBed', 1)
    .open({
        storage: 'localStorage',
        organisation: 'Test',
        ignoreSync: true
    })
    .onCreate((res) => {
        res.result.api.localTransport('assets/schema.json', (schema) => {
            Object.keys(schema).forEach(tbl => {
                res.result.createTbl(tbl, schema[tbl]);
            });
        })


        // load the bundled files
        res.result.api.localTransport('assets/order.json', (order) => {
            res.result.transaction('Orders', 'writeonly')
                .onSuccess((orderTbl) => {
                    orderTbl.result
                        .dataProcessing(false)
                        .insert(order)
                        .execute()
                        .onError(console.log);
                })
                .onError(console.log);
        });

        res.result.api.localTransport('assets/customer.json', (customer) => {
            res.result.transaction('Customers', 'writeonly')
                .onSuccess((customerTbl) => {
                    customerTbl.result
                        .dataProcessing(false)
                        .insert(customer)
                        .execute()
                        .onError(console.log);
                });
        });
    })
    .onUpgrade((res) => {
        // do something
    })
    .then((res) => {
        db = res.result;
    });

function tryit() {
    var textarea = document.querySelector('textarea').value;
    if (textarea) {
        db.jQl(textarea, {
            onSuccess: res => {
                var ret = document.getElementById('result');
                if (res.state === "select") {
                    ret.innerText = JSON.stringify(res.getResult(), null, 3);
                } else {
                    ret.innerText = res.result.message;
                }
            },
            onError: console.log
        })
    }
}