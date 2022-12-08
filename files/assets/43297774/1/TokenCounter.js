const TokenCounter = pc.createScript('tokenCounter');

TokenCounter.attributes.add('token', {
    type: 'entity',
    title: 'Token',
});

TokenCounter.attributes.add('number', {
    type: 'number',
    title: 'Number',
    description: 'The Maximum Number of Tokens',
    min: 1,
    precision: 0,
    step: 1,
});

TokenCounter.attributes.add('interpolation', {
    type: 'json',
    title: 'Interpolation',
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
TokenCounter.prototype.initialize = function() {
    this.token.initialPosition = this.token.getLocalPosition();
    this.interpolation.vector = new pc.Vec3(this.interpolation.x, this.interpolation.y, this.interpolation.z);
    this.tokens = [this.token];
    this.count = 0;
    
    const _vector = this.interpolation.vector.clone();
    
    for (let i = 1; i < this.number; i++) {
        const _token = this.token.clone();
        this.entity.addChild(_token);
        _token.translateLocal( _vector );
        _vector.add(this.interpolation.vector);
        this.tokens.push(_token);
    }
    
    this.entity.on("getCount", (count, script) => script[count] = this.count, this);
    this.entity.on("increment", this.increment, this);
    this.entity.on("decrement", this.decrement, this);
    this.entity.on("reset", this.reset, this);
    
    this.tokens.forEach(function (_token, i, _tokens) {
        _token.element.spriteFrame = 0;
    });
};

TokenCounter.prototype.increment = function() {
    if (this.count < 0) {
        this.count = 0;
    } else if (this.count > this.number-1) {
        this.count = this.number-1;
        this.entity.fire("max");
    } else {
        this.tokens[this.count].fire("on");
        this.count++;
    }
};

TokenCounter.prototype.decrement = function() {
    if (this.count < 0) {
        this.count = 0;
        this.entity.fire("min");
    } else if (this.count > this.number-1) {
        this.count = this.number-1;
    } else {
        this.tokens[this.count].fire("off");
        this.count--;
    }
};

TokenCounter.prototype.reset = function() {
    this.tokens.forEach( (_token, i, _tokens) => {
        _token.fire("off");
    });
    this.count = 0;
};