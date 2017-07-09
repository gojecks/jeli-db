    //juser
	jEliDB.plugins.jQl('select',{
		help : ['select -[fields] -[table] -Clause[ -[on] -[join] -[where] -[like] ] -limit -[orderBy] -[groupBy]'],
		fn : selectPluginFn
	});
	
        //select -columns -tableName
        //-join -CLAUSE -on -EXPRESSION
        //-Where -column -like -expression 
    function selectPluginFn(query,handler){
    	var spltQuery = query.concat(),
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

            function getQueryValues(type){
              return spltQuery[parseInt(query.indexOf(type) + 1)];
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
                    .join(getQueryValues("join"))
                    .on(getQueryValues("on"));
                  }

                  if(expect(query).contains('where'))
                  {
                      qTask
                      .where(setCondition(query.concat()));
                  }

                  ["limit","orderBy","groupBy"].forEach(function(key){
                    if(expect(query).contains(key.toLowerCase()))
                    {
                        qTask[key](getQueryValues(key.toLowerCase()));
                    }
                  });

                  qTask
                  .execute()
                  .onSuccess(handler.onSuccess)
                  .onError(handler.onError);
                })
                .onError(handler.onError);                
            }

        };
    }