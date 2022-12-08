const ReplayManager = pc.createScript('replayManager');

ReplayManager.attributes.add('template', {
    title: 'Template',
    type: 'json',
    schema: [{
        name: "trajectory",
        type: 'asset', 
    }]
});

ReplayManager.attributes.add('bat', {title: 'Bat',type: 'entity',});

ReplayManager.prototype.initialize = function() {
    // This script requires a script module "timer" in this entity
    this.timerManager = this.entity.script.timer;
    
    this.totalDuration = 0;
    this.time = 0;
    this.isPlaying = false;
    
    this.rawBallData = [];
    this.rawBatData = [];
    
    this.ballCurveSet = new pc.CurveSet([
        [], // position.x
        [], // position.y
        [], // position.z
    ]);
    this.ballCurveSet.type = pc.CURVE_CARDINAL;
    
    this.batCurveSet = new pc.CurveSet([
        [], // animation
    ]);
    this.batCurveSet.type = pc.CURVE_CARDINAL;
    this.batAnimation = [];
    
    this.app.inningMaster.on('record:start', () => {
        this.app.ball.on("record:send", (data) => {
            let parsedData = JSON.parse(data);
            this.rawBallData.push(parsedData);
        }, this);
        this.bat.on("record:send", (data) => {
            let parsedData = JSON.parse(data);
            this.rawBatData.push(parsedData);
        }, this);
    }, this);
    
    this.app.inningMaster.on('record:stop', (_time) => {
        this.app.ball.off("record:send");
        this.bat.off("record:send");
        this.totalDuration = _time;
        this.makeReplay.call(this, this.totalDuration, this.rawBallData, this.rawBatData);
        
        if (this.app.debug) console.log(this.totalDuration, this.rawBallData, this.rawBatData, this.ballCurveSet, this.batCurveSet);
    }, this);
    
    this.app.inningMaster.on('replay', () => {
        this.isPlaying = true;
        this.app.ball.rigidbody.enabled = false;
    }, this);
    
    this.app.inningMaster.on('reset', this.reset, this);
};

ReplayManager.prototype.postInitialize = function() {
    if (this.timerManager) this.resetReplayTimer = this.timerManager.add(1, () => this.time = 0, this);
};

ReplayManager.prototype.update = function(dt) {
    if (this.isPlaying) {
        if (this.time < this.totalDuration) {
            this.time += dt;
            let _time = this.time;
            _time /= this.totalDuration;
            
            let _position = this.ballCurveSet.value(_time);
            let _anim = this.batCurveSet.value(_time);
            
            let animIndex = Math.floor(pc.math.lerp(0, this.batAnimation.length-1, _time));
            
            this.app.ball.setPosition(_position[0], _position[1], _position[2]);
            this.bat.animation.play(this.batAnimation[animIndex]);
            this.bat.animation.currentTime = _anim[0];
        } else {
            if (this.timerManager) this.timerManager.start(this.resetReplayTimer);
        }
    }
};

ReplayManager.prototype.reset = function() {
    this.totalDuration = 0;
    this.time = 0;
    this.isPlaying = false;
    if (this.timerManager) this.timerManager.reset(this.resetReplayTimer);
    
    const emptyArray = (array) => array.splice(0, array.length);
    
    emptyArray(this.rawBallData);
    emptyArray(this.ballCurveSet.get(0).keys);
    emptyArray(this.ballCurveSet.get(1).keys);
    emptyArray(this.ballCurveSet.get(2).keys);
    
    emptyArray(this.rawBatData);
    emptyArray(this.batAnimation);
    emptyArray(this.batCurveSet.get(0).keys);
};

ReplayManager.prototype.makeReplay = function (_duration, _rawBallArray, _rawBatArray) {
    for (let _ballData of _rawBallArray) {
        this.ballCurveSet.get(0).add(_ballData.time/_duration, _ballData["position.x"]);
        this.ballCurveSet.get(1).add(_ballData.time/_duration, _ballData["position.y"]);
        this.ballCurveSet.get(2).add(_ballData.time/_duration, _ballData["position.z"]);
    }
    
    for (let _batData of _rawBatArray) {
        this.batCurveSet.get(0).add(_batData.time/_duration, _batData["animation.currentTime"]);
        this.batAnimation.push(_batData["animation.currAnim"]);
    }
};