const Tracker = pc.createScript('tracker');

Tracker.attributes.add('_target', {
    type: 'entity',
    title: 'Target',
});

Tracker.attributes.add('camera', {
    type: 'entity',
    title: 'Camera',
});

Tracker.prototype.initialize = function() {
    const targetInit = () => {
        if(this._target) {
            this.target = this._target;
            if (this.entity.hasEvent('tracker:setTarget')) this.entity.off("tracker:setTarget", this.setTarget, this);
        } else {
            this.target = null;
            this.entity.on("tracker:setTarget", this.setTarget, this);
        }
    };
    targetInit();
    this.on('attr:_target', targetInit);
    
    if (this.camera) this.cameraVector = new pc.Vec3();
    
    this.targetData = {
        worldPosition : new pc.Vec3(),
        screenPosition : new pc.Vec3(),
    };
    
    this.entity.on("tracker:request", this.sendData, this);
};

Tracker.prototype.setTarget = function (entity) {this.target = entity;};

Tracker.prototype.sendData = function(dt) {    
    if (this.target) {
        this.targetData.worldPosition.copy(this.target.getPosition());
        this.targetData.name = this.target.name;
        this.targetData.entity = this.target;
        if (dt) this.targetData.time = dt;
        
        if (this.camera) {
            this.cameraVector.copy(this.camera.getPosition());
            
            this.camera.getRotation().transformVector(this.targetData.worldPosition);
            this.camera.getRotation().transformVector(this.cameraVector);
            
            this.camera.camera.worldToScreen(this.targetData.worldPosition, this.targetData.screenPosition);            
            this.targetData.isOverCamera = this.cameraVector.dot(pc.Vec3.ONE) < this.targetData.worldPosition.dot(pc.Vec3.ONE);
        }
        
        this.entity.fire(`tracker:${this.entity.name}`, this.targetData);
    }
};