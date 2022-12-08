const PitchingMachine = pc.createScript('pitchingMachine');

PitchingMachine.attributes.add('position', {
    type: 'json',
    schema: [{
        name: "x",
        type: 'number',
    }, {
        name: "y",
        type: 'number',
    }]
});

PitchingMachine.attributes.add('linearVector', {
    type: 'json',
    schema: [{
        name: "x",
        type: 'number',
    }, {
        name: "y",
        type: 'number',
    }, {
        name: "z",
        type: 'number',
    }]
});

PitchingMachine.attributes.add('angularVector', {
    type: 'json',
    schema: [{
        name: "x",
        type: 'number',
    }, {
        name: "y",
        type: 'number',
    }, {
        name: "z",
        type: 'number',
    }]
});

// initialize code called once per entity
PitchingMachine.prototype.initialize = function() {
    this._linVec = new pc.Vec3(this.linearVector.x, this.linearVector.y, this.linearVector.z);
    this._angVec = new pc.Vec3(this.angularVector.x, this.angularVector.y, this.angularVector.z);
    
    this.on('attr:linearVector', _value => this._linVec.set(_value.x, _value.y, _value.z));
    this.on('attr:angularVector', _value => this._angVec.set(_value.x, _value.y, _value.z));
};

PitchingMachine.prototype.postInitialize = function() {
    this.pitchScript = this.entity.script.pitchController;
    
    if (this.app.keyboard && this.pitchScript) {
        this.app.keyboard.on(pc.EVENT_KEYDOWN, (_e) => {
            switch (_e.key) {
                case pc.KEY_R:
                    this.pitchScript.reset.call(this.pitchScript);
                    break;
                case pc.KEY_T:
                    this.pitchScript.reset.call(this.pitchScript);
                    let ball = this.pitchScript.ball;
                    this.pitchScript._pitch(ball, this.position.x, this.position.y, this._linVec, this._angVec);
                    break;
            }
        }, this);
    }
};