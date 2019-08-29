var db;
jdb.JDB_STORAGE_SYSTEM('indexeddb', jIDBAdapter);
jdb.JDB_STORAGE_SYSTEM('sql', jSQLAdapter);
jdb('TestBed', 1)
    .open({
        storage: 'sql',
        schemaPath: 'assets/schemas/'
    })
    .onCreate(function(res, next) {
        console.log('onCreateMode');
        next();
    })
    .onUpgrade(function(tx, next) {
        console.log('onUpgrade');
        // do something
        /**
         * test multiple query
         */
        var arr = new Array(500),
            i = 0;
        while (i < arr.length) {
            arr[i] = ({
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
                .onSuccess(function(res) {
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
        // insertData(arr);

        next();
    })
    .then(function(res) {
        console.log('successfull opening')
        db = res.result;
        // insert -[{"OrderID":10311}, {"OrderID":10308,"CustomerID":3, "ShipperID":5}, {"OrderID":10309,"CustomerID":5, "OrderDate":"1996-24-24"}] -Orders -replace -OrderID

    });

function tryit() {
    var textarea = document.querySelector('textarea').value;
    if (textarea) {
        db.jQl(textarea, {
            onSuccess: function(res) {
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