const ResultStats = pc.createScript('resultStats');

ResultStats.attributes.add('dataName', {
    type: 'string',
    title: 'Data Name',
    description: 'Write down the name of a key in this.app.result'
});

// initialize code called once per entity
ResultStats.prototype.initialize = function() {
    try {
        this.value = this.app.result[this.dataName];
        if(this.app.debug && typeof this.value === undefined) throw `No value ${this.dataName}, ${Object.entries(this.app.result)}`;
        this.txtElement = this.entity.findByName("Number");
        this.originalText = this.txtElement.element.text;
        
        this.txtElement.element.text = this.originalText.replace('&int', `${this.value}`);
    } catch (e) {
        console.error(e);
        console.trace();
    }
};