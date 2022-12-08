const BatchManager = pc.createScript('batchManager');

BatchManager.attributes.add('batchGroups', {
    title: 'Batch Groups',
    type: 'string',
    array: true,
});

// initialize code called once per entity
BatchManager.prototype.initialize = function() {
    const _groupArray = [];
    const batcher = this.app.batcher;
    
    this.batchGroups.every((batch, i, array) => {
        let id = batcher.getGroupByName(batch.name);
        _groupArray.push(id);
    });
    
    batcher.generate(_groupArray);
};