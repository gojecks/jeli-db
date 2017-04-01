//replicate DB
DBEvent.prototype.replicate = function()
{
  var defer = new $p();

  return new DBPromise( defer );
};