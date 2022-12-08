const Recorder = pc.createScript('recorder');

Recorder.attributes.add('properties', {
    title: 'Properties',
    array: true,
    type: 'string', 
});

// initialize code called once per entity
Recorder.prototype.initialize = function() {
    this.isRecording = false;
    this.time = 0;
    
    this.app.inningMaster.on('record:start', () => this.isRecording = true, this);
    this.app.inningMaster.on('record:stop', () => this.isRecording = false, this);
    this.app.inningMaster.on('reset', this.reset, this);
    this.recordedProperties = {};
};

// update code called every frame
Recorder.prototype.update = function(dt) {
    if(this.isRecording) {
        const self = this;
        const entity = self.entity;
        
        this.properties.forEach( property => { // property = getAnimation("Play", {key:val1, name:val2}).omg
            // if(this.app.debug) console.log(`\nRecorder debugging, Property: ${property}`);
            let splitted = property.split(/\.(?!([^.]*\)))/g); // splitted = ['getAnimation("Play", {key:val1, name:val2})', undefined, 'omg']
            splitted = splitted.filter(property => property !== undefined);
            // if(this.app.debug) console.log(`Splitting a property: ${splitted}`);
            
            let value = entity;
            let num = 0;

            while (num < splitted.length) {
                // Break if the value is not an object
                if (typeof value !== 'object') break;
                
                // Find any argument inside parenthesises
                // And if it is true, then do the process
                let arg = splitted[num].match(/\((.+?)\)/g);
                // Something matches splitted[0] = 'getAnimation("Play", {key:val1, name:val2})'.
                // And the actual value that is tested would be '("Play", {key:val1, name:val2})'
                if (arg) {
                    // arg = '"Play", {key:val1, name:val2}'
                    arg.replace(/[\)\()]/g, ""); // Find any parenthesis and remove it
                    
                    // Put the cleansed argument to data then parse it
                    // So it becomes an object with the array data
                    // that will be put inside the value.apply
                    arg = `{"data":[${arg}]}`;
                    arg = JSON.parse(arg);
                    if(this.app.debug) console.log(`Argument : ${arg}`);
                    
                    // Remove the arguments temporarily then apply them to function
                    splitted[num] = splitted[num].replace(/(\()(.+?)(\))/g, "");
                } else { // Even if the space between parenthesises is empty, remove parenthesises when it has it
                    splitted[num] = splitted[num].replace(/\(\)|\(\s\)/g, "");
                }
                
                value = value[splitted[num]];
                
                if (typeof value === 'function') {
                    if (arg) value = value.apply(entity, arg.data);
                    else value = value.call(entity);
                }
                num++;
            }
            self.recordedProperties[property] = value;
            // if(this.app.debug) console.log(`Final Value :`, value);
        });
        this.time += dt;
        this.recordedProperties.time = this.time;
        this.entity.fire("record:send", JSON.stringify(this.recordedProperties));
    }
};

Recorder.prototype.reset = function () {
    this.time = 0;
    this.recordedProperties = {};
};