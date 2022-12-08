const PlayerManager = pc.createScript('playerManager');

PlayerManager.attributes.add('defaultPlayer', {
    type: 'number',
    default: 1,
    enum: [
        { 'Batter': 0 },
        { 'Pitcher': 1 },
    ]
});

// initialize code called once per entity
PlayerManager.prototype.initialize = function() {
    this.app.playerManager = this;
    
    // Variables
    this.activeCam = null;
    this.activeUI = null;
    this.currentRole = null;
    
    this.whileSettings = false;
    
    let onCloseSettings = () => {
        this.setInputPermission(this.currentRole);
        if (this.activeUI) this.activeUI.enabled = true;
        this.whileSettings = false;
        this.setUIInteraction(true);
    };
    this.app.on("close:settings", onCloseSettings, this);
    
    let onOpenSettings = () => {
        this.setInputPermission(false);
        if (this.activeUI) this.activeUI.enabled = false;
        this.whileSettings = true;
        this.setUIInteraction(false);
    };
    this.app.on("open:settings", onOpenSettings, this);
    
    this.setUIInteraction(true);
    
    this.on('attr:defaultPlayer', function (value, valueOld) {
        this.getDefaultPlayer(value);
    });
    
    this.entity.on("destroy", () => {
        if (this.app.touch) this.app.touch.off();
        if (this.app.mouse) this.app.mouse.off();
        
        this.app.off("close:settings", onCloseSettings, this);
        this.app.off("open:settings", onOpenSettings, this);
        
        this.off();
        delete this.app.playerManager;
    }, this);
    
    // Disabling the context menu stops the browser displaying a menu when
    // you right-click the page
    this.app.mouse.disableContextMenu();
};

PlayerManager.prototype.postInitialize = function() {
    this.getDefaultPlayer(this.defaultPlayer);
};

PlayerManager.prototype.getDefaultPlayer = function(_enum) {
    switch(_enum) {
        case 0 : if (this.app.batter) this.setRole(this.app.batter); break;
        case 1 : if (this.app.pitcher) this.setRole(this.app.pitcher); break;
    }
};

PlayerManager.prototype.leave = function() {this.setInputPermission(this.currentRole);};
PlayerManager.prototype.enter = function() {this.setInputPermission(false);};

PlayerManager.prototype.setUIInteraction = function(boolean) {
    if (boolean === true) {
        this.app.off("leave:UI");
        this.app.off("enter:UI");
        this.app.on("leave:UI", this.leave, this);
        this.app.on("enter:UI", this.enter, this);
    } else {
        this.app.off("leave:UI", this.leave, this);
        this.app.off("enter:UI", this.enter, this);
    }
};

PlayerManager.prototype.setRole = function (role) {
    if (role && role.tags.has("Player")) {
        this.currentRole = role;
        // Use the specified main camera and UI that a player script defines
        // Otherwise, detect any Entity named as Camera and UI to pick it as default Camera and UI
        let camera = this.currentRole.findByPath("Camera");
        let ui = this.currentRole.findByPath("UI");

        if (this.currentRole.script.player) {
            camera = (this.currentRole.script.player.defaultCamera? this.currentRole.script.player.defaultCamera: camera);
            ui = (this.currentRole.script.player.defaultUI? this.currentRole.script.player.defaultUI: ui);
        }

        this.setCamera( camera );
        this.setUI( ui );
        if(!this.whileSettings) this.setInputPermission( this.currentRole );
        this.app.fire('setRole', this.currentRole, camera, ui);
    }
};

// Put any entity that has scripts into the variable
// Otherwise, false or null will set off the inputs
PlayerManager.prototype.setInputPermission = function (role) {
    // If the caller identifies the id Number to call the spedific cell in the scripts array
    // call that cell, otherwise call all the cells in the array
    if (role) {
        if (this.app.debug) console.log(`Set an input permission for the role, ${role.name}`);
        if (this.app.touch) {
            const touch = this.app.touch;
            
            touch.off();
            touch.on(pc.EVENT_TOUCHSTART, () => this.setUIInteraction(false), this);
            touch.on(pc.EVENT_TOUCHEND, () => this.setUIInteraction(true), this);
            
            // Role Touch Callbacks
            touch.on(pc.EVENT_TOUCHSTART, role.onTouch.start, role);
            touch.on(pc.EVENT_TOUCHMOVE, role.onTouch.move, role);
            touch.on(pc.EVENT_TOUCHEND, role.onTouch.end, role);
            touch.on(pc.EVENT_TOUCHCANCEL, role.onTouch.cancel, role);
        } else if (this.app.mouse) {
            const mouse = this.app.mouse;
            
            mouse.off();
            mouse.on(pc.EVENT_MOUSEDOWN, () => this.setUIInteraction(false), this);
            mouse.on(pc.EVENT_MOUSEUP, () => this.setUIInteraction(true), this);
            
            // Role Mouse Callbacks
            mouse.on(pc.EVENT_MOUSEDOWN, role.onMouse.press, role);
            mouse.on(pc.EVENT_MOUSEMOVE, role.onMouse.move, role);
            mouse.on(pc.EVENT_MOUSEUP, role.onMouse.release, role);
        }
    } else {
        if (this.app.touch) this.app.touch.off();
        else if (this.app.mouse) this.app.mouse.off();
        
        if (this.app.debug) console.log(`Remove any permission to the input devices`);
    }
};

PlayerManager.prototype.setCamera = function (camera) {
    if (camera) {
        if (this.activeCam) this.activeCam.enabled = false;
        camera.enabled = true;
        this.activeCam = camera;
    }
};

PlayerManager.prototype.setUI = function (UI) {
    if (UI) {
        if (this.activeUI) this.activeUI.enabled = false;
        this.activeUI = UI;
        this.activeUI.enabled = true;
    } else {
        if (this.activeUI) this.activeUI.enabled = false;
    }
};