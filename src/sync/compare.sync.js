  //comparison
  /**
    @param: server
    @param: local,
    @param: metadata
    @param: networkResolver
  **/
  function syncDataComparism(server, local, networkResolver) {
      var changes = { hashChanged: 0, dataChanged: 0 };
      //process server tables
      var comparism = new snapShot(server, local),
          tbl = server.TBL_NAME;
      var log = {};
      log[tbl] = {
          data: comparism.data(),
          columns: comparism.columns()
      };
      syncHelper.process
          .getProcess(server.DB_NAME)
          .getSet('syncLog', log);
      //@Local Table was found     
      if (local) {
          if (comparism.$hashChanges() || comparism.$noLocalData()) {
              syncHelper.setMessage('Table(' + tbl + ') was updated on the server');
              changes.hashChanged = 1;
          }

          if (comparism.foundChanges()) {
              changes.dataChanged = 1;
          }

      } else {
          //ignore deleted tables
          var checkDeletedTables = networkResolver.deletedRecords.table[tbl];
          if (checkDeletedTables) {
              if (checkDeletedTables !== server._hash) {
                  syncHelper.setMessage('Table (' + tbl + ') was dropped on your local DB, but have changes on the server');
                  changes.hashChanged++;
              }
          } else {
              syncHelper.setMessage('Synchronizing New Table(' + tbl + ') to your local DB');
              changes.hashChanged++;
          }
      }

      return changes;
  }