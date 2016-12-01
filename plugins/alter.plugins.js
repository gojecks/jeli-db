


	jEliDB.plugins.jQl('alter',{
		help : ['Alter -table] -a -c -columnName [config]', 
				'Alter -[tbl_name] -a -p -columnName',
				'Alter -[tbl_name] -a -f -columnName -[relative table]',
 				'Alter -[tbl_name] -d -columnName',
 				'Alter -[tbl_name] -a -m -[read : write]'],
		fn : alterPluginFn
	});

	//create -tablename -columns
	function alterPluginFn(query,handler){
		// @Function drops the required table
      	var result = false,
          taskType ={c:'column',f:'foreign',p:'primary',u:'unique',m:'mode'};


		return function(db)
	    {

	        if(query.length > 2)
	        {
	            //alter the table
	            db
	            .table(query[1])
	            .onSuccess(function(alt)
	            {
	                var exp = query[query.length-1],
	                    key = query[query.length-2],
	                    type = 'new',
	                    task = taskType[query[3]];
	              switch(query[2])
	              {
	                case('add'):
	                case('a'):

	                    //options refers to "primary" | "foreign" keys
	                    //foreignkey requires a table to reference
	                    if(!$isEqual(task,'column'))
	                    {
	                        key = exp;
	                        type = 'key';
	                    }

	                    alt
	                    .result
	                    .Alter
	                    .add( type )[task](key,maskedEval(exp) || exp);

	                break;
	                case('drop'):
	                case('d'):
	                  alt
	                  .result
	                  .Alter.drop(query[3]);
	                break;
	                default:
	                break;
	              }

	              handler.onSuccess( dbSuccessPromiseObject("alter","Table("+query[1]+") have been altered."));
	            })
	            .onError(handler.onError);
	        }

	    };
	}