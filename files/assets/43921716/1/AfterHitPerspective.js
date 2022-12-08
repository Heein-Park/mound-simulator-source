const AfterHitPerspective = pc.createScript('afterHitPerspective');

AfterHitPerspective.attributes.add('cameras', {
    type: 'entity',
    array: true,
    title: 'Camera Array',
});

AfterHitPerspective.attributes.add('ui', {
    type: 'entity',
    title: 'UI',
});

AfterHitPerspective.prototype.initialize = function() {
    this.timerManager = this.entity.script.timer;
    this.active = false;
    this.maxNum = this.cameras.length;
    this.camNum = 0;
    
    this.app.inningMaster.on('hit', this.onHit, this);
    this.app.inningMaster.on('foul', this.onFoul, this);
    this.app.inningMaster.on("reset", this.reset, this);
    
    let _setRole = () => this.active = false;
    this.app.on('setRole', _setRole, this);
    
    this.entity.on("destroy", () => {
        this.app.off('setRole', _setRole, this);
    }, this);
};

AfterHitPerspective.prototype.postInitialize = function() {
    if (this.timerManager) this.transitionTimer = this.timerManager.add(0.5, () => {
        this.app.playerManager.setCamera(this.cameras[this.camNum]);
        this.app.playerManager.setUI(this.ui);
    }, this);
};

AfterHitPerspective.prototype.onHit = function(ball) {
    if (this.active === false) {
        this.active = true;
        this.camNum = Math.floor(pc.math.random(0, this.maxNum));
        if (this.camNum > this.maxNum) this.camNum = this.maxNum - 1;
        if (this.transitionTimer) this.timerManager.start(this.transitionTimer);
        
    }
};

AfterHitPerspective.prototype.onFoul = function(ball) {
    this.ui.findByName("UmpireSignal").enabled = true;
};

AfterHitPerspective.prototype.update = function(dt) {
    if (this.active) {
        for (const camera of this.cameras) {
            camera.lookAt(this.app.ball.getPosition());
        }
    }
};

AfterHitPerspective.prototype.reset = function() {
    this.ui.findByName("UmpireSignal").enabled = false;
};
