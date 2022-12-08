var TrackingFloor = pc.createScript('trackingFloor');

// initialize code called once per entity
TrackingFloor.prototype.initialize = function() {
    this.entity.on(`tracker:${this.entity.name}`, this.track, this);
    
    this.shouldTrack = false;
    
    const request = (ball) => {
        this.entity.fire("tracker:setTarget", ball);
        this.shouldTrack = true;
    };
    
    const reset = () => {
        this.shouldTrack = false;
    };
    
    this.app.inningMaster.on("reset", reset, this);
    this.app.inningMaster.on('replay', reset, this);
    
    this.app.inningMaster.on("homerun", request, this);
    this.app.inningMaster.on("foul", request, this);
    
    this.projection = new pc.Vec3(1, 0, 1);
    this.offset = new pc.Vec3(0, 1, 0);
    this.position = new pc.Vec3();
};

// update code called every frame
TrackingFloor.prototype.update = function(dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request");
};

TrackingFloor.prototype.track = function(data) {
    this.position.copy(data.worldPosition).mul(this.projection).sub(this.offset);
    this.entity.setPosition(this.position);
};