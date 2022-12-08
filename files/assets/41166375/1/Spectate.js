var Spectate = pc.createScript('spectate');

Spectate.attributes.add('cameras', {
    type: 'entity',
    array: true,
    title: 'Camera Array',
});

// initialize code called once per entity
Spectate.prototype.initialize = function() {
    this.initialCamera= this.entity.findByPath("Camera");
    this.cameraNum = this.checkCameraNumber(this.initialCamera);
    
    let onSetRole = (_role, _camera, _ui) => this.cameraNum = this.checkCameraNumber(_camera);
    this.app.on('setRole', onSetRole, this);
    
    // Inputs
    const changeToPitcher = (event) => {
        this.app.playerManager.setRole(this.app.pitcher);
        this.app.inningMaster.fire("reset");
    };
    
    this.app.on("spectator:mousepress:left", changeToPitcher, this);
    this.app.on("spectator:mousepress:right", this.relayCamera, this); 
    this.app.on("spectator:touchstart", changeToPitcher, this);
    
    this.entity.on("destroy", () => {
        this.app.off('setRole', onSetRole, this);
        this.app.off("spectator:mousepress:left", changeToPitcher, this);
        this.app.off("spectator:mousepress:right", this.relayCamera, this); 
        this.app.off("spectator:touchstart", changeToPitcher, this);
    }, this);
};

Spectate.prototype.relayCamera = function () {
    this.cameraNum += 1;
    if (this.cameraNum >= this.cameras.length ) this.cameraNum = 0;
    
    let cameraEntity = this.cameras[this.cameraNum];
    this.app.playerManager.setCamera(cameraEntity);
};

Spectate.prototype.checkCameraNumber = function ( _camEntity ) {
    let _cameraNum = this.cameras.indexOf(_camEntity);
    if (_cameraNum > 0) return _cameraNum; else return 0;
};