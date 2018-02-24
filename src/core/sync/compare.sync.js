  //comparison
  /**
    @param: server
    @param: local,
    @param: metadata
    @param: networkResolver
  **/
  function syncDataComparism(server, local, metadata, networkResolver) {
      var changes = { hashChanged: 0, dataChanged: 0 };
      //process server tables
      var comparism = new snapShot(server, local),
          tbl = server.TBL_NAME;
      syncHelper.process
          .getProcess(server.DB_NAME)
          .getSet('syncLog')[server.TBL_NAME] = {
              data: comparism.data(),
              columns: comparism.columns()
          };
      //@Local Table was found     
      if (local) {
          if (comparism.$hashChanges() || comparism.$noLocalData()) {
              syncHelper.setMessage('Table(' + tbl + ') was updated on the server', networkResolver);
              changes.hashChanged = 1;
          }

          if (comparism.foundChanges()) {
              changes.dataChanged = 1;
          }

      } else {
          //ignore deleted tables
          var checkDeletedTables = networkResolver.deletedRecords.table[server.TBL_NAME];
          if (checkDeletedTables) {
              if (!$isEqual(checkDeletedTables, server.$hash)) {
                  syncHelper.setMessage('Table (' + tbl + ') was dropped on your local DB, but have changes on the server', networkResolver);
                  changes.hashChanged++;
              }
          } else {
              syncHelper.setMessage('Synchronizing New Table(' + tbl + ') to your local DB', networkResolver);
              changes.hashChanged++;
          }
      }

      return changes;
  }