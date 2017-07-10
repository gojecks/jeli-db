DBEvent.prototype['export'] = function(type)
{
    var type = type || 'csv',
        exp = new jExport(type);


    //getValue
    function getValueInArray(data)
    {
      var ret = []
      for(var key in data)
      {
        ret.push(data[key]);
      }

      return ret;
    }

      return (
      {
        initialize : function(data,title)
        {
            //Parse the data of its not an OBJECT
          if(!data)
          {
            return dbSuccessPromiseObject("export","unable to export data, invalid table data")
          }

          //if export type was a JSON format
          if($isEqual(type,'json'))
          {
            //put the json data
            exp.put(data);
          }else
          {
              //Open the exporter
              exp.open(title);
              //set label
              exp.row(Object.keys(data[0]._data));
              //set the data
              findInList.call(data,function(i,n)
              {
               exp.row( getValueInArray(n._data) );
              });
          }

          //close the exporter
          return exp.close();
      }
    });
};