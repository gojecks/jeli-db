DBEvent.prototype.close = function(flag){
	//drop the DB if allowed
	$queryDB.closeDB(this.name,flag);
};	