//Function checks if data is a JSON
//@return {OBJECT}
function purifyJSON(data)
{
  if($isJsonString(data))
  {
    return JSON.parse( data );
  }else
  {
    return undefined;
  }
}

//condition setter
function setCondition(spltQuery)
{
    return spltQuery.slice( parseInt(spltQuery.indexOf("where") + 1) ).join(' ');
}

//Function to retrieve storage Data
//@return OBJECT
function getStorageItem(item)
{
    //return FN
    return $queryDB.$storage.getItem(item);
}

//Function to Store storage data
//@return JSON String
function setStorageItem(key,value)
{
  if(key && value && $isObject(value))
  {
    $queryDB.$storage.setItem(key, value );
  }
}

//@Function Delete Storage Item
function delStorageItem(name)
{
  if(getStorageItem(name))
  {
    $queryDB.$storage.removeItem(name);
  }

  return true;
}

function getDBSetUp(name)
{
  return ({started : new Date().getTime(),lastUpdated : new Date().getTime(),resourceManager:{}});
}


function updateDeletedRecord(ref,obj)
{
    var checker = getStorageItem($queryDB.$delRecordName),
        _resolvers =  $queryDB.$getActiveDB().$get('resolvers');
    if(checker && checker[obj.db])
    {
      _resolvers.register('deletedRecords', checker[obj.db]);
    }else{
      //Create a new delete Object
      //add a new property : DB_NAME
      checker = {};
      checker[obj.db] = {};
    }

    //Update the resource control
    //only when its table
    if($isEqual(ref,'table'))
    {
      $queryDB.$getActiveDB().$get('resourceManager').removeTableFromResource(obj.name);
    }

    var _delRecords = _resolvers.getResolvers('deletedRecords');
   
    _delRecords[ref][obj.name] = obj.$hash || GUID();


    //extend the delete Object
    //with the current deleteResolver
    checker[obj.db] = _delRecords;
    setStorageItem($queryDB.$delRecordName,checker);
}
//Property Watch
function defineProperty(obj,type,callBack)
{
    //set watch on stack
    Object.defineProperty(obj, type, 
    {
        configurable: false,
        enumerable: false, // hide from for...in
        writable: false,
        value: callBack
    });
}

var inUpdateProgress = 0;
function fireEvent(fn)
{
  if(inUpdateProgress)
  {
    setTimeout(function()
    {
      inUpdateProgress = 0;
      fn();
    },1000);

    return;
  }
  fn();
  inUpdateProgress = 1;
}

//generate GUID
//xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
function GUID()
{
  var rand = function(){ return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);}
  
  function recur(loop,seperator)
  {
      var h="";
      for(var i=0; i<loop; i++)
      {
          h +=rand();
      }

      return h + (seperator || '');
  }

  return recur(2,"-") + recur(1,"-") + recur(1,"-") + recur(1,"-") + recur(3);
}
