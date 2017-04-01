//queryDB resourceManager

function resourceManager(name){
	var _resource = null,
		_resourceName = $queryDB.$dbName +"_"+name;
	this.getResource = function(){
		return _resource || getStorageItem(_resourceName);
	};

	this.removeTableFromResource = function(tbl){
		var resourceControl = this.getResource();
        if(resourceControl && resourceControl.resourceManager.hasOwnProperty(tbl))
        {
            delete resourceControl.resourceManager[tbl];
            setStorageItem(_resourceName,resourceControl);
        }
	};

	this.setResource = function(resource){
		_resource = resource;
		//set and save the resource
		setStorageItem(_resourceName,resource);
	};
}
