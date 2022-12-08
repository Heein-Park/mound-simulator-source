const Hit = pc.createScript('hit');

Hit.attributes.add('bat', {
    type: 'entity',
    title: 'Bat'
});

Hit.attributes.add('hitSpot', {
    type: 'entity',
    title: 'Hitting Spot'
});

Hit.attributes.add('effectEmitter', {
    type: 'entity',
    title: 'Effect Emitter'
});

Hit.attributes.add('constraints', {
    type: 'json',
    title: 'Constraints',
    schema: [
        {
            name: 'x',
            type: 'number',
            default: 1,
        },
        {
            name: 'y',
            type: 'number',
            default: 0,
        },
        {
            name: 'z',
            type: 'number',
            default: 1,
        },
    ]
});


// initialize code called once per entity
Hit.prototype.initialize = function() {
    this.view = this.entity.defaultCamera? this.entity.defaultCamera : this.entity.findByName("Camera");
    this.shouldTrack = false;
    
    this.entity.on(`tracker:${this.entity.name}`, this.track, this);
    
    // Inning Master Callbacks
    this.app.inningMaster.on("pitch", (ball) => {
        this.shouldTrack = true;
        this.entity.fire("tracker:setTarget", ball);
    }, this);
    
    this.app.inningMaster.on('reset', this.reset, this);
    this.app.inningMaster.on("conclude", () => this.shouldTrack = false, this);
    
    this.hitSpot.on(`contact:${this.app.ball.name}`, (ball, data) => {
        this.app.inningMaster.fire("hit", ball, data);
        this.effectEmitter.fire("emit", data.point);
    }, this);
    
    
    this.originalBatPos = new pc.Vec3().copy(this.bat.getPosition());
    this.hitPosition =  new pc.Vec3();
    this.swingVector = new pc.Vec2();
    this.batConstraints = new pc.Vec3(this.constraints.x, this.constraints.y, this.constraints.z);
    this.lookAtVec3 = new pc.Vec3();

    this.bat.enabled = true;
    this.bat.animation.play("Load.glb", 0.1);
    this.hitSpot.collision.enabled = false;
};

Hit.prototype.postInitialize = function () {
    if (this.bat && this.bat.animation && this.bat.animation.animations["Swing.glb"]) 
    this.animDuration = this.bat.animation.animations["Swing.glb"].duration;

    vertices = this.app.strikeZone.getVertices();
    const reducer = (accumulator, currentValue) => accumulator + currentValue;
    let tX = vertices.map(vert => vert.x).reduce(reducer);
    let tY = vertices.map(vert => vert.y).reduce(reducer);
    let tZ = vertices.map(vert => vert.z).reduce(reducer);
    let tNum = vertices.length;

    this.center3D = new pc.Vec3(tX, tY, tZ).divScalar(tNum);
    this.screenVertices = {};

    let scrVerts = vertices.map(vert => this.view.camera.worldToScreen(vert));

    scrVerts.sort((vec1, vec2) => vec1.x - vec2.x);
    this.screenVertices.x = {min : scrVerts[0].x, max : scrVerts[scrVerts.length-1].x};
    scrVerts.sort((vec1, vec2) => vec1.y - vec2.y);
    this.screenVertices.y = {min : scrVerts[0].y, max : scrVerts[scrVerts.length-1].y};
    
    console.log(vertices, this.screenVertices);
    
    this.depth = this.app.strikeZone.getDepth(this.view);
};

Hit.prototype.move = function (x, y) {
    if (this.screenVertices && this.center3D) {
        let altX = pc.math.clamp(x, this.screenVertices.x.min, this.screenVertices.x.max);
        let altY = pc.math.clamp(y, this.screenVertices.y.min, this.screenVertices.y.max);

        this.view.camera.screenToWorld(altX, altY, this.depth, this.hitPosition);
        this.hitSpot.setPosition(this.hitPosition);

        var change = this.hitPosition.clone().sub(this.center3D);
        var newBatPos = this.originalBatPos.clone().add(change);
        newBatPos.add2( this.originalBatPos, change.mul(this.batConstraints));

        this.bat.setPosition(newBatPos);
        this.lookAtVec3.set(this.hitPosition.x, this.hitPosition.y, this.originalBatPos.z);
        this.bat.lookAt(this.lookAtVec3, pc.Vec3.UP);
        this.bat.rotateLocal(0,90,0);
        
        this.swingVector.set(x, y);
    }
};

Hit.prototype.swing = function () {
    this.bat.animation.play("Swing.glb");
    this.hitSpot.collision.enabled = true;
    this.shouldTrack = false;
    
    this.swingVector.copy(pc.centricConverter.convert(this.swingVector));
    this.app.inningMaster.fire('swing', this.swingVector);
};

Hit.prototype.reset = function () {
    this.bat.enabled = true;
    this.bat.animation.play("Load.glb", 0.1);
    this.hitSpot.collision.enabled = false;
    this.shouldTrack = false;
};

Hit.prototype.track = function(data) {
    if (data.isOverCamera && data.time) {
        this.move(data.screenPosition.x, data.screenPosition.y);
        
        let xZoneIn = this.screenVertices.x.min <= data.screenPosition.x && this.screenVertices.x.max >= data.screenPosition.x;
        let yZoneIn = this.screenVertices.y.min <= data.screenPosition.y && this.screenVertices.y.max >= data.screenPosition.y;
        let trackZDist = (data.screenPosition.z - this.depth) + this.app.ball.rigidbody.linearVelocity.z * data.time < 0;
        
        if (trackZDist && xZoneIn && yZoneIn) this.swing();
    }
};

Hit.prototype.update = function(dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request", dt);
    if(this.hitSpot.collision.enabled) {
        let currentTime = this.bat.animation.currentTime;
        if (currentTime >= this.animDuration) this.hitSpot.collision.enabled= false;
    }
};