const InningMaster = pc.createScript('inningMaster');

InningMaster.prototype.initialize = function() {
    this.app.inningMaster = this;
    this.timerManager = this.entity.script.timer;
    
    // Score
    this.run = 0;
    this.walk = 0;
    this.pitch = 0;
    this.homerun = 0;
    
    // Time
    this.time = 0;
    this.timeRecording = false;
    this.actualSpeed = 0;
    this.defaultRole = null;
    
    // Reset
    this.on("reset", () => {
        this.app.timeScale = 1;
        this.timeRecording = false;
        this.time = 0;
        this.actualSpeed = 0;
        
        this.app.playerManager.setRole(this.defaultRole);
        
        this.off('hit', this.onHit, this);
        this.off('zone:in', this.onZoneIn, this);
        this.off('swing', this.onSwing, this);
        this.off('catch', this.onCatch, this);
        this.off('wild', this.onWild, this);
        this.off("foul", this.onFoul, this);
        this.off("homerun", this.onHomeRun, this);
        this.off("contact", this.onContact, this);
        
        if(this.app.ball) this.app.ball.off("slowEnough");
        
        this.app.root.findByTag("temp").forEach( entity => entity.destroy() );
    }, this);
    
    // Pitch
    this.on("pitch", () => {
        this.timeRecording = true;
        this.fire("record:start");
        this.pitch++;
        
        this.once('hit', this.onHit, this);
        this.once('zone:in', this.onZoneIn, this);
        this.once('swing', this.onSwing, this);
        this.once('catch', this.onCatch, this);
        this.once('wild', this.onWild, this);
        this.once('contact', this.onContactBefore, this);
    }, this);
    
    this.once("inningEnd", this.onInningEnd, this);
    this.app.once("inningEnd", this.onInningEnd, this);
    
    let _onRoleChange = (_role) => this.defaultRole = _role;
    this.app.on('setRole', _onRoleChange, this);
    
    this.entity.on("destroy", () => {
        this.app.timeScale = 1;
        this.timeRecording = false;
        this.time = 0;
        this.defaultRole = null;
        
        this.app.off("inningEnd", this.onInningEnd, this);
        this.app.off('setRole', _onRoleChange, this);
        this.off();
        delete this.app.inningMaster;
    }, this);
};

InningMaster.prototype.postInitialize = function() {
    let global = this.app;
    
    this.fire('setCount:pitch');
    this.fire('setCount:run');
    this.fire('setCount:walk');
    this.fire('setCount:homerun');
    
    this.moundDistance = function (zonePos = global.strikeZone.getPosition(), pitcherPos = global.pitcher.defaultCamera.getPosition()) {
        let result = new pc.Vec3().sub2(zonePos, pitcherPos);
        return Math.abs(result.z);
    }();
};

InningMaster.prototype.update = function(dt) {
    if (this.timeRecording) this.time += dt;
};

// ***********************
// 
// Communication Callbacks
// 
// ***********************

InningMaster.prototype.onHit = function(ball, data) {
    ball.fire("hit", data);
    this.conclude(ball);
    
    // Off list
    this.off('catch', this.onCatch, this);
    this.off('wild', this.onWild, this);
    this.off('zone:in', this.onZoneIn, this);
    this.off("contact", this.onContactBefore, this);
    
    // Communication open after hit
    this.once("contact", this.onContactAfter, this);
    this.once("foul", this.onFoul, this);
    this.once("homerun", this.onHomeRun, this);
    
    this.transition(20); // Maximum waiting time before replay or reset
};

InningMaster.prototype.onZoneIn = function(ball, data) {
    ball.fire("zone:in");
    this.actualSpeed = this.moundDistance/this.time;
};

InningMaster.prototype.onCatch = function(ball) {
    ball.fire("catch");
    
    this.off('wild', this.onWild, this);
    this.off('hit', this.onHit, this);

    this.conclude(ball);
    this.transition(2);
};

InningMaster.prototype.onWild = function(ball) {
    ball.fire("wild");
    this.off("contact");
    this.conclude(ball);
    this.transition(2);
};

InningMaster.prototype.onFoul = function(ball) {
    ball.fire("foul");
    ball.off("slowEnough");
    this.transition(3.5);
};

InningMaster.prototype.onHomeRun = function(ball) {
    ball.fire("homerun");
    ball.off("slowEnough");
    
    this.off("foul", this.onFoul, this);
    this.off("contact", this.onContactAfter, this);
    this.transition(3.5);
};

InningMaster.prototype.onContactBefore = function(ball) {
    this.timerManager.fire(5, () => {
        ball.fire("wild");
        this.off("contact");
        this.conclude(ball);
        this.transition(2, false);
    }, this);
};

InningMaster.prototype.onContactAfter = function(ball) {
    ball.fire("check:speed");
    ball.once("slowEnough", () => this.transition(2), this);
};

InningMaster.prototype.onInningEnd = function() {
    this.app.result = {
        run: this.run,
        walk: this.walk,
        pitch: this.pitch,
        homerun: this.homerun,
        runsperpitch: (this.pitch > 0? pc.customMath.round(this.run / this.pitch * 100, 100): "No Pitch")
    };

    this.entity.fire('load');
};

InningMaster.prototype.conclude = function(ball) {
    this.timeRecording = false;
    this.fire("record:stop", this.time);
    this.fire("conclude", ball);
};

// Transition after pitching and hitting
// When replay set up, then transit to replay
// Otherwise, reset after a few seconds
InningMaster.prototype.transition = function(duration = 2, replay = this.app.settings.replaySetting) {
    this.timerManager.fire(duration, function() {
        switch (this.app.ball.status) {
            case 'hit':
                this.run++;
            break;
                
            case 'wild':
                this.run++;
            break;

            case 'home run':
                this.homerun++;
                this.run++;
            break;
        }

        this.fire('setCount:pitch');
        this.fire('setCount:walk');
        this.fire('setCount:run');
        this.fire('setCount:homerun');
        
        if (replay) {
            this.app.timeScale = 0.1;
            this.fire('replay');
            this.app.playerManager.setRole(this.app.spectator);
        } else {
            this.fire('reset');
        }
    }, true, this);
};