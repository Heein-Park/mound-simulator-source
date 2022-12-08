const Mitt = pc.createScript('mitt');

Mitt.attributes.add('camera', {
    type: 'entity',
    title: 'Camera',
});

Mitt.attributes.add('axis', {
    type: 'entity',
    title: 'Axis',
});

Mitt.attributes.add('config', {
    title: 'Configuration',
    type: 'json',
    schema: [{
        name: "distMax",
        title: 'Maximum Distance Between A Mitt and An Axis',
        type: 'number',
        default: 0.9
    }]
});

// initialize code called once per entity
Mitt.prototype.initialize = function() {
    this._worldPosition = new pc.Vec3();
    this.lookAtMat = new pc.Mat4();
    this.lookAtVec3 = new pc.Vec3();
    this.ballDist = new pc.Vec3();
    this.mittDist = new pc.Vec3().sub2(this.camera.getPosition(), this.app.pitcher.defaultCamera.getPosition());
    this.heightDiff = this.mittDist.clone().project(pc.Vec3.UP);
    this.interpolation = new pc.Vec3();
    
    this.shouldTrack = false;
    
    this.entity.on(`tracker:${this.entity.name}`, (data) => {
        if(data.isOverCamera) {
            this.ballDist.sub2(this.camera.getPosition(), data.worldPosition);
            this.move(data.screenPosition.x, data.screenPosition.y);
        } else this.app.inningMaster.fire("wild", data.entity);
    }, this);
    
    this.app.inningMaster.on("pitch", ({ball }) => {
        this.entity.fire("tracker:setTarget", ball);
        this.shouldTrack = true;
    }, this);
    
    this.entity.on("contact:Ball", (ball) => {
        this.app.inningMaster.fire("catch", ball);
    }, this);
    
    this.app.inningMaster.on('reset', this.reset, this);
    this.app.inningMaster.on("conclude", () => {this.shouldTrack = false;}, this);
};

Mitt.prototype.postInitialize = function() {
    this.depth = this.app.strikeZone.getDepth(this.camera);
};

Mitt.prototype.reset = function () {
    this.shouldTrack = false;
};

Mitt.prototype.update = function (dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request");
};

Mitt.prototype.move = function (x, y) {
    this.camera.camera.screenToWorld(x, y, this.depth, this._worldPosition);
    let axisDist = this.axis.getPosition().distance(this._worldPosition);
    axisDist = pc.math.clamp(axisDist, 0, this.config.distMax);
    
    let distRatio = Math.abs(this.ballDist.z) / Math.abs(this.mittDist.z);
    this.interpolation.lerp(pc.Vec3.ZERO, this.heightDiff, distRatio);

    this.lookAtMat.setLookAt(this.axis.getPosition(), this._worldPosition, pc.Vec3.UP);
    this.lookAtMat.transformPoint(pc.Vec3.FORWARD, this.lookAtVec3);
    this.lookAtVec3.sub(this.axis.getPosition());
    this.lookAtVec3.mulScalar(axisDist);
    this.lookAtVec3.add(this.axis.getPosition());
    this.lookAtVec3.add(this.interpolation);
    
    this.entity.setPosition(this.lookAtVec3);

    this.entity.lookAt(this.axis.getPosition());
    this.entity.rotateLocal(-20,180,0);
};