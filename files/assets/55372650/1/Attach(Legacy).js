const AttachLegacy = pc.createScript('attachLegacy');

AttachLegacy.attributes.add('model', {
    title: 'Target Model',
    description: 'The target model to attach this entity to a specific node position', 
    type: 'entity', 
});

AttachLegacy.attributes.add('nodeName', {
    title: 'Node Name',
    // description: 'The target model to attach this entity to a specific node position', 
    type: 'string', 
});


// initialize code called once per entity
AttachLegacy.prototype.initialize = function() {
    try {
        this.targetNode = this.model.findByName(this.nodeName);
        this.entity.reparent(this.targetNode);
        console.log(this.targetNode);
    } catch (e) {
        console.error(e);
    }

};
