const Ball = pc.createScript('ball');

// initialize code called once per entity
Ball.prototype.initialize = function() {
    this.app.ball = this.entity;
    
    this.statusList = Object.freeze(['wild', 'strike', 'ball', 'hit', 'foul', 'home run']); // Freezing the options of status
    this.entity.status = this.statusList[2]; // Default status : Ball
    this.stabilize(); // Disalbe Rigidbody First
    
    // Communications
    this.entity.collision.on('collisionstart', this.onCollider, this);
    
    // If a mitt entity catches a ball, then stabilize the ball.
    this.entity.once('catch', this.stabilize, this);
    
    this.entity.once('pitch', ({ linearVelocity, angularVelocity }) => {
        this.entity.rigidbody.enabled = true;
        this.entity.rigidbody.linearVelocity = linearVelocity;
        this.entity.rigidbody.angularVelocity = angularVelocity;
        this.entity.timestamp = Date.now().valueOf();
    }, this);
    
    this.entity.once('hit', (data) => {
        this.entity.status = this.statusList[3];
        this.angleConvert.transformVector(data.normal, this.convertedResult);

        this.stabilize();
        this.entity.rigidbody.enabled = true;
        this.entity.rigidbody.teleport(data.point);
        this.entity.rigidbody.linearVelocity = this.convertedResult.scale(this.magnitude * 0.9);
    }, this);
    
    this.entity.once('check:speed', () => this.checkSpeed = true, this);
    
    this.entity.once('zone:in', () => this.entity.status = this.statusList[1], this);
    this.entity.once('wild', () => this.entity.status = this.statusList[0], this);
    this.entity.once('foul', () =>  {
        this.entity.status = this.statusList[4];
        this.checkSpeed = false;
    }, this);
    this.entity.once('homerun', () => {
        this.entity.status = this.statusList[5];
        this.checkSpeed = false;
    }, this);
    this.app.inningMaster.once('swing', () => this.entity.status = this.statusList[1], this);
    
    // Physics Variables
    this.convertedResult = new pc.Vec3();
    this.angleConvert = new pc.Mat4().setFromAxisAngle(pc.Vec3.LEFT, 10);
    this.magnitude = 0;
    
    this.entity.on("destroy", () => {
        delete this.app.ball;
    }, this);
};

Ball.prototype.update = function (dt) {
    this.magnitude = this.entity.rigidbody.linearVelocity.length();
    
    if (this.checkSpeed) {
        if (this.magnitude < 10) {
            if(this.app.debug) console.log(this.magnitude);
            this.entity.fire("slowEnough");
            this.checkSpeed = false;
        }
    }
};

Ball.prototype.onCollider = function () {
    this.app.inningMaster.fire("contact", this.entity);
};

Ball.prototype.stabilize = function () {
    this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO;
    this.entity.rigidbody.angularVelocity = pc.Vec3.ZERO;
    this.entity.rigidbody.enabled = false;
};