
//@FileReader

function jFileReader()
{
  var handler = {
    onselect : function(){},
    onSuccess : function(){},
    onError : function(){},
    onload : function loadHandler(event) 
    {
      processData(event.target.result);
    },
    selectedFile : null
  },
  fileData = {columns:[],data:[],skippedData:[]};



  function processData(content)
  {

      function convertToObject(data)
      {
        var okeys;

        function setValue(cdata)
        {
          var ret = {};
          if(okeys.length === cdata.length)
          {
            for(var i in cdata)
            {
                ret[okeys[i]] = ((!isNaN(Number(cdata[i])))?Number(cdata[i]):cdata[i]);
            }

            fileData.data.push(ret);
          }else
          {
            fileData.skippedData.push(cdata);
          }
        }

        function setData()
        {
          for(var i=1; i <= data.length; i++)
          {
            if(data[i] && !$isEmpty(data[i][0]))
            {
              var value = data[i][0].split(",");
              setValue(value);
            }
             
          }
        }

          if(data && !fileData.data.length)
          {
            okeys = fileData.columns = data[0][0].split(",");
            setData();
          }

          handler.onSuccess(fileData);
      }


      function csv()
      {
          var allTextLines = content.split(/\r\n|\n/);
          var lines = [];
          for (var i=0; i<allTextLines.length; i++) 
          {
              var data = allTextLines[i].split(';');
                  var tarr = [];
                  for (var j=0; j<data.length; j++) 
                  {
                      tarr.push(data[j]);
                  }

                  lines.push(tarr);
          }

          return lines;
      }

      function html()
      {
          var div = element('<div />').html(content),
              tr = div[0].querySelectorAll('tr'),
              lines = [];

          //Function to remove td 
          function removeTD(row)
          {

              var td = row.childNodes,
                  tarr =[],
                  data = [];
                for(var t in td)
                {
                  data.push(td[t].textContent);
                }

              tarr.push(data.join(','));

              //return tarr
              return tarr;
          }

          if(tr.length)
          {
            for(var row in tr)
            {
              if(tr[row].tagName)
              {
                lines.push( removeTD(tr[row]) );
              }
            }
          }
          

          return lines;
      }

      //Json importer
      function json()
      {
        if(content)
        {
          var dContent = JSON.parse(content);
          fileData.columns = Object.keys(dContent[0]);
          fileData.data = dContent;

          return dContent;
        }
      }

      function getFileType()
      {
        return handler.selectedFile.name.split('.')[1];
      }


    var _extensions =({
        csv: csv,
        html:html,
        json:json
      });

      //initialize the file
      var fileType = getFileType();
      if(fileType && _extensions[fileType])
      {
        convertToObject( _extensions[fileType]() );
      }
  }

  function handleSelectedFile()
  {
      if(handler.selectedFile)
      {
        var reader = new FileReader();
        // Read file into memory as UTF-8      
        reader.readAsText(handler.selectedFile);
        // Handle errors load
        reader.onload = handler.onload;
        reader.onerror = handler.onError;
      }

  }

    this.start = function(handlers)
    {
        if(handlers)
        {
          extend(handler,handlers);
        }

        var input = element("<input type='file'/>");
            input
            .bind('change',function(e)
            {
              handler.onselect(this.files[0].name, this.files);
              handler.selectedFile =  this.files[0];
              handleSelectedFile();
              input.remove();
            })
            .css({top:"-10000px",position:"absolute"})
            .appendTo('body');

        input[0].click();

        return ({
          getFile : function()
          {
            return handler.selectedFile;
          },
          getData : function()
          {
            return fileData;
          }
        });
    };
}
