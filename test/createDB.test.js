var db;
jdb.JDB_STORAGE_SYSTEM('indexeddb', jIDBAdapter);
jdb.JDB_STORAGE_SYSTEM('sql', jSQLAdapter);
jdb('TestBed', 3)
    .open({
        storage: 'localStorage',
        organisation: 'Test',
        ignoreSync: true
    })
    .onCreate((res) => {
        console.log('onCreateMode');
        res.result.api.localTransport('assets/schema.json', (schema) => {
            Object.keys(schema).forEach(tbl => {
                res.result.createTbl(tbl, schema[tbl]);
            });
        })


        // load the bundled files
        res.result.api.localTransport('assets/order.json', (order) => {
            res.result.transaction('Orders', 'write')
                .onSuccess((orderTbl) => {
                    orderTbl.result
                        .dataProcessing(false)
                        .insert(order)
                        .execute()
                        .onSuccess(console.log)
                        .onError(console.log);
                })
                .onError(console.log);
        });

        res.result.api.localTransport('assets/customer.json', (customer) => {
            res.result.transaction('Customers', 'write')
                .onSuccess((customerTbl) => {
                    customerTbl.result
                        .dataProcessing(false)
                        .insert(customer)
                        .execute()
                        .onError(console.log);
                });
        });
    })
    .onUpgrade(tx => {
        console.log('onUpgrade');
        // do something
        /**
         * test multiple query
         */
        var arr = new Array(500),
            i = 0;
        while (i < arr.length) {
            arr[i] = ({
                Id: 10 * i,
                "ProductNo": "AA00001",
                "Name": "Bed Alarm - Stand-Up Bed Alarm with Pressure Mat",
                "Description": "444B",
                "MainImage": "/images/products/AA00/AA16/AA00001/444B.jpg",
                "Width": 680,
                "Height": 0,
                "Depth": 840,
                "RAPScheduleNo": "",
                "ContractorCatalogNo": "444B",
                "Manufacturer": "Pelican",
                "IsHireable": false,
                "ProductLineInfo": "Lorem Ipsum",
                "DvaRecommendationOrLimit": null,
                "SupplyLimitAndDuration": "",
                "TypeOfAssessments": "Functional",
                "IsDeleted": false,
                "CreatedBy": 0,
                "CreatedDate": "25/06/2014",
                "LastUpdatedBy": 0,
                "LastUpdatedDate": "30/04/2019",
                "ProductImages": [],
                "ProductFiles": [],
                "CategoryIds": [1 * i, 2 * i]
            });
            i++;
        }


        // arr.forEach(insertData);

        function insertData(data, idx) {
            /**
             * transaction pattern
             */
            tx.result.transaction("mfs_products", "write")
                .onSuccess(res => {
                    res.result
                        .insertReplace(data, 'ProductNo')
                        .execute()
                        .onSuccess(function(suc) {
                            console.log(suc);
                        })
                        .onError(console.log)
                })
                .onError(console.log);

            /**
             * jQl Pattern
             */
            // db.jQl('insert -%data% -mfs_products', {
            //     onSuccess: function() {
            //         if (idx == arr.length - 1) {
            //             console.log(performance.now() - startTime);
            //         }
            //     },
            //     onError: console.log
            // }, {
            //     data: [data]
            // })
        }

        /**
         * single insert call with version
         */
        insertData(arr);
    })
    .then((res) => {
        console.log('successfull opening')
        db = res.result;
        // db.jQl('delete -Orders', {
        //     onSuccess: function() {
        //         db.jQl('insert -[{"OrderID":10311},{"OrderID":10312},{"OrderID":10313},{"OrderID":10314}] -Orders', {
        //             onSuccess: function() {
        //                 db.jQl('select -* -Orders', {
        //                     onSuccess: res => {
        //                         console.log(res.getResult());
        //                         console.log(performance.now() - startTime);
        //                     },
        //                     onError: console.log
        //                 })
        //             },
        //             onError: console.log
        //         })
        //     },
        //     onError: console.log
        // })

        // insert -[{"OrderID":10311}, {"OrderID":10308,"CustomerID":3, "ShipperID":5}, {"OrderID":10309,"CustomerID":5, "OrderDate":"1996-24-24"}] -Orders -replace -OrderID

        db.jQl('select -COUNT() -mfs_products -where(%query%)', {
            onSuccess: res => {
                console.log(res.getResult())
            },
            onError: err => console.log(err)
        }, {
            query: [{
                Name: {
                    type: "$lk",
                    value: "alarm - s"
                }
            }]
        })
    });

function tryit() {
    var textarea = document.querySelector('textarea').value;
    if (textarea) {
        db.jQl(textarea, {
            onSuccess: res => {
                console.log(res);
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