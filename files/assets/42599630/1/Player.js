const Player = pc.createScript('player');

Player.attributes.add('defaultName', {
    type: 'string',
    title: 'Default Name',
});

Player.attributes.add('defaultCamera', {
    type: 'entity',
    title: 'Default Camera',
});

Player.attributes.add('defaultUI', {
    type: 'entity',
    title: 'Default UI',
});

// initialize code called once per entity
Player.prototype.initialize = function() {
    // Defaulting
    this._name = (this.defaultName? this.defaultName: this.entity.name).toLowerCase();
    if (this.defaultCamera) this.entity.defaultCamera = this.defaultCamera;
    if (this.defaultUI) this.entity.defaultUI = this.defaultUI;
    
    // Temporaily put this entity into an app
    this.app[this._name] = this.entity;
    
    // Setting Input Callbacks
    if(this.app.mouse)
    this.entity.onMouse = {
        press : (event) => this.mouseEvent("press", event),
        move : (event) => this.mouseEvent("move", event),
        release : (event) => this.mouseEvent("release", event),
    };
    
    if(this.app.touch) {
        this.previousTouch = new pc.Vec2();
        this.currentTouch = new pc.Vec2();
        this.touchMoveVelocity = new pc.Vec2();
    
        this.entity.onTouch = {
            start : (event) => this.touchEvent("start", event),
            move : (event) => this.touchEvent("move", event),
            end : (event) => this.touchEvent("end", event),
            cancel : (event) => this.touchEvent("cancel", event),
        };
    }
    
    this.entity.on("destroy", () => {
        delete this.app[this._name];
    }, this);
};

Player.prototype.mouseEvent = function (action, event) {
    let _msg = `${this._name}:mouse${action}`;
    let bttn = "";

    if (event.button >= 0) {
        switch (event.button) {
            case pc.MOUSEBUTTON_LEFT: bttn = "left"; break;
            case pc.MOUSEBUTTON_MIDDLE: bttn = "middle"; break;
            case pc.MOUSEBUTTON_RIGHT: bttn = "right"; break;
        }

        let msg = _msg.concat(":", bttn);
        this.app.fire(msg, event);
        if (this.app.debug) console.log(msg);
    } else if (event.button < 0) {
        const dragEvent = (num, str)  => {
            if (event.buttons[num]) {
                let msg = _msg.concat(":", str);
                this.app.fire(msg, event);
            }
        };
        
        dragEvent(pc.MOUSEBUTTON_LEFT, "left");
        dragEvent(pc.MOUSEBUTTON_MIDDLE, "middle");
        dragEvent(pc.MOUSEBUTTON_RIGHT, "right");
    }
};

Player.prototype.touchEvent = function (action, event) {
    event.event.preventDefault();
    
    let msg = `${this._name}:touch${action}`;
    if (event.touches.length === 1) {
        this.previousTouch.copy(this.currentTouch);
        this.currentTouch.set(event.touches[0].x, event.touches[0].y);
        this.touchMoveVelocity.copy(this.currentTouch).sub(this.previousTouch);
        if (this.app.debug) console.log(this.previousTouch, this.currentTouch, this.touchMoveVelocity);
    }

    event.x = this.currentTouch.x;
    event.y = this.currentTouch.y;
    event.dx = this.touchMoveVelocity.x;
    event.dy = this.touchMoveVelocity.y;

    this.app.fire(msg, event);
};