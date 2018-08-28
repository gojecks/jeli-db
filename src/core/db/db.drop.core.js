//Drop Db
DBEvent.prototype.drop = function(flag)
{
  var defer = new $p();
    if(flag)
    {
      defer.resolve($queryDB.removeDB(this.name));
    }else
    {
      defer.reject({message:"Unable to drop DB, either invalid flag or no priviledge granted!!",errorCode:401});
    }

    return new DBPromise( defer );
};