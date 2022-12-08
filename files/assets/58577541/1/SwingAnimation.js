const SwingAnimation = pc.createScript('swingAnim');

SwingAnimation.attributes.add('idleAnim', {
    type: 'json',
    title: 'Idle Animation',
    schema: [{
        name: 'high',
        type: 'asset',
        title: 'High Idle',
    }, {
        name: 'low',
        type: 'asset',
        title: 'Low Idle',
    }]
});

SwingAnimation.attributes.add('loadAnim', {
    type: 'json',
    title: 'Load Animation',
    schema: [{
        name: 'high',
        type: 'asset',
        title: 'High Load',
    }, {
        name: 'low',
        type: 'asset',
        title: 'Low Load',
    }]
});

SwingAnimation.attributes.add('swingAnim', {
    type: 'json',
    title: 'Swing Animation',
    schema: [{
        name: 'high',
        type: 'asset',
        title: 'High Swing',
    }, {
        name: 'low',
        type: 'asset',
        title: 'Low Swing',
    }]
});

SwingAnimation.attributes.add('stopAnim', {
    type: 'json',
    title: 'Stop Animation',
    schema: [{
        name: 'high',
        type: 'asset',
        title: 'High Stop',
    }, {
        name: 'low',
        type: 'asset',
        title: 'Low Stop',
    }]
});

// initialize code called once per entity
SwingAnimation.prototype.initialize = function() {
    
    // Setup new stategraph to apply the blendtrees
    let stateGraph = this.entity.anim.stateGraph;
    let states = stateGraph.layers[0].states;
    console.log(stateGraph);
    
    states.find(_state => _state.name === "Ready").blendTree = {
        "type": pc.ANIM_BLEND_1D,
        "parameters": ["Height"],
        "children": [
            {
                "name": "LowIdle",
                "point": 0.0
            },
            {
                "name": "HighIdle",
                "point": 1.0
            },
        ]
    };
    
    states.find(_state => _state.name === "Load").blendTree = {
        "type": pc.ANIM_BLEND_1D,
        "parameters": ["Height"],
        "children": [
            {
                "name": "LowLoad",
                "point": 0.0
            },
            {
                "name": "HighLoad",
                "point": 1.0
            },
        ]
    };
    
    states.find(_state => _state.name === "Launch").blendTree = {
        "type": pc.ANIM_BLEND_1D,
        "parameters": ["Height"],
        "children": [
            {
                "name": "LowSwing",
                "point": 0.0
            },
            {
                "name": "HighSwing",
                "point": 1.0
            },
        ]
    };
    
    states.find(_state => _state.name === "Ongoing").blendTree = {
        "type": pc.ANIM_BLEND_1D,
        "parameters": ["Height"],
        "children": [
            {
                "name": "LowStop",
                "point": 0.0
            },
            {
                "name": "HighStop",
                "point": 1.0
            },
        ]
    };
    
    this.entity.anim.loadStateGraph(stateGraph);
    
    // Event Handlers
    this.entity.on('swing', () => this.entity.anim.setTrigger('Swing'), this);
    this.entity.on('move', ({ intpolX:_x, intpolY:_y }) => this.entity.anim.setFloat('Height', _y), this);
    this.entity.on('load', () => this.entity.anim.setTrigger('Ready'), this);
};

// initialize code called once per entity
SwingAnimation.prototype.postInitialize = function() {
    let layer = this.entity.anim.findAnimationLayer('Base');
    console.log(layer);
    layer.assignAnimation('Ready.LowIdle', this.idleAnim.low.resource);
    layer.assignAnimation('Ready.HighIdle', this.idleAnim.high.resource);
    layer.assignAnimation('Load.LowLoad', this.loadAnim.low.resource);
    layer.assignAnimation('Load.HighLoad', this.loadAnim.high.resource);
    layer.assignAnimation('Launch.LowSwing', this.swingAnim.low.resource);
    layer.assignAnimation('Launch.HighSwing', this.swingAnim.high.resource);
    layer.assignAnimation('Ongoing.LowStop', this.stopAnim.low.resource);
    layer.assignAnimation('Ongoing.HighStop', this.stopAnim.high.resource);
    
    this.app.on('reset', this.reset, this);
    this.entity.on("destroy", () => {
        this.app.off("reset", this.reset, this);
    }, this);  
};

SwingAnimation.prototype.reset = function(_event) {
    this.entity.anim.setTrigger('Reset');
};