DBEvent.prototype.table = function(name,mode)
{
  var defer = new $p();
    //get the requested table
    if(name && $queryDB.$getTable(this.name,name))
    {
       defer.resolve({result:new jEliDBTBL($queryDB.$getTable(this.name,name), mode) });
    }else
    {
        defer.reject({message:"There was an error, Table ("+name+") was not found on this DB ("+this.name+")",errorCode:401})
    }

    return new DBPromise(defer);
};