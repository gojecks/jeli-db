    //juser
	jEliDB.plugins.jQl('select',{
		help : ['select -[fields] -[table] -Clause[ -[on] -[join] -[where] -[like] ] -limit'],
		fn : selectPluginFn
	});
	
        //select -columns -tableName
        //-join -CLAUSE -on -EXPRESSION
        //-Where -column -like -expression 
    function selectPluginFn(query,handler){
    	var spltQuery = query,
            result = false,
            qTask,
            table;

        return function(db)
        {
            //@Function buildTable
            function buildTable()
            {
                if(expect(spltQuery[2]).contains(','))
                {
                  table = spltQuery[2].split(',');
                }else
                {
                  table = spltQuery[2];
                }
            }

            if(spltQuery.length > 1)
            {
                //build table
                buildTable();

                db
                .transaction(table)
                .onSuccess(function(e)
                {
                  qTask = e.result.select(spltQuery[1]);

                  if(expect(query).contains("join") && expect(query).contains("on"))
                  {
                    qTask
                    .join(spltQuery[parseInt(query.indexOf("join") + 1)])
                    .on(spltQuery[parseInt(query.indexOf("on") + 1)]);
                  }

                  if(expect(query).contains('where'))
                  {
                    var whereTask = spltQuery.slice( parseInt(query.indexOf("where") + 1) ),
                        whereString = whereTask.join(''),
                        checkTask = ($isJsonString(whereString)?maskedEval(whereString) : whereString);

                      qTask
                      .where(checkTask);
                  }

                  if(expect(query).contains('limit'))
                  {
                    var limitTask = spltQuery.slice( parseInt(query.indexOf("limit") + 1) );
                        qTask.limit(limitTask.join(''));
                  }

                  qTask
                  .execute()
                  .onSuccess(handler.onSuccess)
                  .onError(handler.onError);
                })
                .onError(handler.onError);                
            }

        };
    }