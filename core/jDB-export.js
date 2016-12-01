//Export functionality
function jExport(type)
{
  var exporters = (
  {
      csv : function()
      {
          var workbook = "",
              closed = false;

        return ({
          open : function(title)
          {
            if(title)
            {
              this.row([title]);
            }

            return ({
                      row : this.row,
                      close:this.close
                  });
          },
          row : function(data)
          {
            if(data &&  $isArray(data) )
            {
                workbook +=data.join(',');
            }
            //end row
            workbook +='\n';

            return ({
                      row : this.row,
                      close : this.close
                  });
          },
          close : function()
          {
            if(!$isEmpty(workbook) && !closed)
            {
              closed = true;
            }

            return new exportGenerator(workbook,'csv');
          }
        });
      },
      html : function()
      {
          var html = "",
              closed = false;

         return ({
            open : function(title)
            {
                html +='<html><head><title>'+((title)?title:"jELi HTML Export")+'</title></head><body>';
                html +='<table border="1" cellpadding="0" cellspacing="0" width="100%">';

              return ({
                      row : this.row,
                      close : this.close
                  });
            },
            row : function(data)
            {
              var row = "<tr>";
              if(data && ($isObject(data) || $isArray(data) ))
              {
                  for(var cell in data)
                  {
                    row +='<td>'+data[cell]+'</td>';
                  }
              }

              row +='</tr>';

              if(!$isEmpty(html))
              {
                html += row;
              }

              return ({
                      row : this.row,
                      close : this.close
                  });
            },
            close : function()
            {
              if(!$isEmpty(html) && !closed)
              {
                  html +='</table></body></html>';
                  closed = true;
              }

              return new exportGenerator(html,'html');
            }
         });
      },
      json : function()
      {
        var jsonExporter = [];
          return ({
              put :function(data)
              {
                jsonExporter = JSON.stringify( data );
              },
              close : function(){
                return new exportGenerator(jsonExporter,'json')
              }
          });
      }
  });

  //function exportGenerator
  function exportGenerator(doc,fileType)
  {
      if(doc && !$isEmpty(doc))
      {

        function getFileName(fileName)
        {
          return  fileName+"."+fileType;
        }


          return (
          {
              download : function(fileName)
              {
                var uri = encodeURI('data:text/'+fileType+';charset=utf-8,'+ doc ),
                    anchor = element('<a></a>')
                            .attr({href:uri,download:getFileName( fileName || GUID() )})
                            .appendTo('body')
                            .css('display','none');
                //initiate click
                anchor[0].click();
                anchor.remove();

                //print a message
                return 'downloading file';
              },
              print : function()
              {
                return doc;
              }
          });
      }
  }

  if(type && exporters[type])
  {
    return exporters[type]();
  }

  return exporters;
}