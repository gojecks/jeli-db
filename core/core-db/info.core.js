DBEvent.prototype.info = function()
{
    var tableSet = {},
        _db = $queryDB[this.name];
    if(_db)
    {
      findInList.call(_db.tables,function(tblName,tbl)
      {
          tableSet[tblName] = {
            records : (tbl.data || []).length,
            columns : tbl.columns,
            primaryKey : tbl.primaryKey,
            foreignKey : tbl.foreignKey,
            allowedMode : 'readwrite'
          };
      });
    }
    
    return tableSet;
};