//set variable for processed Data
 
  function transactionInsert()
  {
     var processedData = [],
      _skipped = [],
      _data = arguments,
      $self = this,
      tableInfo = $self.tableInfo,
      columnObj = columnObjFn(tableInfo.columns[0]),
      l;

    /*
        Check if the our arguments is 1
        if also the argument is an array
        replace variable arg with arg[0]
    */
    if(_data.length === 1){
      if($isArray(_data[0])){
        _data = _data[0];
      }
    }

    if(_data.length && columnObj)
    {
        for(l=0; l <= _data.length-1;l++)
        {
            var type = ($isObject(_data[l])?'object':'array'),
                cdata = {};
            
            //switch type
            switch(type)
            {
              case('object'):
                cdata = _data[l];
              break;
              case('array'):
                var columnKeys = Object.keys(columnObj),
                    k;
                  //loop through the 
                  for(k in columnKeys)
                  {
                    cdata[ columnKeys[k] ] = _data[l][k];
                  }                 
              break;
            }

            if(processData(cdata,l))
            {
              var tableConfig = tableInfo.columns[0],
                  pData = extend({},columnObj,cdata);
              

                // check indexing
                var _dataExists = false,
                    _ref = GUID(),
                    _index;
                for(_index in tableInfo.index){
                  var _currentIndexCheck = tableInfo.index[_index];
                  if(_currentIndexCheck.indexes){
                      // check the the index already exists
                      if(_currentIndexCheck.indexes[pData[_index]]){
                        if(_currentIndexCheck.unique){
                          _dataExists = true;
                          _skipped.push(_currentIndexCheck.indexes[pData[_index]]);
                        }
                      }else{
                        _currentIndexCheck.indexes[pData[_index]] = _ref;
                      }
                  }else{
                    _currentIndexCheck.indexes = {};
                    _currentIndexCheck.indexes[pData[_index]] = _ref;
                  }
                }

                //push data to processData array
                //set obj ref GUID
                if(!_dataExists){
                  tableInfo.lastInsertId++;

                  //update the data to store
                  findInList.call(pData,function(i,n)
                  {  
                      //check auto_increment
                      if(!n && tableConfig[i].hasOwnProperty('AUTO_INCREMENT'))
                      {
                        pData[i] = tableInfo.lastInsertId;
                      }
                  });

                  var newSet = {}
                    newSet['_ref'] = _ref;
                    newSet['_data'] = pData;
                  processedData.push( newSet );
                }
            }                   
        }

        if(!$isEqual(this.processState,"insert"))
        {
          this.executeState.push(["insert",function(disableOfflineCache)
          {
              //errorLog Must be empty
              if($self.hasError())
              {
                //clear processed Data
                processedData = [];
                throw new Error($self.getError());
              }

              // update offline
              if(!disableOfflineCache){
                $self.updateOfflineCache('insert',processedData);
              }

              /**
                  broadcast event
              **/
              $queryDB.storageEventHandler.broadcast('onInsert',[tableInfo.TBL_NAME, processedData]);
              
              //push records to our resolver
                  
              return updateTable( processedData.length );
          }]);
        }

        this.processState = "insert";
    }


    function processData(cData,dataRef)
    {
        //Process the Data
        var columns = tableInfo.columns[0],
            passed = 1;
        if(cData)
        {
            findInList.call(cData,function(idx,val)
            {
                //check if column is in table
                if(!columns[idx])
                {
                  //throw new error
                  $self.setDBError('column ('+idx+') was not found on this table ('+tableInfo.TBL_NAME+'), to add a new column use the addColumn FN - ref #'+dataRef);
                  passed=!1;

                  return;
                }

                var type = typeof cData[idx],
                    cType = transactionColumnTypeChecker( cData[idx], (columns[idx].type || 'STRING').toLowerCase(), type );
                if(!cType)
                {
                  $self.setDBError(idx +" Field requires "+cType+", but got "+type + "- ref #"+dataRef);
                  passed=!1;
                }
            });

            return passed;
        }

        return !1;
    }

            //Update the table content
    function updateTable(totalRecords)
    {
        if($isArray(processedData) && totalRecords)
        {
          tableInfo.data.push.apply(tableInfo.data, processedData);
        }

        //return success after push
        processedData = [];
        _skippedTotal = _skipped.length;
        _skipped = [];
        return ({
            message : totalRecords + " record(s) inserted successfully, skipped "+_skippedTotal+" existing record(s)"
        });
    }



    return this;
};