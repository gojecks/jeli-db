  //comparism functionality
  //@function Name SnapShot
  //@param server data, local data
  function snapShot(server,client)
  {
    var counter = 0,
        $hashChanges = $isEqual(server.$hash,client.$hash);
      function checker(diffLoop,diffAgainst,_changes,type)
      {
        function increaseCounter()
        {
            _changes.diff++;
            counter++;
        }

        for(var inx in diffLoop)
        {
            //set the record to update
            var _diffData = {key:inx,data:diffLoop[inx]},
                _search = expect(diffAgainst).search(null,function(item,idx)
                {
                    //search data
                    if($isEqual(type,'data'))
                    {
                      return $isEqual(item._ref,_diffData.data._ref);
                    }else{
                        //search columns
                        return $isEqual(idx,inx);
                    }
                });
            //server data exist and local data exists
            if(_search)
            {
              //changes have been made to either client or server
              //cache the changes
              if(!$isEqual(JSON.stringify(diffLoop[inx]), JSON.stringify(_search)))
              {
                //update with client
                _diffData.data = diffLoop[inx];
                _changes.update.push(_diffData);
                increaseCounter();
              }
            }else if( diffLoop[inx] && !_search)
            {
               //delete data from client
              if($isEqual(_changes.changesFound,'Local'))
              {
                _changes.insert.push(_diffData);                
              }else
              {
                 _changes.delete.push(_diffData);
              }

              increaseCounter();
            }
        }

        return _changes;
      }

    this.data = function()
    {
      var _sdata = server.data || [],
          _cdata = client.data || [],
          _changes = {update:[],insert:[],delete:[],diff:0,changesFound:'server'},
          diffLoop = _sdata,
          diffAgainst = _cdata;
        //check if client added new data
        if(_sdata.length < _cdata.length)
        {
            diffLoop = _cdata;
            diffAgainst = _sdata;
            _changes.changesFound = 'Local';
        }

        return checker(diffLoop,diffAgainst,_changes,'data');
    };

    this.columns = function()
    {
      var _scol = server.columns[0] || {},
          _ccol = client.columns[0] || {},
          _changes = {update:[],insert:[],delete:[],diff:0,changesFound:'server'},
          diffLoop = _scol ,
          diffAgainst = _ccol;
        //check if client added new data
        if(Object.keys(diffLoop).length < Object.keys(diffAgainst).length)
        {
            diffLoop = _ccol;
            diffAgainst = _scol;
            _changes.changesFound = 'Local';
        }

        return checker(diffLoop,diffAgainst,_changes);
    };

    this.foundChanges = function()
    {
      return counter;
    };

    this.$hashChanges = function()
    {
      return $hashChanges;
    };

    this.$noLocalData = function()
    {
        return (server.data || []).length && !client.data.length;
    };
  }