const Swing = pc.createScript('swing');
Swing.attributes.add('bat', { type: 'entity' });
Swing.attributes.add('indicator', { type: 'entity' });
Swing.attributes.add('view', { type: 'entity' });
Swing.attributes.add('body', { type: 'entity' });

// initialize code called once per entity
Swing.prototype.initialize = function() {
    // this.bat.on(`contact:${this.app.ball.name}`, (ball, data) => this.app.inningMaster.fire("hit", ball, data), this);
    
    // Vector Sets
    this.hitPosition =  new pc.Vec3();
    this.swingVector = new pc.Vec2();
    
    if (this.app.mouse) {
        this.app.on("batter:mousepress:left", this.press, this);
        this.app.on("batter:mousemove:left", _e => this.move(_e.x, _e.y), this);
        this.app.on("batter:mouserelease:left", this.swing, this);
    }
    
    this.entity.on("destroy", () => {
        this.app.off("batter:mousepress:left", this.press, this);
        this.app.off("batter:mousemove:left", this.move, this);
        this.app.off("batter:mouserelease:left", this.swing, this);
    }, this);
};

Swing.prototype.postInitialize = function() {
    // Set this.view with priority
    // Scan the attribute first, then find any camera entity
    if(!this.view) this.view = this.entity.defaultCamera? this.entity.defaultCamera : this.entity.findByName("Camera");
    this.app.on('reset', this.reset, this);
};

Swing.prototype.press = function () {
    this.body.fire('load');
};

Swing.prototype.move = function ({x, y}) {
    const { x : clamp_x, y : clamp_y } = this.app.strikeZone.calculateRect(this.view);
    this.depth = this.app.strikeZone.getDepth(this.view);
    
    let altX = pc.math.clamp(x, clamp_x.min, clamp_x.max);
    let altY = pc.math.clamp(y, clamp_y.min, clamp_y.max);
    
    let intpolX = Math.abs(1 - pc.math.smoothstep(clamp_x.min, clamp_x.max, x));
    let intpolY = Math.abs(1 - pc.math.smoothstep(clamp_y.min, clamp_y.max, y));

    this.view.camera.screenToWorld(altX, altY, this.depth, this.hitPosition);
    this.indicator.setPosition(this.hitPosition);
    this.swingVector.set(x, y);
    this.body.fire('move', { intpolX:intpolX, intpolY:intpolY });
};

Swing.prototype.swing = function () {
    let _swingVec = new pc.centricVector(this.swingVector);
    if(this.app.inningMaster) this.app.inningMaster.fire('swing', _swingVec);
    this.body.fire('swing');
};