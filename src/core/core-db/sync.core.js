
DBEvent.prototype.synchronize = function()
{
	return new jEliDBSynchronization(this.name);
};