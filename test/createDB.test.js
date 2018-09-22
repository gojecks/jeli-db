function testOpenDB(dbName, config) {
    new jEli.$jDB(dbName, 1)
        .open(config)
        .then((res) => {
            db = res.result
        }, console.log);
}

function testDBReName(dbName, config) {
    new jEli.$jDB(dbName, 1).open(config).then((res) => {
        var db = res.result
        db.jQl('create -test -[{name:{type:"any"}}]', {
            onSuccess: () => {
                db.jQl('insert -[1,2,3,4,5,6,7,8,9,10] -test', {
                    onSuccess: () => {
                        setTimeout(() => {
                            db.rename('test2');
                        }, 1000)
                    },
                    onError: console.log
                })
            }
        })
    }, console.log)
}

function testTableUpdate(dbName, config) {
    new jEli.$jDB(dbName, 1).open(config).then((res) => {
        var db = res.result
        db.jQl('create -test -[{name:{type:"any"}}]', {
            onSuccess: () => {
                db.jQl('insert -[1,2,3,4,5,6,7,8,9,10] -test', {
                    onSuccess: () => {
                        setTimeout(() => {
                            db.jQl('update -test -10 -{"name":1}', {
                                onSuccess: console.log,
                                onError: console.log
                            });
                        }, 1000)
                    },
                    onError: console.log
                })
            }
        })
    }, console.log)
}