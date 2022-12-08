const CountManager = pc.createScript('countManager');

CountManager.attributes.add('counter', {
    type: 'json',
    title: 'Counter',
    schema: [{
        name: "strike",
        title: 'Strike',
        type: 'entity',
    }, {
        name: "ball",
        title: 'Ball',
        type: 'entity',
    }, {
        name: "out",
        title: 'Out',
        type: 'entity',
    }]
});

CountManager.prototype.initialize = function() {
    this.app.inningMaster.on('hit', this.reset, this);
    this.app.inningMaster.on('wild', this.reset, this);
    
    this.app.inningMaster.on('catch', function(ball) {
        let status = ball.status;
        
        if(status && typeof status == "string") {
            switch(status) {
                case 'strike': this.counter.strike.fire("increment");
                break;
                case 'ball': this.counter.ball.fire("increment");
                break;
            }
        }
    }, this);
    
    this.app.inningMaster.on('foul', function(ball) {
        this.strikeCount = null;
        this.counter.strike.fire("getCount", "strikeCount", this);
        if (this.strikeCount < 2) this.counter.strike.fire("increment");
    }, this);

    this.counter.strike.on("max", function () {
        this.counter.out.fire("increment");
        this.reset();
    }, this);
    
    this.counter.ball.on("max", function () {
        this.app.inningMaster.run++;
        this.app.inningMaster.walk++;
        this.app.inningMaster.fire('setCount:run');
        this.app.inningMaster.fire('setCount:walk');
        this.reset();
    }, this);
    
    
    // When the out counts hit max
    this.counter.out.on("max", function () {
        this.app.inningMaster.fire('inningEnd');
    }, this);
};

CountManager.prototype.reset = function() {
    this.counter.strike.fire("reset");
    this.counter.ball.fire("reset");
};

// ****
// ****
// ****

const NumCounter = pc.createScript('numCounter');

NumCounter.attributes.add('name', {
    type: 'string',
    title: 'Name',
});

NumCounter.prototype.initialize = function() {
    this._name = this.name? this.name: this.entity.name.toLowerCase().replace(/\s+/g, '');
    this.text = this.entity.element.text;
    this.app.inningMaster.on(`setCount:${this._name}`, this.setCount, this);
};

NumCounter.prototype.setCount = function() {
    this.entity.element.text = this.text.replace('&int', `${this.app.inningMaster[this._name]}`);
};