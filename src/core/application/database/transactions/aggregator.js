// {
//     key: 'id', // Use 'id' for aggregation
//     group: [], // Group by
//     filters: [
//       { }, // Filter groups where any item has category 'A'
//     ],
//     aggregate: {}, // specify aggregators
//     orderBy: [], // Order by 
//     output: [] // Specify output fields
//   }
function AggregateTransaction(tableName, query) {
    // Validate the query object
    if (typeof query !== 'object' || Array.isArray(query)) {
        throw new Error('Query must be a valid JSON object');
    }

    // Create a map to hold the aggregated results
    var result = new Map();
    var aggregationMap = {};
    var groupKeys = (!query.group ? null : (Array.isArray(query.group) ? query.group : [query.group]));
    var key = '-';
    QueryTaskPerformer.run(this.getTableData(tableName), query.filters, item => {
        // perform aggregate
        if (groupKeys) {
            key = groupKeys.map(g => modelGetter(g, item)).join('|'); // Create a composite key for grouping
            if (!groupEntries.has(key)) {
                groupEntries.set(key, []);
            }
            groupEntries.get(key).push(item);
        } else {
            key = modelGetter(query.key, item).toString(); // Access the specified key for aggregation
            result.set(key, item);
        }

        if (!aggregationMap[key]) {
            aggregationMap[key] = 0; // Initialize with item properties
        }
        aggregationMap[key] += 1;
    });


    // Handle additional aggregation methods if specified
    result = Array.from(result.values);
    if (query.aggregate) {
        result = result.map(item => {
            const aggregated = QueryTaskPerformer.aggregateItems(item, query.aggregate);
            return {
                item,
                aggregated
            };
        });
    }

    // Configure output result if specified in the query
    if (query.output) {
        const outputFields = Array.isArray(query.output) ? query.output : [query.output];
        var valueMethodInstance = new ValueMethods(outputFields, result);
        result = valueMethodInstance.getAll();
    }

    return result;
}