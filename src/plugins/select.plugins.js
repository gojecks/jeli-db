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
              var field = spltQuery[parseInt(query.indexOf(type))];
              field = field.replace(/\((.*?)\)/,"~$1").split("~");
              return ((field.length > 1)?field[1] : spltQuery[parseInt(query.indexOf(type) + 1)]);
            }

            if(spltQuery.length > 1)
            {
                //build table
                buildTable();

                db
                .transaction(table)
                .onSuccess(function(e)
                {
                  var definition = {};

                  if(query.length > 3){
                    if($isJsonString(query[3])){
                      definition = maskedEval(query[3]);
                    }else{
                      // splice our query
                      // set definition
                      [].concat.call(query).splice(3).map(function(qKey){
                          qKey = qKey.replace(/\((.*?)\)/,"~$1").split("~");
                          // function Query
                          if(qKey.length > 1){
                            if($isJsonString(qKey[1])){
                              definition[qKey[0]] = JSON.parse(qKey[1]);
                            }else{
                              definition[qKey[0]] = qKey[1];
                            }
                            
                          }
                      });
                    }
                  }
                  
                  e.result
                  .select(spltQuery[1], definition)
                  .execute()
                  .onSuccess(handler.onSuccess)
                  .onError(handler.onError);
                })
                .onError(handler.onError);                
            }

        };
    }