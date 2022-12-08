var RevolvingCam = pc.createScript('revolvingCam');

RevolvingCam.attributes.add('axis', {
    title: 'Axis',
    type: 'entity',
});

RevolvingCam.attributes.add('config', {
    type: 'json',
    schema: [{
        name: "plane",
        title: "Plane",
        type: 'number',
        default: 2,
        enum: [
            { 'XY': 0 },
            { 'YZ': 1 },
            { 'XZ': 2 }
        ]
    },{
        name: "revolveTime",
        title: "Revolve Time",
        type: "number",
        min: 0,
        default: 3,
    }]
});

// initialize code called once per entity
RevolvingCam.prototype.initialize = function() {
    this.subtracted = new pc.Vec3().sub2(this.entity.getPosition(), this.axis.getPosition());
    this.initialPos = this.entity.getPosition().clone();
    this.axisPos = this.axis.getPosition();
    this.planeVec2 = new pc.Vec2();
    this.time = 0;
    switch (this.config.plane){
      case 0:
            this.planeVec2.set(this.subtracted.x, this.subtracted.y);
            break;
      case 1:
            this.planeVec2.set(this.subtracted.y, this.subtracted.z);
            break;
      case 2:
            this.planeVec2.set(this.subtracted.x, this.subtracted.z);
            break;
    }
    
    this.magnitude = this.planeVec2.length();
    this.originalLookAt = new pc.Mat4().setLookAt(this.initialPos, this.axisPos, pc.Vec3.UP).getEulerAngles();
};

// update code called every frame
RevolvingCam.prototype.update = function(dt) {
    if (this.time < this.config.revolveTime) {
        this.time += dt;
        let deg = pc.math.DEG_TO_RAD * pc.math.lerp(0, 360, this.time/this.config.revolveTime);
        let _sin = Math.sin( deg ) * this.magnitude;
        let _cos = Math.cos( deg ) * this.magnitude;
        
        switch (this.config.plane){
          case 0:
                this.entity.setPosition(this.axisPos.x + _sin, this.axisPos.y + _cos, this.initialPos.z);
                break;
          case 1:
                this.entity.setPosition(this.initialPos.x, this.axisPos.y + _sin, this.axisPos.z + _cos);
                break;
          case 2:
                this.entity.setPosition(this.initialPos.x + _sin, this.initialPos.y, this.axisPos.z + _cos);
                break;
        }
    } else {
        this.time -= this.config.revolveTime;
    }
    this.entity.lookAt(this.axis.getPosition());
};