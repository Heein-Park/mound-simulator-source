const FieldRule = pc.createScript('fieldRule');

FieldRule.attributes.add('lines', {
    type: 'json',
    title: 'Lines',
    array: true,
    schema: [{
        name: "node1",
        type: 'string',
    }, {
        name: "node2",
        type: 'string',
    }, {
        name: "entity",
        type: 'entity',
    }],
});

// initialize code called once per entity
FieldRule.prototype.initialize = function() {
    this.targetVector = new pc.Vec3();
    this._targetVector = new pc.Vec3();
    this.plane = new pc.Vec3(1, 0, 1);
    this.worldMatrix = this.entity.getWorldTransform();
    this.timerManager = this.entity.script.timer;

    this.shouldTrack = false;
    
    this.entity.on(`tracker:${this.entity.name}`, this.track, this);
    
    this.app.inningMaster.on("hit", (ball) => {
        this.timerManager.fire(0.1, function() {
            this.entity.fire("tracker:setTarget", ball);
            this.shouldTrack = true;
        }, false, this);
    }, this);
    
    const reset = () => {
        this.shouldTrack = false;
    };
    
    this.app.inningMaster.on("reset", reset, this);
    this.app.inningMaster.on('replay', reset, this);
    
    if (this.entity.model) {
        this.nodes = this.entity.model.model.graph;
        
        this.lines.forEach((line, i, array) => {
            let node1 = this.nodes.find('name', line.node1)[0];
            let node2 = this.nodes.find('name', line.node2)[0];
            
            array[i].vec1 = node1.localPosition.clone().div(node1.localScale);
            array[i].vec2 = node2.localPosition.clone().div(node2.localScale);
            
            this.worldMatrix.transformPoint(line.vec1, line.vec1);
            this.worldMatrix.transformPoint(line.vec2, line.vec2);
            
            array[i].diffVector = new pc.Vec3().sub2(line.vec1, line.vec2).normalize();
            array[i].normalVector = new pc.Vec3().cross(line.diffVector, pc.Vec3.UP);
            array[i].offsetVector = line.vec1.clone().project(line.normalVector);
            
            array[i].planeVector = new pc.Vec3();
            array[i]._vector = new pc.Vec3();
        });
    }
};


FieldRule.prototype.update = function (dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request");
};

FieldRule.prototype.track = function(data) {
    this.targetVector.copy(data.worldPosition);
    this._targetVector.mul2(this.targetVector, this.plane);
    
    this.lines.every((line, i, array) => {
        line.planeVector.copy(this._targetVector).project(line.diffVector).add(line.offsetVector);
        
        array[i].distance = line._vector.sub2(line.vec1, this._targetVector).dot(line.normalVector);
        if (line.planeTest !== undefined) array[i]._planeTest = line.planeTest;
        array[i].planeTest = line.distance < 0;
        
        line.entity.setPosition(line.planeVector);
        
        if(line.planeTest !== undefined && line._planeTest !== undefined) if(!line.planeTest && line.planeTest != line._planeTest) {
            if (line.entity.tags.has('foul')) this.app.inningMaster.fire('foul', data.entity);
            else if(line.entity.tags.has('fence')) {
                this.entity.fire('emit', data.entity.getPosition());
                this.app.inningMaster.fire('homerun', data.entity);
           }
            
            this.shouldTrack = false;
            
            return false;
        }
        
        return true;
    });
};