// loading.js
pc.script.createLoadingScreen(function (app) {
    var showSplash = function () {
        var body = document.body;
        body.style.backgroundColor = '#000';

        // splash wrapper
        var wrapper = document.createElement('div');
        wrapper.id = 'wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.backgroundColor = '#000';
        document.body.appendChild(wrapper);
        
        var logo = document.createElement('img');
        logo.id = 'logo';
        logo.src = 'https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/images/play_text_252_white.png';
        logo.onload = function() {
            var imageWidth = this.offsetWidth;
            var imageHeight = this.offsetHeight;
            var vpWidth = document.documentElement.clientWidth;
            var vpHeight = document.documentElement.clientHeight;
            this.style.position = 'absolute';
            this.style.clipPath = `polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)`;
            this.style.left = `${(vpWidth - imageWidth)/2}px`;
            this.style.top = `${(vpHeight - imageHeight)/2 + window.pageYOffset}px`;
        };
        wrapper.appendChild(logo);
    };

    var hideSplash = function () {
        var splash = document.getElementById('wrapper');
        splash.parentElement.removeChild(splash);
    };

    var setProgress = function (value) {
        var logo = document.getElementById('logo');
        if(logo) {
            value = Math.min(1, Math.max(0, value * 1.1));
            logo.style.clipPath = `polygon(0% 0%, ${value * 100}% 0%, ${value * 100}% 100%, 0% 100%)`;
        }
    };
    
    showSplash();
    
    // Use an image from the assets in the project via the asset registry
    // More information: http://developer.playcanvas.com/en/api/pc.AssetRegistry.html
    
    app.on('preload:start', function () {
    });
    
    app.on('preload:end', function () {
        app.off('preload:progress');
    });
    
    app.on('preload:progress', setProgress);
    app.on('start', hideSplash);
});

// Global.js
const Global = pc.createScript('global');

// initialize code called once per entity
Global.prototype.initialize = function() {
    const url = new URL(window.location.href);
    this.app.debug = parseBoolean(url.searchParams.get("debug"));
    if (this.app.debug) {
        console.log(this.app);
        this.app.root.forEach(function (node) {
            console.log(node.path);
        });
    }
};

// Player.js
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

Player.attributes.add('isHuman', {
    type: 'boolean',
    title: 'Is this controlled by a human player?',
    default: false,
});

// initialize code called once per entity
Player.prototype.initialize = function () {
    // Defaulting
    this._name = (this.defaultName ? this.defaultName : this.entity.name).toLowerCase();
    if (this.defaultCamera) this.entity.defaultCamera = this.defaultCamera;
    if (this.defaultUI) this.entity.defaultUI = this.defaultUI;

    // Temporaily put this entity into an app
    this.app[this._name] = this.entity;

    // Setting Input Callbacks
    if (this.app.mouse)
        this.entity.onMouse = {
            press: (event) => this.mouseEvent("press", event),
            move: (event) => this.mouseEvent("move", event),
            release: (event) => this.mouseEvent("release", event),
        };

    if (this.app.touch) {
        this.previousTouch = new pc.Vec2();
        this.currentTouch = new pc.Vec2();
        this.touchMoveVelocity = new pc.Vec2();

        this.entity.onTouch = {
            start: (event) => this.touchEvent("start", event),
            move: (event) => this.touchEvent("move", event),
            end: (event) => this.touchEvent("end", event),
            cancel: (event) => this.touchEvent("cancel", event),
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
        const dragEvent = (num, str) => {
            if (event.buttons[num]) {
                let msg = _msg.concat(":", str);
                this.app.fire(msg, event);
                if (this.app.debug) console.log(msg);
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

    if (this.app.debug) console.log(msg);
    this.app.fire(msg, event);
};

// PlayerManager.js
const PlayerManager = pc.createScript('playerManager');

// initialize code called once per entity
PlayerManager.prototype.initialize = function () {
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

PlayerManager.prototype.leave = function () { this.setInputPermission(this.currentRole); };
PlayerManager.prototype.enter = function () { this.setInputPermission(false); };

PlayerManager.prototype.setUIInteraction = function (boolean) {

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
            camera = (this.currentRole.script.player.defaultCamera ? this.currentRole.script.player.defaultCamera : camera);
            ui = (this.currentRole.script.player.defaultUI ? this.currentRole.script.player.defaultUI : ui);
        }

        this.setCamera(camera);
        this.setUI(ui);
        if (!this.whileSettings) this.setInputPermission(this.currentRole);
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

// MouseUISender.js
var MouseUISender = pc.createScript('mouseUISender');

MouseUISender.attributes.add('leftIdleText', {
    type: 'string',
    default: 'leftIdle',
});

MouseUISender.attributes.add('leftPressedText', {
    type: 'string',
    default: 'leftPressed',
});

MouseUISender.attributes.add('rightIdleText', {
    type: 'string',
    default: 'rightIdle',
});

MouseUISender.attributes.add('rightPressedText', {
    type: 'string',
    default: 'rightPressed',
});


// initialize code called once per entity
MouseUISender.prototype.initialize = function () {
    this._MOUSEBUTTON_BOTH = 3;

    this.mouseText = {
        leftIdle: this.leftIdleText,
        leftPressed: this.leftPressedText,
        rightIdle: this.rightIdleText,
        rightPressed: this.rightPressedText,
    };
};

// update code called every frame
MouseUISender.prototype.update = function (dt) {

};

MouseUISender.prototype.onMousePressed = function (event) {
    var _button = event.button;
    _button = (event.buttons[pc.MOUSEBUTTON_LEFT] && event.buttons[pc.MOUSEBUTTON_RIGHT] ? this._MOUSEBUTTON_BOTH : _button);

    this.app.constantUI.fire("mousePressed", event);
};

MouseUISender.prototype.onMouseReleased = function (event) {
    var _button = event.button;
    _button = (event.buttons[pc.MOUSEBUTTON_LEFT] && event.buttons[pc.MOUSEBUTTON_RIGHT] ? this._MOUSEBUTTON_BOTH : _button);

    this.app.constantUI.fire("mouseReleased", event);
};

// swap method called for script hot-reloading
// inherit your script state here
// MouseUisender.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/

// MouseUIHandler.js
var MouseUIHandler = pc.createScript('mouseUIHandler');

// initialize code called once per entity
MouseUIHandler.prototype.initialize = function () {
    var mouseUI = this.app.constantUI.findByName("MouseUI");

    this.mouseUIImage = mouseUI.findByName("MouseImage").element;
    this.mouseUIText = {
        left: mouseUI.findByName("LeftText").element,
        right: mouseUI.findByName("RightText").element,
    };

    this.entity.on("mousePressed", this.onMousePressed, this);
    this.entity.on("mouseReleased", this.onMouseReleased, this);

    var mouseTexturesAssets = this.app.assets.findByTag("mouseUI");
    this.mouseTextures = {
        idle: this.app.assets.find("mouse_Idle.png", "texture"),
        left: this.app.assets.find("mouse_LeftPressed.png", "texture"),
        right: this.app.assets.find("mouse_RightPressed.png", "texture"),
        both: this.app.assets.find("mouse_BothPressed.png", "texture"),
    };

    this.mouseText = {
        leftIdle: "leftIdle",
        leftPressed: "leftPressed",
        rightIdle: "rightIdle",
        rightPressed: "rightPressed",
    };

    this.setMouseTextFrom(this.app.playerManager.currentRole);

    this.app.on("setRole", function (_role, camera, ui) {
        this.setMouseTextFrom(_role);
    }, this);

};

MouseUIHandler.prototype.setMouseTextFrom = function (_role) {
    if (_role.script.mouseUISender) {
        this.mouseText = _role.script.mouseUISender.mouseText;
    }
    this.mouseUIText.left.text = this.mouseText.leftIdle;
    this.mouseUIText.right.text = this.mouseText.rightIdle;
};

MouseUIHandler.prototype.onMouse = {
    press: function (event) {
        var _button = event.button;
        var _MOUSEBUTTON_BOTH = 3;

        _button = (event.buttons[pc.MOUSEBUTTON_LEFT] && event.buttons[pc.MOUSEBUTTON_RIGHT] ? _MOUSEBUTTON_BOTH : _button);

        switch (_button) {
            case pc.MOUSEBUTTON_LEFT: {
                this.mouseUIImage.texture = this.mouseTextures.left.resource;
                this.mouseUIText.left.text = this.mouseText.leftPressed;
            } break;

            case pc.MOUSEBUTTON_MIDDLE: {

            } break;

            case pc.MOUSEBUTTON_RIGHT: {
                this.mouseUIImage.texture = this.mouseTextures.right.resource;
                this.mouseUIText.right.text = this.mouseText.rightPressed;
            } break;

            case _MOUSEBUTTON_BOTH: {
                this.mouseUIImage.texture = this.mouseTextures.both.resource;
            } break;
        }
    },

    move: function (event) {
    },

    release: function (event) {
        var _button = event.button;
        var _MOUSEBUTTON_BOTH = 3;

        _button = (event.buttons[pc.MOUSEBUTTON_LEFT] && event.buttons[pc.MOUSEBUTTON_RIGHT] ? _MOUSEBUTTON_BOTH : _button);

        switch (_button) {
            case pc.MOUSEBUTTON_LEFT: {
                if (event.buttons[pc.MOUSEBUTTON_RIGHT]) {
                    this.mouseUIImage.texture = this.mouseTextures.right.resource;
                } else {
                    this.mouseUIImage.texture = this.mouseTextures.idle.resource;
                }
                this.mouseUIText.left.text = this.mouseText.leftIdle;

            } break;

            case pc.MOUSEBUTTON_RIGHT: {
                if (event.buttons[pc.MOUSEBUTTON_LEFT]) {
                    this.mouseUIImage.texture = this.mouseTextures.left.resource;
                } else {
                    this.mouseUIImage.texture = this.mouseTextures.idle.resource;
                }
                this.mouseUIText.right.text = this.mouseText.rightIdle;
            } break;
        }
    },

    out: function (event) {
    },
};
// swap method called for script hot-reloading
// inherit your script state here
// MouseUIHandler.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/

// CCD.js
var Ccd = pc.createScript('CCD');

Ccd.attributes.add('motionThreshold', {
    type: 'number', 
    default: 1, 
    title: 'Motion Threshold', 
    description: 'Number of meters moved in one frame before CCD is enabled'
});

Ccd.attributes.add('sweptSphereRadius', {
    type: 'number', 
    default: 0.2, 
    title: 'Swept Sphere Radius', 
    description: 'This should be below the half extent of the collision volume. E.g For an object of dimensions 1 meter, try 0.2'
});

// initialize code called once per entity
Ccd.prototype.initialize = function() {
    var body; // Type btRigidBody

    body = this.entity.rigidbody.body;
    body.setCcdMotionThreshold(this.motionThreshold);
    body.setCcdSweptSphereRadius(this.sweptSphereRadius);

    this.on('attr:motionThreshold', function(value, prev) {
        body = this.entity.rigidbody.body;
        body.setCcdMotionThreshold(value);
    });
    this.on('attr:sweptSphereRadius', function(value, prev) {
        body = this.entity.rigidbody.body;
        body.setCcdSweptSphereRadius(value);
    });
};

// Dragforce.js
const Dragforce = pc.createScript('dragForce');

// See also the air resistance part in update()
// Instead of using the basic damping in Playcanvas Physics
// I rebuild another code of physics that calculate the deceleration of a ball based on air density.
Dragforce.attributes.add('airdensity', {
    type: 'number',
    title: 'Air Density',
    placeholder: 'kg/m3',
    default: 1.1839,
});

// initialize code called once per entity
Dragforce.prototype.initialize = function () {
    // Physics Variables
    this.radius = this.entity.collision.radius;
    this.currentPosition = new pc.Vec3();
    this.normalVector = new pc.Vec3();
    this.magnusVector = new pc.Vec3();
    this.lookAtVector = new pc.Vec3();
    this.lookAtMatrix = new pc.Mat4();
    this.referenceArea = Math.PI * Math.pow(this.radius, 2);
    this.draggingForce = (_magnitude) => {
        return (-1 / 2 * this.referenceArea * _magnitude * this.airdensity);
    };
};

Dragforce.prototype.update = function (dt) {
    // When rigidboby is enabled
    if (this.entity.rigidbody.enabled) {
        // Calling rigibody per frame
        this.currentPosition.copy(this.entity.getPosition());
        const magnitude = this.entity.rigidbody.linearVelocity.length();

        // The formula of the magnus effect
        /* This relationship is described through
         * 
         * F = ΔPA
         * Where ΔP is the pressure difference between the top and bottom, and A is the cross-sectional area of the ball.
         * 
         * This example demonstrates how a force can be generated through a pressure gradient, and the principal that explains lift of an airfoil.
         * To determine the lift force from such a case as a spinning ball in a flowing fluid, we use the Kutta-Joukowski lift theorem
         * 
         * L = ρ * v * G
         * Where L is the lift, ρ is the density of the air, G is the vortex strength.
         * 
         * Now, the vortex strength can be determined by
         * G = 2 * π * r * Vr
         * Where r is the radius and Vr is the tangential velocity of the sphere.
         * 
         * With this equation you can estimate the lift force  [Magnus Effect In Duct Flow (J.Batko, C.Clarke, K.Smith)].
         */

        this.normalVector.copy(this.entity.rigidbody.linearVelocity).normalize();
        this.lookAtVector.copy(this.currentPosition).add(this.normalVector);
        this.lookAtMatrix.setLookAt(this.currentPosition, this.lookAtVector, pc.Vec3.UP);

        const dragForce = this.normalVector.scale(this.draggingForce(Math.pow(magnitude, 2)));
        this.entity.rigidbody.applyForce(dragForce);

        const matrixConvert = this.lookAtMatrix.transformPoint(this.entity.rigidbody.angularVelocity);
        const horizontalMagnus = this.draggingForce(-matrixConvert.y * Math.abs(magnitude));
        const verticalMagnus = this.draggingForce(matrixConvert.x * Math.abs(magnitude));
        this.magnusVector.set(horizontalMagnus, verticalMagnus, 0);
        this.entity.rigidbody.applyForce(this.magnusVector);
    }
};

// Hit.js
const Hit = pc.createScript('hit');

Hit.attributes.add('bat', {
    type: 'entity',
    title: 'Bat'
});

Hit.attributes.add('hitSpot', {
    type: 'entity',
    title: 'Hitting Spot'
});

Hit.attributes.add('effectEmitter', {
    type: 'entity',
    title: 'Effect Emitter'
});

Hit.attributes.add('constraints', {
    type: 'json',
    title: 'Constraints',
    schema: [
        {
            name: 'x',
            type: 'number',
            default: -0.2,
        },
        {
            name: 'y',
            type: 'number',
            default: 0,
        },
        {
            name: 'z',
            type: 'number',
            default: 1,
        },
    ]
});


// initialize code called once per entity
Hit.prototype.initialize = function() {
    this.device = this.app.graphicsDevice;
    this.view = (this.entity.defaultCamera? this.entity.defaultCamera : this.entity.findByName("Camera"));
    this.shouldTrack = false;
    
    this.entity.on(`tracker:${this.entity.name}`, this.track, this);
    
    // Inning Master Callbacks
    this.app.inningMaster.on("pitch", (ball) => {
        this.shouldTrack = true;
        this.entity.fire("tracker:setTarget", ball);
    }, this);
    
    this.app.inningMaster.on('reset', this.reset, this);
    this.app.inningMaster.on("conclude", () => this.shouldTrack = false, this);
    
    this.hitSpot.on(`contact:${this.app.ball.name}`, (ball, data) => {
        this.app.inningMaster.fire("hit", ball, data);
        this.effectEmitter.fire("emit", data.point);
    }, this);
    
    
    this.originalBatPos = new pc.Vec3().copy(this.bat.getPosition());
    this.hitPosition =  new pc.Vec3();
    this.swingVector = new pc.Vec2();
    this.batConstraints = new pc.Vec3(this.constraints.x, this.constraints.y, this.constraints.z);
    this.lookAtVec3 = new pc.Vec3();

    this.bat.enabled = true;
    this.bat.animation.play("Load.glb", 0.1);
    this.hitSpot.collision.enabled = false;
};

Hit.prototype.postInitialize = function () {
     if (this.bat && this.bat.animation && this.bat.animation.animations["Swing.glb"]) 
        this.animDuration = this.bat.animation.animations["Swing.glb"].duration;
    
    vertices = this.app.strikeZone.getVertices();
    const reducer = (accumulator, currentValue) => accumulator + currentValue;
    let tX = vertices.map(vert => vert.x).reduce(reducer);
    let tY = vertices.map(vert => vert.y).reduce(reducer);
    let tZ = vertices.map(vert => vert.z).reduce(reducer);
    let tNum = vertices.length;

    this.center3D = new pc.Vec3(tX, tY, tZ).divScalar(tNum);
    this.screenVertices = {};

    let scrVerts = vertices.map((vert) => this.view.camera.worldToScreen(vert));

    scrVerts.sort((vec1, vec2) => vec1.x - vec2.x);
    this.screenVertices.x = {min : scrVerts[0].x, max : scrVerts[scrVerts.length-1].x};
    scrVerts.sort((vec1, vec2) => vec1.y - vec2.y);
    this.screenVertices.y = {min : scrVerts[0].y, max : scrVerts[scrVerts.length-1].y};
    
    this.depth = this.app.strikeZone.getDepth(this.view);
};

Hit.prototype.move = function (x, y) {
    if (this.screenVertices && this.center3D) {
        let altX = pc.math.clamp(x, this.screenVertices.x.min, this.screenVertices.x.max);
        let altY = pc.math.clamp(y, this.screenVertices.y.min, this.screenVertices.y.max);

        this.view.camera.screenToWorld(altX, altY, this.depth, this.hitPosition);
        this.hitSpot.setPosition(this.hitPosition);

        var change = this.hitPosition.clone().sub(this.center3D);
        var newBatPos = this.originalBatPos.clone().add(change);
        newBatPos.add2( this.originalBatPos, change.mul(this.batConstraints));

        this.bat.setPosition(newBatPos);
        this.lookAtVec3.set(this.hitPosition.x, this.hitPosition.y, this.originalBatPos.z);
        this.bat.lookAt(this.lookAtVec3, pc.Vec3.UP);
        this.bat.rotateLocal(0,90,0);
        
        this.swingVector.set(x, y);
    }
};

Hit.prototype.swing = function () {
    this.bat.animation.play("Swing.glb");
    this.hitSpot.collision.enabled = true;
    this.shouldTrack = false;
    
    this.swingVector.copy(this.app.centricConverter.convert(this.swingVector));
    this.app.inningMaster.fire('swing', this.swingVector);
};

Hit.prototype.reset = function () {
    this.bat.enabled = true;
    this.bat.animation.play("Load.glb", 0.1);
    this.hitSpot.collision.enabled = false;
    this.shouldTrack = false;
};

Hit.prototype.track = function(data) {
    if (data.isOverCamera && data.time) {
        this.move(data.screenPosition.x, data.screenPosition.y);
        
        let xZoneIn = this.screenVertices.x.min <= data.screenPosition.x && this.screenVertices.x.max >= data.screenPosition.x;
        let yZoneIn = this.screenVertices.y.min <= data.screenPosition.y && this.screenVertices.y.max >= data.screenPosition.y;
        let trackZDist = (data.screenPosition.z - this.depth) + this.app.ball.rigidbody.linearVelocity.z * data.time < 0;
        
        if (trackZDist && xZoneIn && yZoneIn) this.swing();
    }
};

Hit.prototype.update = function(dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request", dt);
    if(this.hitSpot && this.hitSpot.collision.enabled) {
        let currentTime = this.bat.animation.currentTime;
        if (currentTime >= this.animDuration) this.hitSpot.collision.enabled= false;
    }
};

// StrikeZone.js
const StrikeZone = pc.createScript('strikeZone');

// The Zone script is created to get 3D point vertices of a rectangular zone object

// initialize code called once per entity
StrikeZone.prototype.initialize = function () {
    this.app.strikeZone = this.entity;

    this.zoneCenter = new pc.Vec2();
    this.vertices = this.getVertices(this.entity.model);

    this.points = [
        // Line 1
        this.vertices[0],
        this.vertices[2],
        // Line 2
        this.vertices[2],
        this.vertices[3],
        // Line 3
        this.vertices[3],
        this.vertices[1],
        // Line 4
        this.vertices[1],
        this.vertices[0],
    ];

    this.colors = [
        // Line 1
        pc.Color.WHITE,
        pc.Color.WHITE,
        // Line 2
        pc.Color.WHITE,
        pc.Color.WHITE,
        // Line 3
        pc.Color.WHITE,
        pc.Color.WHITE,
        // Line 4
        pc.Color.WHITE,
        pc.Color.WHITE,
    ];

    this.layer = this.app.scene.layers.getLayerById(3);

    this.entity.getDepth = param => this.getDepth(param);
    this.entity.getVertices = () => this.vertices;

    this.entity.on(`contact:${this.app.ball.name}`, (ball, data) => this.app.inningMaster.fire("zone:in", ball, data), this);

    this.entity.on("destroy", () => {
        delete this.app.strikeZone;
    }, this);
};

StrikeZone.prototype.getDepth = function (param) {
    if (param) {
        let distance = null;

        if (param instanceof pc.Vec3)
            distance = param.clone().sub(this.entity.getPosition());
        else if (param.getPosition())
            distance = param.getLocalPosition().clone().sub(this.entity.getLocalPosition());

        if (distance) {
            distance.mul(new pc.Vec3(1, 0, 1));
            distance = distance.length();
            return distance;
        }
    }
};

StrikeZone.prototype.getVertices = function (model) {
    const _array = [];
    const vertexBuffer = model.model.meshInstances[0].mesh.vertexBuffer;
    const indexBuffer = model.model.meshInstances[0].mesh.indexBuffer[0];

    const vertexIterator = new pc.VertexIterator(vertexBuffer);
    const verticesNum = vertexBuffer.getNumVertices();
    const indices = new Uint16Array(indexBuffer.lock());
    indexBuffer.unlock();

    for (let i = 0; i < verticesNum; i++) {
        let index = vertexIterator.element.POSITION.index;
        let x = vertexIterator.element.POSITION.array[index];
        let y = vertexIterator.element.POSITION.array[index + 1];
        let z = vertexIterator.element.POSITION.array[index + 2];
        _array.push(new pc.Vec3(x, y, z));
        vertexIterator.next();
    }
    vertexIterator.end();

    const transformMatrix = model.entity.getWorldTransform();
    return _array.map((point, i, arr) => transformMatrix.transformVector(point).add(model.entity.getPosition()));
};

// update code called every frame
StrikeZone.prototype.update = function (dt) {
    if (this.points && this.colors) {
        this.app.drawLines(this.points, this.colors, {
            layer: this.layer,
            depthTest: false
        });
    }
};

// Pitch.js
const Pitch = pc.createScript('pitch');

Pitch.attributes.add('ballTemplate', {
    title: 'Ball Template',
    type: 'asset',
});

Pitch.attributes.add('weightCurve', {
    title: 'Weight Curve',
    type: 'json',
    schema: [{
        name: "linear",
        type: 'curve',
        title: 'Linear Weights',
        max: 1,
        min: 0,
    }, {
        name: "angular",
        type: 'curve',
        title: 'Angular Weights',
        max: 1,
        min: 0,
    }]
});

Pitch.attributes.add('coefficient', {
    type: 'json',
    schema: [{
        name: "linear",
        type: 'number',
        title: 'Linear Velocity Coefficient',
        default: 50,
    }, {
        name: "angular",
        type: 'number',
        title: 'Angular Velocity Coefficient',
        default: 200,
    }]
});

Pitch.attributes.add('config', {
    type: 'json',
    title: 'Configuration',
    schema: [{
        name: "historyNum",
        title: 'History Numbers',
        type: 'number',
        default: 8
    }, {
        name: "baselineAngle",
        type: 'number',
        title: 'What Maximum Degree the baseline is to mitigate the vertical and horizontal movement of the ball when pitching',
        placeholder: 'deg',
        default: 40,
    }, {
        name: "minimumVelocity",
        title: 'The Minimum Velocity to Throw a Ball',
        type: 'number',
        default: 30
    }]
});

Pitch.prototype.initialize = function () {
    // Declaration
    // this.view will be declared as the default Camera set in Player Script
    // Otherwise, find Camera entity if available
    this.view = (this.entity.defaultCamera ? this.entity.defaultCamera : this.entity.findByName("Camera"));

    // ReferenceDim
    this.device = this.app.graphicsDevice;
    this.referenceDim = (this.device.width + this.device.height) / 2;
    this.screenRatio = {
        width: (this.referenceDim * this.device.maxPixelRatio) / this.device.width,
        height: (this.referenceDim * this.device.maxPixelRatio) / this.device.height,
    };

    this.device.on('resizecanvas', function (width, height) {
        this.screenRatio[width] = (this.referenceDim.width * this.device.maxPixelRatio) / this.device.width;
        this.screenRatio[height] = (this.referenceDim.height * this.device.maxPixelRatio) / this.device.height;
    }, this);

    // Input Velocitys
    const _inputVelocity = function () {
        this.screen = new pc.Vec2();
        this.world = new pc.Vec3();
    };

    this.inputVelocity = {
        linear: new _inputVelocity(),
        angular: new _inputVelocity(),
    };

    this.mouseHistory = {
        length: this.config.historyNum,
        delta: new pc.Vec2Array(this.config.historyNum),
        accel: new pc.Vec2Array(this.config.historyNum - 1),
        pos: new pc.Vec2Array(this.config.historyNum),
    };

    // Push new vectors while discharging the latest vectors
    Object.defineProperty(this.mouseHistory, 'pushDelta', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (dx, dy) {
            this.delta.push(dx, dy);

            for (let i = 0; this.length - 1 > i; ++i) {
                this.accel.vectors[i].sub2(this.delta.vectors[i], this.delta.vectors[i + 1]);
            }
            this.accel.update();
        }
    });

    Object.defineProperty(this.mouseHistory, 'pushPos', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (x, y) {
            this.pos.push(x, y);
        }
    });

    // Reset all the vectors to 0, 0
    Object.defineProperty(this.mouseHistory, 'reset', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function () {
            this.delta.reset();
            this.pos.reset();
            this.accel.reset();
        }
    });

    // Initialization of physics-related values
    this.depth = Math.abs(this.entity.getPosition().sub(this.view.getPosition()).z); // Apply pc.Vec3.sub() to two pc.Vec3 objects and get absolute number of Z difference between two objects.
    this.viewMatrix = new pc.Mat4();
    this.linearVelocity = new pc.Vec3();
    this.angularVelocity = new pc.Vec3();

    this.tangents = new pc.Vec2Array(this.config.historyNum);
    this.normals = new pc.Vec2Array(this.config.historyNum);
    this.averageTangents = new pc.Vec2();
    this.averageNormals = new pc.Vec2();

    this.reset();

    // Event Handler
    // Listen to global app events
    this.app.inningMaster.on('reset', this.reset, this);

    let onCloseSettings = () => this.safetyLock = false;
    this.app.on("close:settings", onCloseSettings, this);

    // Input Callbacks
    const _press = (event) => {
        if (this.canPitch) {
            this.safetyLock = true;
            this.app.ball.setPosition(this.view.camera.screenToWorld(event.x, event.y, this.depth));
            this.mouseHistory.reset();
            this.mouseHistory.pos.brutalSet(event.x, event.y);
        }
    };

    const _move = (event) => {
        if (this.canPitch && this.safetyLock) this.move(event);
    };

    const _release = (event) => {
        if (this.canPitch && this.safetyLock) this.pitch(event.x, event.y);
    };

    // Mouse
    if (this.app.mouse) {
        this.app.on("pitcher:mousepress:left", _press, this);
        this.app.on("pitcher:mousemove:left", _move, this);
        this.app.on("pitcher:mouserelease:left", _release, this);
    }

    // Touch
    if (this.app.touch) {
        this.app.on("pitcher:touchstart", _press, this);
        this.app.on("pitcher:touchmove", _move, this);
        this.app.on("pitcher:touchend", _release, this);
    }

    this.entity.on("destroy", () => {
        this.app.off("pitcher:mousepress:left", _press, this);
        this.app.off("pitcher:mousemove:left", _move, this);
        this.app.off("pitcher:mouserelease:left", _release, this);

        this.app.off("pitcher:touchstart", _press, this);
        this.app.off("pitcher:touchmove", _move, this);
        this.app.off("pitcher:touchend", _release, this);

        this.app.off("close:settings", onCloseSettings, this);
    }, this);
};

Pitch.prototype.move = function (_event) {
    this.mouseHistory.pushDelta(_event.dx * this.screenRatio.width, _event.dy * this.screenRatio.height);
    this.mouseHistory.pushPos(_event.x, _event.y);
    this.app.ball.setPosition(this.view.camera.screenToWorld(_event.x, _event.y, this.depth));
};

Pitch.prototype.pitch = function (x, y) {
    // Get both linear and angular velocity from mouse tangents in the mouse history
    this.inputVelocity.linear.screen.set(
        pc.customMath.averageFloatArray(this.mouseHistory.delta.x, this.weightCurve.linear),
        pc.customMath.averageFloatArray(this.mouseHistory.delta.y, this.weightCurve.linear)
    );

    this.inputVelocity.angular.screen.set(
        pc.customMath.averageFloatArray(this.mouseHistory.accel.x, this.weightCurve.angular),
        pc.customMath.averageFloatArray(this.mouseHistory.accel.y, this.weightCurve.angular)
    );

    this.inputVelocity.linear.world.copy(this.view.camera.screenToWorld(x + this.inputVelocity.linear.screen.x, y + this.inputVelocity.linear.screen.y, this.depth));
    this.inputVelocity.linear.world.sub(this.app.ball.getPosition()).scale(this.coefficient.linear);

    this.inputVelocity.angular.world.copy(this.view.camera.screenToWorld(x + this.inputVelocity.angular.screen.x, y + this.inputVelocity.angular.screen.y, this.depth));
    this.inputVelocity.angular.world.sub(this.app.ball.getPosition()).scale(this.coefficient.angular);

    var magnitude = pc.customMath.averageFloatArray(this.mouseHistory.delta.lengths, this.linearWeights);

    // Normalize the delta to apply accurate this.inputVelocity.angular.world.z
    // Unit Normal Vector != Normalized Vector
    var self = this;

    this.mouseHistory.delta.vectors.forEach(function (element, i) {
        self.tangents.vectors[i].copy(element.normalize().clone());
    });

    for (var i = 0; this.tangents.vectors.length - 1 > i; ++i) {
        this.normals.vectors[i].copy(this.tangents.vectors[i + 1].clone().sub(this.tangents.vectors[i]));
    }

    this.tangents.update();
    this.normals.update();

    this.averageTangents.set(pc.customMath.averageFloatArray(this.tangents.x), pc.customMath.averageFloatArray(this.tangents.y));
    this.averageNormals.set(pc.customMath.averageFloatArray(this.normals.x), pc.customMath.averageFloatArray(this.normals.y));

    if (this.app.debug) console.log(`this.tangents`, this.tangents, `this.normals`, this.normals);

    var curvature = this.averageNormals.clone().scale(15).lengthSq(); // which is same as normalizedDelta[5].clone().sub(normalizedDelta[0])

    // Brutal forcing tangent direction
    var firstSection = (this.averageNormals.x > 0 && this.averageNormals.y < 0);
    var secondSection = (this.averageNormals.x > 0 && this.averageNormals.y > 0);
    var thirdSection = (this.averageNormals.x < 0 && this.averageNormals.y > 0);
    var fourthSection = (this.averageNormals.x < 0 && this.averageNormals.y < 0);

    var clockwise = (firstSection && this.averageTangents.x > 0 && this.averageTangents.y > 0) || (secondSection && this.averageTangents.x < 0 && this.averageTangents.y > 0) || (thirdSection && this.averageTangents.x < 0 && this.averageTangents.y < 0) || (fourthSection && this.averageTangents.x > 0 && this.averageTangents.y < 0);

    var viewAngle = this.view.getEulerAngles();
    this.viewMatrix.setFromEulerAngles(viewAngle.x, viewAngle.y, viewAngle.z);

    // Velocity final calculation
    // The more spin the ball has, the less vertical and horizontal velocity applies. 30deg
    this.linearVelocity.set(this.inputVelocity.linear.world.x * Math.abs(this.inputVelocity.angular.world.x) / this.config.baselineAngle, this.inputVelocity.linear.world.y * Math.abs(this.inputVelocity.angular.world.y) / this.config.baselineAngle, (this.inputVelocity.linear.world.z + magnitude) * -1);
    this.angularVelocity.set(this.inputVelocity.angular.world.y, -this.inputVelocity.angular.world.x, curvature * (clockwise ? -1 : 1));

    const data = {
        mouseHistory: this.mouseHistory.pos.vectors,
        inputVelocity: { linear: this.inputVelocity.linear.screen, angular: this.inputVelocity.angular.screen },
        linearVelocity: this.viewMatrix.transformPoint(this.linearVelocity),
        angularVelocity: this.viewMatrix.transformPoint(this.angularVelocity),
    };

    if (this.linearVelocity.length() > this.config.minimumVelocity) {
        this.app.inningMaster.fire('pitch', this.app.ball, data);
        this.canPitch = false;
    }
};

Pitch.prototype.reset = function () {
    this.canPitch = true;
    this.safetyLock = false;
    this.mouseHistory.reset();

    this.app.ball = this.ballTemplate.resource.instantiate();
    this.entity.addChild(this.app.ball);
    this.app.ball.enabled = true;
};

// SpinPreviewUI.js
const SpinPreview = pc.createScript('spinPreview');

SpinPreview.attributes.add('entities', {
    type: 'json',
    title: 'Entities',
    schema: [{
        name: "plane",
        title: "Plane",
        type: 'entity',
    },{
        name: "ballPreview",
        title: "Ball Preview",
        type: 'entity',
    },{
        name: "camera",
        title: "Camera",
        type: 'entity',
    },]
});

// initialize code called once per entity
SpinPreview.prototype.initialize = function() {
    this.device = this.app.graphicsDevice;
    
    // Create a 512x512x24-bit render target with a depth buffer
    const colorBuffer = new pc.Texture(this.device, {
        name: "TrackingScreen",
        width: 512,
        height: 512,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
        autoMipmap: true,
        minFilter: pc.FILTER_LINEAR,
        magFilter: pc.FILTER_LINEAR,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });

    const depthBuffer = new pc.Texture(this.device, {
        name: "TrackingScreen_Depth",
        width: 512,
        height: 512,
        format: pc.PIXELFORMAT_DEPTHSTENCIL,
        mipmaps: false,
        minFilter: pc.FILTER_NEAREST,
        magFilter: pc.FILTER_NEAREST,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });

    const layer = this.app.scene.layers.getLayerByName('TrackingCamera');
    layer.renderTarget = new pc.RenderTarget({
        colorBuffer: colorBuffer,
        depthBuffer: depthBuffer,
        depth: true,
        stencil: true,
    });
    
    this.entities.plane.element.texture = layer.renderTarget.colorBuffer;
    
    // Communication
    this.app.inningMaster.on('pitch', (ball, data) => {
        this.entities.ballPreview.rigidbody.angularVelocity = data.angularVelocity;
    }, this);
    
    this.app.inningMaster.on('reset', () => {
        this.entities.ballPreview.rigidbody.angularVelocity = pc.Vec3.ZERO;
        this.entities.ballPreview.rigidbody.enabled = false;
        this.entities.ballPreview.setRotation(0, 0, 0, 1);
        this.entities.ballPreview.rigidbody.enabled = true;
    }, this);
};

// Spectate.js
var Spectate = pc.createScript('spectate');

Spectate.attributes.add('cameras', {
    type: 'entity',
    array: true,
    title: 'Camera Array',
});

// initialize code called once per entity
Spectate.prototype.initialize = function () {
    this.initialCamera = this.entity.findByPath("Camera");
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
    if (this.cameraNum >= this.cameras.length) this.cameraNum = 0;

    let cameraEntity = this.cameras[this.cameraNum];
    this.app.playerManager.setCamera(cameraEntity);
};

Spectate.prototype.checkCameraNumber = function (_camEntity) {
    let _cameraNum = this.cameras.indexOf(_camEntity);
    if (_cameraNum > 0) return _cameraNum; else return 0;
};

// InningMaster.js
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
    this.on("pitch", (ball, data) => {
        ball.fire("pitch", data.linearVelocity, data.angularVelocity);
        this.fire("input:pitch", data.mouseHistory, data.inputVelocity.linear, data.inputVelocity.angular);
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
    
    this.app.playerManager.setRole(this.app.pitcher);
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

// EffectEmitter.js
const EffectEmitter = pc.createScript('effectEmitter');

EffectEmitter.attributes.add('emitters', {
    type: 'entity',
    title: 'Emitters',
    array: true,
});

// initialize code called once per entity
EffectEmitter.prototype.initialize = function() {
    if (this.app.debug) console.log(this.emitters);
    this.entity.on('emit', this.emit, this);
};

EffectEmitter.prototype.emit = function( _position ) {
    this.emitters.forEach( (emitter, i, array) => {
        emitter.setPosition( _position );
        if (emitter.particlesystem) {
            const particlesystem = emitter.particlesystem;
            if ( !particlesystem.isPlaying() ) particlesystem.play();
            particlesystem.reset();
        }
        
        if(emitter.sprite) {
            let clips = Object.values(emitter.sprite.clips);
            if (this.app.debug) console.log(clips);
            emitter.sprite.play(clips[0].name);
        }
    });
};

// PitchInputUI.js
class PitchInputUI extends pc.ScriptType {
    initialize() {
        this.device = this.app.graphicsDevice;
        this.screen = this.UIEntity.screen;
        this.correctionRatio = this.device.maxPixelRatio / this.screen.scale;
        if (this.reset) this.reset();

        this.device.on('resizecanvas', function (width, height) {
            this.screen = this.UIEntity.screen;
            this.correctionRatio = this.device.maxPixelRatio / this.screen.scale;
            if (this.app.debug) console.log(`Canvas Resized. this.device.maxPixelRatio / this.screen.scale = ${this.correctionRatio}`);
        }, this);
        
        const inputHandler = (_mousePos, _linear, _angular) => { if (this.display) this.display(_mousePos, _linear, _angular); };

        this.app.inningMaster.on('input:pitch', inputHandler, this);
        this.app.inningMaster.on("reset", () => { if (this.reset) this.reset(); }, this);
        this.on("enable:inputUI", (boolean) => {
            if (this.reset) this.reset();
            if (boolean) this.app.inningMaster.on('input:pitch', inputHandler, this);
            else this.app.inningMaster.off('input:pitch', inputHandler, this);
        }, this);
    }
}

class ArrowUI extends PitchInputUI {
    initialize() {
        super.initialize();
        this.mousePosition = new pc.Vec2();
        this.linearVector = new pc.Vec2();
        this.angularVector = new pc.Vec2();
        
        this.initialOpacity = {
            velArrow : this.arrow.velocity.element.opacity,
            accelArrow : this.arrow.acceleration.element.opacity,
        };
        
        this.magnitude = {
            linear : null,
            angular : null,
        };
    }
    
    display(_mousePos, _linear, _angular) {
        this.mousePosition.copy(_mousePos[0]).scale(this.correctionRatio);
        this.linearVector.copy(_linear);
        this.angularVector.copy(_angular); 

        this.magnitude.linear = this.linearVector.length() / this.expectation.velocity;
        this.magnitude.angular = this.angularVector.length() / this.expectation.acceleration;

        this.linearVector.normalize();
        this.angularVector.normalize();

        let linearAngle = pc.customMath.vec2ToDeg(this.linearVector, true);
        let angularAngle = pc.customMath.vec2ToDeg(this.angularVector, true);

        this.arrow.velocity.enabled = true;
        this.arrow.velocity.setLocalPosition(this.mousePosition.x, -this.mousePosition.y, 0);
        this.arrow.velocity.setLocalEulerAngles(0, 0, linearAngle );
        this.arrow.velocity.setLocalScale( pc.math.clamp(this.magnitude.linear * 3, 0, 1) , this.magnitude.linear, 1);

        if (this.magnitude.angular > 0.2) {
            this.arrow.acceleration.enabled = true;
            this.arrow.acceleration.setLocalPosition(this.mousePosition.x, -this.mousePosition.y, 0);
            this.arrow.acceleration.setLocalEulerAngles(0, 0, angularAngle );
            this.arrow.acceleration.setLocalScale( pc.math.clamp(this.magnitude.angular * 3, 0, 1) , this.magnitude.angular, 1);
        }

        if (this.app.debug) console.log(`Linear Magnitude : ${this.magnitude.linear}\nAngular Magnitude : ${this.magnitude.angular}`);
    }
    
    reset() {
        this.arrow.velocity.enabled = false;
        this.arrow.acceleration.enabled = false;
    }
}

pc.registerScript(ArrowUI, "arrowUI");

ArrowUI.attributes.add('UIEntity', {
    type: 'entity',
    title: 'UI Entity',
});

ArrowUI.attributes.add('arrow', {
    type: 'json',
    title: 'Arrow Entity',
    schema: [{
        name: "velocity",
        type: 'entity',
        title: 'Velocity Arrow',
    }, {
        name: "acceleration",
        type: 'entity',
        title: 'Acceleration Arrow',
    }]
});

ArrowUI.attributes.add('expectation', {
    type: 'json',
    title: 'Expected Values',
    schema: [{
        name: "velocity",
        type: 'number',
        title: 'Velocity Expectation',
        default: 50,
    }, {
        name: "acceleration",
        type: 'number',
        title: 'Acceleration Expectation',
        default: 35,
    }]
});

class MouseHistoryUI extends PitchInputUI {
    initialize() {
        super.initialize();
    }
    
    display(_mousePos, _linear, _angular) {
        for(let i = 0; i < _mousePos.length; i++) {
            let e = this.spot.clone();
            this.entity.addChild(e);
            e.tags.add("Temporary");
            e.setLocalPosition(_mousePos[i].x * this.correctionRatio, -_mousePos[i].y * this.correctionRatio, 0);
            e.enabled = true;
        }
    }
    
    reset() {
        let historySpots = this.entity.findByTag('Temporary');
        if(historySpots.length > 0) historySpots.forEach((e) => e.destroy());
    }
    
}

pc.registerScript(MouseHistoryUI, "mouseHistoryUI");

MouseHistoryUI.attributes.add('UIEntity', {
    type: 'entity',
    title: 'UI Entity',
});

MouseHistoryUI.attributes.add("spot", {
    type: 'entity',
    title: 'Spot',
});

// PitcherUI.js
const PitcherUI = pc.createScript('pitcherUI');

PitcherUI.attributes.add('UIelements', {
    type: 'json',
    title: 'UI Elements',
    schema: [{
        name: "statusText",
        type: 'entity',
    }, {
        name: "umpireSignal",
        type: 'entity',
    }]
});

// initialize code called once per entity
PitcherUI.prototype.initialize = function() {
    this.app.inningMaster.on('pitch', this.onPitch, this);
    this.app.inningMaster.on('conclude', (ball) => this.showUmpireText(ball), this);
    this.app.inningMaster.on("reset", this.reset, this);
    
    this.app.on("change:settings", this.onChangeSettings, this);
    
    this.entity.on("destroy", () => {
        this.app.off("change:settings", this.onChangeSettings, this);
    }, this);
};

PitcherUI.prototype.postInitialize = function() {
    this.onChangeSettings();
};

PitcherUI.prototype.onChangeSettings = function() {
    switch (parseInt(this.app.settings.pitchTraceDisplay)) {
        case 0:
            this.entity.script.arrowUI.fire("enable:inputUI", true);
            this.entity.script.mouseHistoryUI.fire("enable:inputUI", false);
            break;
        case 1: 
            this.entity.script.arrowUI.fire("enable:inputUI", false);
            this.entity.script.mouseHistoryUI.fire("enable:inputUI", true);
            break;
    }
};

PitcherUI.prototype.onPitch = function(ball, data) { 
    this.UIelements.statusText.element.text = "Speed : " + pc.customMath.round( data.linearVelocity.length() ,1) + "mps";
};

PitcherUI.prototype.showUmpireText = function(ball) {
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    this.UIelements.umpireSignal.enabled = true;
    this.UIelements.umpireSignal.element.text = capitalize(ball.status);
};

PitcherUI.prototype.reset = function() {
    this.UIelements.umpireSignal.enabled = false;
};

// Ball.js
const Ball = pc.createScript('ball');

// initialize code called once per entity
Ball.prototype.initialize = function () {
    this.statusList = Object.freeze(['wild', 'strike', 'ball', 'hit', 'foul', 'home run']); // Freezing the options of status
    this.entity.status = this.statusList[2]; // Default status : Ball
    this.stabilize(); // Disalbe Rigidbody First

    // Communications
    this.entity.collision.on('collisionstart', this.onCollider, this);

    // If a mitt entity catches a ball, then stabilize the ball.
    this.entity.once('catch', this.stabilize, this);

    this.entity.once('pitch', (_linearVelocity, _angularVelocity) => {
        this.entity.rigidbody.enabled = true;
        this.entity.rigidbody.linearVelocity = _linearVelocity;
        this.entity.rigidbody.angularVelocity = _angularVelocity;
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
    this.entity.once('foul', () => {
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
};

Ball.prototype.update = function (dt) {
    this.magnitude = this.entity.rigidbody.linearVelocity.length();

    if (this.checkSpeed) {
        if (this.magnitude < 10) {
            if (this.app.debug) console.log(this.magnitude);
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

// TokenCounter.js
const TokenCounter = pc.createScript('tokenCounter');

TokenCounter.attributes.add('token', {
    type: 'entity',
    title: 'Token',
});

TokenCounter.attributes.add('number', {
    type: 'number',
    title: 'Number',
    description: 'The Maximum Number of Tokens',
    min: 1,
    precision: 0,
    step: 1,
});

TokenCounter.attributes.add('interpolation', {
    type: 'json',
    title: 'Interpolation',
    schema: [{
        name: "x",
        type: 'number',
    }, {
        name: "y",
        type: 'number',
    }, {
        name: "z",
        type: 'number',
    }]
});

// initialize code called once per entity
TokenCounter.prototype.initialize = function() {
    this.token.initialPosition = this.token.getLocalPosition();
    this.interpolation.vector = new pc.Vec3(this.interpolation.x, this.interpolation.y, this.interpolation.z);
    this.tokens = [this.token];
    this.count = 0;
    
    const _vector = this.interpolation.vector.clone();
    
    for (let i = 1; i < this.number; i++) {
        const _token = this.token.clone();
        this.entity.addChild(_token);
        _token.translateLocal( _vector );
        _vector.add(this.interpolation.vector);
        this.tokens.push(_token);
    }
    
    this.entity.on("getCount", (count, script) => script[count] = this.count, this);
    this.entity.on("increment", this.increment, this);
    this.entity.on("decrement", this.decrement, this);
    this.entity.on("reset", this.reset, this);
    
    this.tokens.forEach(function (_token, i, _tokens) {
        _token.element.spriteFrame = 0;
    });
};

TokenCounter.prototype.increment = function() {
    if (this.count < 0) {
        this.count = 0;
    } else if (this.count > this.number-1) {
        this.count = this.number-1;
        this.entity.fire("max");
    } else {
        this.tokens[this.count].fire("on");
        this.count++;
    }
};

TokenCounter.prototype.decrement = function() {
    if (this.count < 0) {
        this.count = 0;
        this.entity.fire("min");
    } else if (this.count > this.number-1) {
        this.count = this.number-1;
    } else {
        this.tokens[this.count].fire("off");
        this.count--;
    }
};

TokenCounter.prototype.reset = function() {
    this.tokens.forEach( (_token, i, _tokens) => {
        _token.fire("off");
    });
    this.count = 0;
};

// Token.js
const Token = pc.createScript('token');

// initialize code called once per entity
Token.prototype.initialize = function() {
    this.sprite = this.entity.element.sprite;
    if (this.sprite) {
        this.entity.on("on", function () {
            this.entity.element.spriteFrame = 1;
            if (this.app.debug) console.log(`Token Status Change ${this.entity.element.spriteFrame > 0? "on": "off"}`); 
        }, this);

        this.entity.on("off", function () {
            this.entity.element.spriteFrame = 0;
            if (this.app.debug) console.log(`Token Status Change ${this.entity.element.spriteFrame > 0? "on": "off"}`); 
        }, this);
    } else {
        console.error(`No ${this.sprite}`);
    }
};

// ReplayManager.js
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

// RaycastContact.js
const RaycastContact = pc.createScript('raycastContact');

// initialize code called once per entity
RaycastContact.prototype.initialize = function () {
    // Physics Variables
    this.initialPosition = this.entity.getPosition().clone(); // Get the position ofthe beginning stage. This will be reㅠㅜused in onCatch() function
    this.currentPosition = this.initialPosition.clone();
    this.previousPosition = this.initialPosition.clone();
};

RaycastContact.prototype.update = function (dt) {
    if (this.entity.rigidbody.enabled) {
        // Record previous position and current position
        this.previousPosition.copy(this.currentPosition);
        this.currentPosition.copy(this.entity.getPosition());

        // Raycasting Entities
        const raycastedResults = this.app.systems.rigidbody.raycastAll(this.previousPosition, this.currentPosition);

        if (raycastedResults.length > 0) {
            raycastedResults.map(result => {
                let data = {
                    entity: result.entity,
                    normal: result.normal,
                    point: result.point,
                };
                data.entity.fire(`contact:${this.entity.name}`, this.entity, data);
            });
        }
    }
};

// Recorder.js
const Recorder = pc.createScript('recorder');

Recorder.attributes.add('properties', {
    title: 'Properties',
    array: true,
    type: 'string', 
});

// initialize code called once per entity
Recorder.prototype.initialize = function() {
    this.isRecording = false;
    this.time = 0;
    
    this.app.inningMaster.on('record:start', () => this.isRecording = true, this);
    this.app.inningMaster.on('record:stop', () => this.isRecording = false, this);
    this.app.inningMaster.on('reset', this.reset, this);
    this.recordedProperties = {};
};

// update code called every frame
Recorder.prototype.update = function(dt) {
    if(this.isRecording) {
        const self = this;
        const entity = self.entity;
        
        this.properties.forEach( property => { // property = getAnimation("Play", {key:val1, name:val2}).omg
            if(this.app.debug) console.log(`\nRecorder debugging, Property: ${property}`);
            let splitted = property.split(/\.(?!([^.]*\)))/g); // splitted = ['getAnimation("Play", {key:val1, name:val2})', undefined, 'omg']
            splitted = splitted.filter(property => property !== undefined);
            if(this.app.debug) console.log(`Splitting a property: ${splitted}`);
            
            let value = entity;
            let num = 0;

            while (num < splitted.length) {
                // Break if the value is not an object
                if (typeof value !== 'object') break;
                
                // Find any argument inside parenthesises
                // And if it is true, then do the process
                let arg = splitted[num].match(/\((.+?)\)/g);
                // Something matches splitted[0] = 'getAnimation("Play", {key:val1, name:val2})'.
                // And the actual value that is tested would be '("Play", {key:val1, name:val2})'
                if (arg) {
                    // arg = '"Play", {key:val1, name:val2}'
                    arg.replace(/[\)\()]/g, ""); // Find any parenthesis and remove it
                    
                    // Put the cleansed argument to data then parse it
                    // So it becomes an object with the array data
                    // that will be put inside the value.apply
                    arg = `{"data":[${arg}]}`;
                    arg = JSON.parse(arg);
                    if(this.app.debug) console.log(`Argument : ${arg}`);
                    
                    // Remove the arguments temporarily then apply them to function
                    splitted[num] = splitted[num].replace(/(\()(.+?)(\))/g, "");
                } else { // Even if the space between parenthesises is empty, remove parenthesises when it has it
                    splitted[num] = splitted[num].replace(/\(\)|\(\s\)/g, "");
                }
                
                value = value[splitted[num]];
                
                if (typeof value === 'function') {
                    if (arg) value = value.apply(entity, arg.data);
                    else value = value.call(entity);
                }
                num++;
            }
            self.recordedProperties[property] = value;
            if(this.app.debug) console.log(`Final Value :`, value);
        });
        this.time += dt;
        this.recordedProperties.time = this.time;
        this.entity.fire("record:send", JSON.stringify(this.recordedProperties));
    }
};

Recorder.prototype.reset = function () {
    this.time = 0;
    this.recordedProperties = {};
};

// AfterHitPerspective.js
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

AfterHitPerspective.prototype.initialize = function () {
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

AfterHitPerspective.prototype.postInitialize = function () {
    if (this.timerManager) this.transitionTimer = this.timerManager.add(0.5, () => {
        this.app.playerManager.setCamera(this.cameras[this.camNum]);
        this.app.playerManager.setUI(this.ui);
    }, this);
};

AfterHitPerspective.prototype.onHit = function (ball) {
    if (this.active === false) {
        this.active = true;
        this.camNum = Math.floor(pc.math.random(0, this.maxNum));
        if (this.camNum > this.maxNum) this.camNum = this.maxNum - 1;
        if (this.transitionTimer) this.timerManager.start(this.transitionTimer);

    }
};

AfterHitPerspective.prototype.onFoul = function (ball) {
    this.ui.findByName("UmpireSignal").enabled = true;
};

AfterHitPerspective.prototype.update = function (dt) {
    if (this.active) {
        for (const camera of this.cameras) {
            camera.lookAt(this.app.ball.getPosition());
        }
    }
};

AfterHitPerspective.prototype.reset = function () {
    this.ui.findByName("UmpireSignal").enabled = false;
};


// ChangeScene.js
const ChangeScene = pc.createScript('changeScene');

ChangeScene.attributes.add("sceneName", { type: "string", default: "", title: "Scene Name to Load" });

ChangeScene.prototype.initialize = function () {
    this.entity.on("load", this.loadScene, this);
};

ChangeScene.prototype.loadScene = function () {
    // Get a reference to the scene's root object
    // let oldHierarchy = this.app.root.findByName('Root');

    // Get the path to the scene
    // let scene = this.app.scenes.find(this.sceneName);

    // Load the scenes entity hierarchy
    this.app.scenes.changeScene(this.sceneName, function (err, scene) {
        if (!err) {
        } else {
            console.error(err);
        }
    });
};

// Loader.js
const Loader = pc.createScript('loader');

Loader.attributes.add('targetAssets', {
    type: 'json',
    title: 'Assets',
    schema: [{
        name: "direct",
        type: 'asset',
        array: true,
    }, {
        name: "tag",
        type: 'string',
        array: true,
    }]
});

Loader.attributes.add('config', {
    title: 'Configuration',
    type: 'json',
    schema: [{
        name: "autoCheck",
        type: 'boolean', 
        title: 'Auto Check',
        default: true,
    },{
        name: "checkOnly",
        type: 'boolean', 
        title: 'Check Only',
        default: false,
    }]
});

// initialize code called once per entity
Loader.prototype.initialize = function() {
    this.assetsNum = 0;
    this.allLoaded = false;
    
    this.assets = this.targetAssets.direct; // Array
    this.targetAssets.tag.forEach((tag, i, tags) => {
        for (let asset of this.app.assets.findByTag(tag)) {
            this.assets.push(asset);
        }
    });
    
    this.entity.on("check:loader", this.checkLoad, this);
    if(this.config.autoCheck) this.checkLoad();
};

Loader.prototype.postInitialize = function() {
    if (!this.allLoaded && !this.checkOnly) {
        for (let asset of this.assets) {
            if (!asset.loaded) {
                this.app.assets.load(asset);
            }
        }
    }
};

Loader.prototype.checkLoad = function() {
    this.assetsNum = 0;
    const numCheck = () => {
        ++this.assetsNum;
        if (this.assetsNum >= this.assets.length) {
            this.entity.fire("load");
            this.allLoaded = true;
        }
    };
    
    this.assets.forEach((asset, i, assets) => {
        if(asset.loaded) {
            numCheck();
        } else {
            asset.ready(function (asset) {
                numCheck();
            }, this);
        }
    });
};


// ModelFader.js
const ModelFader = pc.createScript('modelFader');

ModelFader.attributes.add('config', {
    title: 'Configuration',
    type: 'json',
    schema: [{
        name: "time",
        type: 'number', 
        title: 'Time',
        min: 0,
    },{
        name: "opacity",
        type: 'curve', 
        title: 'Opacity',
        max: 1,
        min: 0,
    },]
});

ModelFader.prototype.initialize = function() {
    this.device = this.app.graphicsDevice;

    this.model = this.entity.model;
    this.loaded = false;
    this.time = 0;
    this.opacity = 0;
    
    if (this.model) {
        if (this.model.enabled) 
            this.model.enabled = false;
        if (this.model.meshInstances && this.model.meshInstances.length > 0) {
            this.showModel();
        } else {
            this.entity.once("load", this.showModel, this);
        }
    }
};

ModelFader.prototype.showModel = function() {
    this.loaded = true;
    if (this.model) {
        this.model.enabled = true;
        this.model.meshInstances.forEach((mesh, i, meshes)=> {
            let _blendType = meshes[i].material.blendType;
            if (_blendType == pc.BLEND_NONE) {
                meshes[i].material.blendType = pc.BLEND_NORMAL;
            }
            meshes[i].material.update();
        });
    }

};

ModelFader.prototype.update = function(dt) {
    if (this.model) {
        if (this.model.enabled) {
            if (this.loaded) {
                this.time += dt;
                this.opacity = this.config.opacity.value(this.time/this.config.time);
                this.model.meshInstances.forEach((mesh, i, meshes)=>{
                    meshes[i].material.opacity = this.opacity;
                    meshes[i].material.update();
                });

                if (this.time >= this.config.time)
                    this.loaded = false;
            }
        }
    }
};

// revolvingCam.js
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
    }, {
        name: "revolveTime",
        title: "Revolve Time",
        type: "number",
        min: 0,
        default: 3,
    }]
});

// initialize code called once per entity
RevolvingCam.prototype.initialize = function () {
    this.subtracted = new pc.Vec3().sub2(this.entity.getPosition(), this.axis.getPosition());
    this.initialPos = this.entity.getPosition().clone();
    this.axisPos = this.axis.getPosition();
    this.planeVec2 = new pc.Vec2();
    this.time = 0;
    switch (this.config.plane) {
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
RevolvingCam.prototype.update = function (dt) {
    if (this.config) {
        if (this.time < this.config.revolveTime) {
            this.time += dt;
            let deg = pc.math.DEG_TO_RAD * pc.math.lerp(0, 360, this.time / this.config.revolveTime);
            let _sin = Math.sin(deg) * this.magnitude;
            let _cos = Math.cos(deg) * this.magnitude;

            switch (this.config.plane) {
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
    }
    this.entity.lookAt(this.axis.getPosition());
};

// BooleanButton.js
const BooleanButton = pc.createScript('booleanButton');

// initialize code called once per entity
BooleanButton.prototype.initialize = function() {
    this.boolean = true;
    
    this.element = this.entity.element;
    this.entity.button.on("click", this.toggle, this);
    this.entity.once("set:default", function (value) {
        if (typeof value === "string") 
            this.boolean = parseBoolean(value);
        else if (typeof value === "boolean")
            this.boolean = value;

        this.setBoolean(this.boolean);
    }, this);
    
    // The property this.value will be equally used in any element in settings
    // that may differ based on the type of a button.
    // In this case, a boolean button will return this.boolean when a user requests its value.
    this.__defineGetter__('value', function() { return this.boolean; });
};

BooleanButton.prototype.postInitialize = function() {
    this.entity.fire("requestDefault");
};

BooleanButton.prototype.toggle = function() {
    this.boolean = !this.boolean;
    this.setBoolean(this.boolean);
};

BooleanButton.prototype.setBoolean = function(_boolean) {
    if (this.element.type === "image")
    switch (_boolean) {
        case false: this.element.spriteFrame = 0; break;
        case true: this.element.spriteFrame = 1; break;
    }
    
    this.entity.fire("set:value", this.value);
};

// Settings.js
const Settings = pc.createScript('settings');

Settings.attributes.add('options', {
    type: 'json',
    array: true,
    schema: [{
        name: 'name',
        title: 'Name',
        type: 'string',
    }, {
        name: 'val',
        title: 'Default Value',
        type: 'string',
    }, {
        name: 'entity',
        title: 'UI Entity',
        type: 'entity',
    }]
});

Settings.attributes.add('primaryUI', {
    type: 'entity',
    title: 'Primary UI'
});

// initialize code called once per entity
Settings.prototype.initialize = function() {
    this.app.on("open:settings", this.openSettings, this);
    this.app.on("close:settings", this.closeSettings, this);
    
    if (!this.app.settings) this.app.settings = {};
        
    this.options.forEach((option) => {
        // Fill the app settings with the date in the localstorage or option.val
        const storedVal = () => {
            // Rename any useful variable with an easier term
            let fromLocal = localStorage.getItem(option.name);
            let fromApp = this.app.settings[option.name];
            
            let parsedInt = parseInt(fromLocal);
            fromLocal = (isNaN(parsedInt)? parseBoolean(fromLocal): parsedInt);
            if(this.app.debug) console.log(`Check the value from Localstorage to see whether it is integer or boolean : ${fromLocal}`);
            
            const checkFunc = _var => (typeof _var !== 'undefined' && _var !== null);
            
            // Check the undefined or null in localStorage first, then repeat same process to this.app.settings if nothing exists in localStorage
            return (checkFunc(fromLocal)? fromLocal: (checkFunc(fromApp)? fromApp: option.val));
        };        
        Object.defineProperty(this.app.settings, option.name, {value: storedVal.call(this), writable: true});

        // Put eventhandler for each option entity
        option.entity.on("set:value", (_value, _name = option.name) => {
            functionalPermission = parseInt(localStorage.getItem("storagePermission")) & 1 << 1;
            if (functionalPermission) localStorage.setItem(_name, _value);
            this.app.settings[_name] = _value;
        }, this);
        option.entity.on("requestDefault", () => option.entity.fire("set:default", this.app.settings[option.name]), this);

        // Check Funnctional Permission, then set items in localStorage if necessary
        let functionalPermission = parseInt(localStorage.getItem("storagePermission")) & 1 << 1;
        if (!localStorage.getItem(option.name) && functionalPermission) localStorage.setItem(option.name, option.val);
    });
    
    this.entity.on("destroy", () => {
        this.app.off("open:settings", this.openSettings, this);
        this.app.off("close:settings", this.closeSettings, this);
    }, this);
};

Settings.prototype.openSettings = function() {
    const bg = this.entity.findByName("Background");
    this.primaryUI.enabled = true;
    if (bg) bg.enabled = true;
};

Settings.prototype.closeSettings = function() {
    this.entity.children.forEach(node => node.enabled = false);
};

// PlaySpriteSheets.js
var PlaySpriteSheets = pc.createScript('playSpriteSheets');

PlaySpriteSheets.attributes.add('config', {
    type: 'json',
    schema: [{
        name: "duration",
        title: "Duration",
        type: "number",
        min: 0,
        default: 3,
    }]
});

// initialize code called once per entity
PlaySpriteSheets.prototype.initialize = function () {
    this.element = this.entity.element;

    this.time = 0;
    if (this.element.spriteAsset) {
        this.spriteAsset = this.app.assets.get(this.element.spriteAsset);
        this.frameNum = this.spriteAsset.resource.frameKeys.length;
    }
};

console.log(this);

// update code called every frame
PlaySpriteSheets.prototype.update = function (dt) {
    if (this.config) {
        if (this.time < this.config.duration) {
            this.time += dt;
            let _time = this.time;
            _time /= this.config.duration;

            let frameIndex = Math.floor(pc.math.lerp(0, this.frameNum - 1, _time));
            this.element.spriteFrame = frameIndex;

        } else {
            this.time -= this.config.duration;
        }
    }
};

// Tracker.js
const Tracker = pc.createScript('tracker');

Tracker.attributes.add('_target', {
    type: 'entity',
    title: 'Target',
});

Tracker.attributes.add('camera', {
    type: 'entity',
    title: 'Camera',
});

Tracker.prototype.initialize = function() {
    const targetInit = () => {
        if(this._target) {
            this.target = this._target;
            if (this.entity.hasEvent('tracker:setTarget')) this.entity.off("tracker:setTarget", this.setTarget, this);
        } else {
            this.target = null;
            this.entity.on("tracker:setTarget", this.setTarget, this);
        }
    };
    targetInit();
    this.on('attr:_target', targetInit);
    
    if (this.camera) this.cameraVector = new pc.Vec3();
    
    this.targetData = {
        worldPosition : new pc.Vec3(),
        screenPosition : new pc.Vec3(),
    };
    
    this.entity.on("tracker:request", this.sendData, this);
};

Tracker.prototype.setTarget = function (entity) {this.target = entity;};

Tracker.prototype.sendData = function(dt) {    
    if (this.target) {
        this.targetData.worldPosition.copy(this.target.getPosition());
        this.targetData.name = this.target.name;
        this.targetData.entity = this.target;
        if (dt) this.targetData.time = dt;
        
        if (this.camera) {
            this.cameraVector.copy(this.camera.getPosition());
            
            this.camera.getRotation().transformVector(this.targetData.worldPosition);
            this.camera.getRotation().transformVector(this.cameraVector);
            
            this.camera.camera.worldToScreen(this.targetData.worldPosition, this.targetData.screenPosition);            
            this.targetData.isOverCamera = this.cameraVector.dot(pc.Vec3.ONE) < this.targetData.worldPosition.dot(pc.Vec3.ONE);
        }
        
        this.entity.fire(`tracker:${this.entity.name}`, this.targetData);
    }
};

// CountManager.js
const CountManager = pc.createScript('countManager');

CountManager.attributes.add('counter', {
    type: 'json',
    title: 'Counter',
    schema: [{
        name: "strike",
        title: 'Strike',
        type: 'entity',
    }, {
        name: "ball",
        title: 'Ball',
        type: 'entity',
    }, {
        name: "out",
        title: 'Out',
        type: 'entity',
    }]
});

CountManager.prototype.initialize = function() {
    this.app.inningMaster.on('hit', this.reset, this);
    this.app.inningMaster.on('wild', this.reset, this);
    
    this.app.inningMaster.on('catch', function(ball) {
        let status = ball.status;
        
        if(status && typeof status == "string") {
            switch(status) {
                case 'strike': this.counter.strike.fire("increment");
                break;
                case 'ball': this.counter.ball.fire("increment");
                break;
            }
        }
    }, this);
    
    this.app.inningMaster.on('foul', function(ball) {
        this.strikeCount = null;
        this.counter.strike.fire("getCount", "strikeCount", this);
        if (this.strikeCount < 2) this.counter.strike.fire("increment");
    }, this);

    this.counter.strike.on("max", function () {
        this.counter.out.fire("increment");
        this.reset();
    }, this);
    
    this.counter.ball.on("max", function () {
        this.app.inningMaster.run++;
        this.app.inningMaster.walk++;
        this.app.inningMaster.fire('setCount:run');
        this.app.inningMaster.fire('setCount:walk');
        this.reset();
    }, this);
    
    
    // When the out counts hit max
    this.counter.out.on("max", function () {
        this.app.inningMaster.fire('inningEnd');
    }, this);
};

CountManager.prototype.reset = function() {
    this.counter.strike.fire("reset");
    this.counter.ball.fire("reset");
};

// ****
// ****
// ****

const NumCounter = pc.createScript('numCounter');

NumCounter.attributes.add('name', {
    type: 'string',
    title: 'Name',
});

NumCounter.prototype.initialize = function() {
    this._name = this.name? this.name: this.entity.name.toLowerCase().replace(/\s+/g, '');
    this.text = this.entity.element.text;
    this.app.inningMaster.on(`setCount:${this._name}`, this.setCount, this);
};

NumCounter.prototype.setCount = function() {
    this.entity.element.text = this.text.replace('&int', `${this.app.inningMaster[this._name]}`);
};

// Mitt.js
const Mitt = pc.createScript('mitt');

Mitt.attributes.add('camera', {
    type: 'entity',
    title: 'Camera',
});

Mitt.attributes.add('axis', {
    type: 'entity',
    title: 'Axis',
});

Mitt.attributes.add('config', {
    title: 'Configuration',
    type: 'json',
    schema: [{
        name: "distMax",
        title: 'Maximum Distance Between A Mitt and An Axis',
        type: 'number',
        default: 0.9
    }]
});

// initialize code called once per entity
Mitt.prototype.initialize = function() {
    this._worldPosition = new pc.Vec3();
    this.lookAtMat = new pc.Mat4();
    this.lookAtVec3 = new pc.Vec3();
    this.ballDist = new pc.Vec3();
    this.mittDist = new pc.Vec3().sub2(this.camera.getPosition(), this.app.pitcher.defaultCamera.getPosition());
    this.heightDiff = this.mittDist.clone().project(pc.Vec3.UP);
    this.interpolation = new pc.Vec3();
    
    this.shouldTrack = false;
    
    this.entity.on(`tracker:${this.entity.name}`, (data) => {
        if(data.isOverCamera) {
            this.ballDist.sub2(this.camera.getPosition(), data.worldPosition);
            this.move(data.screenPosition.x, data.screenPosition.y);
        } else this.app.inningMaster.fire("wild", data.entity);
    }, this);
    
    this.app.inningMaster.on("pitch", (ball, data) => {
        this.entity.fire("tracker:setTarget", ball);
        this.shouldTrack = true;
    }, this);
    
    this.entity.on("contact:Ball", (ball) => {
        this.app.inningMaster.fire("catch", ball);
    }, this);
    
    this.app.inningMaster.on('reset', this.reset, this);
    this.app.inningMaster.on("conclude", () => {this.shouldTrack = false;}, this);
};

Mitt.prototype.postInitialize = function() {
    this.depth = this.app.strikeZone.getDepth(this.camera);
};

Mitt.prototype.reset = function () {
    this.shouldTrack = false;
};

Mitt.prototype.update = function (dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request");
};

Mitt.prototype.move = function (x, y) {
    this.camera.camera.screenToWorld(x, y, this.depth, this._worldPosition);
    let axisDist = this.axis.getPosition().distance(this._worldPosition);
    axisDist = pc.math.clamp(axisDist, 0, this.config.distMax);
    
    let distRatio = Math.abs(this.ballDist.z) / Math.abs(this.mittDist.z);
    this.interpolation.lerp(pc.Vec3.ZERO, this.heightDiff, distRatio);

    this.lookAtMat.setLookAt(this.axis.getPosition(), this._worldPosition, pc.Vec3.UP);
    this.lookAtMat.transformPoint(pc.Vec3.FORWARD, this.lookAtVec3);
    this.lookAtVec3.sub(this.axis.getPosition());
    this.lookAtVec3.mulScalar(axisDist);
    this.lookAtVec3.add(this.axis.getPosition());
    this.lookAtVec3.add(this.interpolation);
    
    this.entity.setPosition(this.lookAtVec3);

    this.entity.lookAt(this.axis.getPosition());
    this.entity.rotateLocal(-20,180,0);
};

// CentricConverter.js
const CentricConverter = pc.createScript('centricConverter');
/* Convert any screen coordinate vectors into centirc coordinates, which are the differences between screen vectors and center vectors
since the existing screen vectors can differ based on device sizes, so unifies them to center oriented forms. */

// initialize code called once per entity
CentricConverter.prototype.initialize = function() {
    this.app.centricConverter = this;
    
    this.device = this.app.graphicsDevice;
    this.screenDimension = new pc.Vec2(this.device.width, this.device.height).divScalar(this.device.maxPixelRatio);
    this.centerPosition = this.screenDimension.clone().divScalar(2);
    this.result = new pc.Vec2();
    
    this.referenceDim = (this.device.width + this.device.height)/2;
    this.screenRatio = {
        width :  ( this.referenceDim * this.device.maxPixelRatio ) / this.device.width,
        height : ( this.referenceDim * this.device.maxPixelRatio ) / this.device.height,
    };
    
    this.device.on('resizecanvas', function (width, height) {
        this.screenDimension.set(width, height).divScalar(this.device.maxPixelRatio);
        this.centerPosition.copy(this.screenDimension).divScalar(2);
    }, this);
};

CentricConverter.prototype.convert = function(scrVec2) {
    if (scrVec2 instanceof pc.Vec2) {
        this.result.copy(scrVec2).sub(this.centerPosition);
        scrVec2.copy(this.result);
        return this.result;
    } else {
        console.error("A conveter didn't receive pc.Vec2.");
    }
};

// debuggingAxes.js
var DebuggingAxes = pc.createScript('debuggingAxes');

DebuggingAxes.attributes.add('absolute', {
    type: 'boolean',
    title: 'Absoulte',
    default: true,
});

DebuggingAxes.attributes.add('scale', {
    type: 'number',
    title: 'Scale',
    default: 1,
});

// initialize code called once per entity
DebuggingAxes.prototype.initialize = function () {
    this.currentPosition = new pc.Vec3();
    this.axes = {
        X: new pc.Vec3(),
        Y: new pc.Vec3(),
        Z: new pc.Vec3(),
    };
    this.axisVector = new pc.Vec3();
};

// update code called every frame
DebuggingAxes.prototype.update = function (dt) {
    if (this.app.debug && this.currentPosition) {
        this.currentPosition.copy(this.entity.getPosition());

        if (this.absolute) this.axisVector.copy(pc.Vec3.ONE).mulScalar(this.scale);
        else this.axisVector.copy(this.entity.getLocalPosition()).normalize().mulScalar(this.scale);

        this.axes.X.copy(this.axisVector).project(pc.Vec3.UP).add(this.currentPosition);
        this.axes.Y.copy(this.axisVector).project(pc.Vec3.RIGHT).add(this.currentPosition);
        this.axes.Z.copy(this.axisVector).project(pc.Vec3.BACK).add(this.currentPosition);

        this.app.drawLine(this.currentPosition, this.axes.X, pc.Color.BLUE);
        this.app.drawLine(this.currentPosition, this.axes.Y, pc.Color.YELLOW);
        this.app.drawLine(this.currentPosition, this.axes.Z, pc.Color.RED);
    }
};

// askcookie.js
const Askcookie = pc.createScript('askcookie');

Askcookie.attributes.add('json', {
    type: 'asset',
    assetType: 'json'
});
 
// initialize code called once per entity
Askcookie.prototype.initialize = function() {
    this.jsonArrange = this.entity.script.jsonArrange;
    this.storagePermission = localStorage.getItem("storagePermission");
    this.webstorage = this.jsonArrange.filter(this.json.resource, "type", "Web Storage");
    this.permissionFlag = 0;
    this.maximumFlag = function () {
        let max = Object.keys(this.jsonArrange.arrange(this.json.resource, "purpose")).length;
        let bit = 0;
        for (let i = 0; i < max; i++) bit |= 1 << i;
        return bit;
    }.call(this);
};

Askcookie.prototype.postInitialize = function() {
    this.optionList = document.getElementById("option");
    this.inputBoxes = this.optionList.querySelectorAll("label.switch input");
    
    const setStoragePermission = (integer) => {
        this.entity.fire("hide");
        if (integer <= 1) { 
            localStorage.clear();
            this.inputBoxes.forEach((inputBox) => {
                if (!inputBox.disabled) inputBox.removeAttribute("checked");
            });
        } else this.inputBoxes.forEach((inputBox) => {
            if (!inputBox.disabled) inputBox.setAttribute("checked", "");
        });
        localStorage.setItem("storagePermission", integer);
    };

    // Buttons in the first banner
    this.accept = document.getElementById('accept');
    if (this.accept) this.accept.addEventListener('click', () => setStoragePermission(this.maximumFlag));
    
    this.decline = document.getElementById('decline');
    if (this.decline) this.decline.addEventListener('click', () => setStoragePermission(1));
    
    this.close = document.getElementById('close');
    if (this.close) this.close.addEventListener('click', () =>  this.entity.fire("hide"));

    // Anchor that leads a customer to a detail section
    this.changePreference = document.getElementById('changePreference');
    this.detail = document.getElementById('detail');
    if (this.changePreference && this.detail)
    this.changePreference.addEventListener('click', () => {
        if (this.detail.classList.contains("expand")) this.detail.classList.replace("expand", "fold");
        else if (this.detail.classList.contains("fold")) this.detail.classList.replace("fold", "expand");
        else this.detail.classList.add("expand");
    });
    
    if (!this.storagePermission) this.entity.fire("show");
    else this.entity.fire("hide");
    
    this.inputBoxes.forEach((inputBox, i, array) => {
        let bit = 1 << i;
        if (inputBox.checked) this.permissionFlag |= bit;
        if (this.storagePermission & bit) inputBox.setAttribute("checked", "");
        
        if(!inputBox.disabled)
        inputBox.addEventListener('input', (e) => {
            if (e.target.checked) this.permissionFlag |= bit;
            else this.permissionFlag ^= bit;
            localStorage.setItem("storagePermission", this.permissionFlag);
        });
    });
    
    this.webstorageList = document.getElementById('webstorage-list');
    if (this.webstorageList) {
        for (const [type, nest] of Object.entries(this.webstorage)) {
            this.webstorageList.insertAdjacentHTML('beforeend', `
                <div class="item">
                    <div class="column">
                        <div class="keys row">Name</div>
                        <div class="values row">${type}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Duration</div>
                        <div class="values row">${nest.duration}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Purpose</div>
                        <div class="values row">${nest.purpose}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Description</div>
                        <div class="values row">${nest.description}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Provenance</div>
                        <div class="values row">${nest.provenance}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Controller</div>
                        <div class="values row">${nest.controller}</div>
                    </div>
                </div>
            `);
        }
    }
    
    this.goToDetails = document.getElementById("goToDetails");
    this.storageLabel = document.getElementById("storageLabel");
    if (this.goToDetails && this.storageLabel)
    this.goToDetails.addEventListener('click', () => this.storageLabel.scrollIntoView({behavior:"smooth", block:"start", inline:"start"}));
    
    this.topButtons = document.getElementsByClassName("top");
    for (let i = 0; i < this.topButtons.length; i++) {
        this.topButtons.item(i).addEventListener('click', () => this.optionList.scrollIntoView({behavior:"smooth", block:"start", inline:"start"}));
    }
};

// OptionSelectUI.js
const OptionSelectUI = pc.createScript('optionSelectUI');

OptionSelectUI.attributes.add('preview', {
    title: 'Preview',
    type: 'entity',
});

OptionSelectUI.attributes.add('detail', {
    title: 'Detail',
    type: 'entity',
});

OptionSelectUI.attributes.add('data', {
    title: 'Data',
    type: 'json',
    array: true,
    schema: [{
        name: "image",
        type: 'asset',
    }, {
        name: "text",
        type: 'string',
    }]
});

OptionSelectUI.attributes.add('arrows', {
    type: 'json',
    title: 'Arrow Buttons',
    schema: [{
        name: "left",
        type: 'entity',
    }, {
        name: "right",
        type: 'entity',
    }]
});

OptionSelectUI.prototype.initialize = function() {
    this.lastIndex = this.data.length - 1;
    this.entity.once("set:default", this.callDefault, this);
    
    this.arrows.left.button.on("click", () => {
        this.indexNum--;
        if (this.indexNum < 0) this.indexNum = this.lastIndex;
        this.setPreview(this.indexNum);
    }, this);
    
    this.arrows.right.button.on("click", () => {
        this.indexNum++;
        if (this.indexNum > this.lastIndex) this.indexNum = 0;
        this.setPreview(this.indexNum);
    }, this);
};

OptionSelectUI.prototype.callDefault = function(value) {
    this.indexNum = value;
    this.setPreview(this.indexNum);
};

OptionSelectUI.prototype.postInitialize = function() {
    this.entity.fire("requestDefault");
};
    
OptionSelectUI.prototype.setPreview = function (_int) {
    if (_int < 0) _int = 0;
    else if (_int > this.lastIndex) _int = this.lastIndex; 
    if (this.preview) this.preview.element.texture = this.data[_int].image.resource;
    if (this.detail) this.detail.element.text = this.data[_int].text;
    this.entity.fire("set:value", _int);
};

// Buttons.js
class InteractiveElement extends pc.ScriptType {
    initialize() {
        if (this.app.mouse) this.app.mouse.disableContextMenu();
        
        this.entity.isInit = true;
        this.entity.callbacks = {
            onClick : {
                left: [],
                right: [],
            },
            onTouch : []
        };
        
        const canvas = document.body.getElementsByTagName("canvas")[0];
        
        this.entity.button.on("click", (event) => {
            if (event.event.target === canvas) {
                if (event instanceof pc.ElementMouseEvent)
                switch (event.button) {
                    case 0:
                        if (this.entity.callbacks.onClick.left.length > 0)
                        this.entity.callbacks.onClick.left.forEach(_callback => _callback.call(this));
                        break;
                    case 2:
                        if (this.entity.callbacks.onClick.right.length > 0)
                        this.entity.callbacks.onClick.right.forEach(_callback => _callback.call(this));
                        break;
                }
                else if (event instanceof pc.ElementTouchEvent) 
                if (this.entity.callbacks.onTouch.length > 0)
                this.entity.callbacks.onTouch.forEach(_callback => _callback.call(this));
            }
        }, this);
        
        const onLeave = () => this.app.fire("leave:UI", this.entity.button);
        const onEnter = () => this.app.fire("enter:UI", this.entity.button);
        
        if (this.app.mouse) {
            this.entity.button.on("mouseleave", onLeave, this);
            this.entity.button.on("mouseenter", onEnter, this);
        }
        
        if (this.app.touch) {
            this.entity.button.on("touchcancel", onLeave, this);
            this.entity.button.on("touchleave", onLeave, this);
            this.entity.button.on("touchstart", onEnter, this);
            // this.entity.button.on("touchcancel", onLeave, this);
        }
    }
}

class MenuSwitchButton extends InteractiveElement {
    initialize() {
        if(!this.entity.isInit)
        super.initialize();
        
        const click = () => {
            if (this.menus.from) this.menus.from.enabled = false;
            if (this.menus.to) this.menus.to.enabled = true;
        };

        this.entity.callbacks.onClick.left.push(click);
        this.entity.callbacks.onTouch.push(click);
    }
}

class InGameButton extends InteractiveElement {
    initialize() {
        if(!this.entity.isInit)
        super.initialize();
        
        this.targetScope = undefined;
        
        switch (this.scope) {
            default :
                this.targetScope = this.app;
                break;
            case 1 :
                this.targetScope = this.entity;
                break;
        }
        
        const click = () => {
            if (this.targetScope) this.targetScope.fire(this.message);
            if (this.app.debug) console.log(this.message);
        };
        
        this.entity.callbacks.onClick.left.push(click);
        this.entity.callbacks.onTouch.push(click);
    }
}

class HTMLPopUpButton extends InteractiveElement {
    initialize() {
        if(!this.entity.isInit)
        super.initialize();
        
        const click = () => this.htmlContainer.fire("show");

        this.entity.callbacks.onClick.left.push(click);
        this.entity.callbacks.onTouch.push(click);
    }
}

pc.registerScript(MenuSwitchButton, "menuSwitchButton");
pc.registerScript(HTMLPopUpButton, "HTMLPopUpButton");
pc.registerScript(InGameButton, "inGameButton");

MenuSwitchButton.attributes.add('menus', {
    type: 'json',
    title: 'Target Menu',
    schema: [{
        name: "from",
        type: 'entity',
    }, {
        name: "to",
        type: 'entity',
    }]
});

HTMLPopUpButton.attributes.add('htmlContainer', {
    type: 'entity',
    title: 'Html Container',
});

InGameButton.attributes.add('message', {
    type: 'string',
    title: 'Message',
});

InGameButton.attributes.add('scope', {
    type: 'number',
    title: 'Scope',
    default: 0,
    enum: [
        { 'application': 0 },
        { 'entity': 1 },
    ]
});

// HTML-UI.js
// Reference : https://developer.playcanvas.com/en/tutorials/htmlcss-ui/
// Playcanvas : https://playcanvas.com/project/443090/overview/htmlcss-ui

const HtmlUi = pc.createScript('htmlUi');

HtmlUi.attributes.add('uniqueID', {type: 'string', title: 'Unique ID'});
HtmlUi.attributes.add('css', {type: 'asset', assetType:'css', title: 'CSS Asset'});
HtmlUi.attributes.add('html', {type: 'asset', assetType:'html', title: 'HTML Asset'});

HtmlUi.prototype.initialize = function () {    
    // Differentiate each html ui element to prevent the overlapping styles
    // It will automatically append a special class from guid of an entity to all elements in html and css files
    const replacer = (match) => `#${this.uniqueID} ${match}`;
    
    this.style = document.createElement('style');
    this.style.innerHTML = this.css.resource.replace(/(^\w|\.|\#).+?(?=\{[^{}]*\})/gm, replacer) || '';
    document.head.appendChild(this.style);
    
    // Add the HTML
    this.div = document.createElement('div');
    this.div.id = this.uniqueID;
    this.div.innerHTML = this.html.resource || '';
    this.div.onmouseover = () => this.app.fire("over:HTML");
    this.div.onmouseout = () => this.app.fire("out:HTML");
    document.body.appendChild(this.div);
    
    this.entity.on("destroy", () => this.div.remove(), this);
    this.entity.on("hide", this.hide, this);
    this.entity.on("show", this.show, this);
    this.on('disable', this.hide, this);
    this.on('enable', this.show, this);
};

HtmlUi.prototype.hide = function () { this.div.style.visibility = 'hidden'; };
HtmlUi.prototype.show = function () { this.div.style.visibility = 'visible'; };



// JsonArrange.js
const JsonArrange = pc.createScript('jsonArrange');

JsonArrange.prototype.recursiveArrange = function(nest, ...keys) {
    if(keys && keys.length > 0) {
        let currentKey = keys[0];
        let _nest = this.arrange(nest, currentKey);

        keys.shift();
        for (const [name, childNest] of Object.entries(_nest)) {
            const argument = [childNest].concat(keys); // argument will look like [childNest, "key2", "key3"]
            if (keys.length > 1) _nest[name] = this.recursiveArrange.apply(this, argument);
            else _nest[name] = this.arrange.apply(this, argument);
        }
        return _nest;
    }
};

JsonArrange.prototype.arrange = function(nest, key) {
    let _nest = {}; //Temporary Nest
    let currentValue; // For labelling a key of each enties

    /* Filling In! */
    // The name and the object of a setting option list
    for (const [name, obj] of Object.entries(nest)) { // Iterator
        // Check whether the object actually contain key
        if(obj.hasOwnProperty(key)) {
            let _currentValue = obj[key]; // Temporary value in order to identify any redundancy
            if (currentValue === undefined || currentValue !== _currentValue){
                currentValue = _currentValue;
                _nest[currentValue] = {}; // Labelling sub-nest(or category) with currentValue
            }
            _nest[currentValue][name] = obj; // Filling in
        }
    }
    return _nest;
};

JsonArrange.prototype.filter = function(nest, key, value) {
    let _nest = {};
    
    for (const [name, obj] of Object.entries(nest)) {
        if(obj.hasOwnProperty(key) && obj[key] === value) {
            _nest[name] = obj;
        }
    }
    return _nest;
};

// FieldRule.js
const FieldRule = pc.createScript('fieldRule');

FieldRule.attributes.add('lines', {
    type: 'json',
    title: 'Lines',
    array: true,
    schema: [{
        name: "node1",
        type: 'string',
    }, {
        name: "node2",
        type: 'string',
    }, {
        name: "entity",
        type: 'entity',
    }],
});

// initialize code called once per entity
FieldRule.prototype.initialize = function () {
    this.targetVector = new pc.Vec3();
    this._targetVector = new pc.Vec3();
    this.plane = new pc.Vec3(1, 0, 1);
    this.worldMatrix = this.entity.getWorldTransform();
    this.timerManager = this.entity.script.timer;

    this.shouldTrack = false;

    this.entity.on(`tracker:${this.entity.name}`, this.track, this);

    this.app.inningMaster.on("hit", (ball) => {
        this.timerManager.fire(0.1, function () {
            this.entity.fire("tracker:setTarget", ball);
            this.shouldTrack = true;
        }, false, this);
    }, this);

    const reset = () => {
        this.shouldTrack = false;
    };

    this.app.inningMaster.on("reset", reset, this);
    this.app.inningMaster.on('replay', reset, this);

    if (this.entity.model) {
        this.nodes = this.entity.model.model.graph;

        this.lines.forEach((line, i, array) => {
            let node1 = this.nodes.find('name', line.node1)[0];
            let node2 = this.nodes.find('name', line.node2)[0];

            array[i].vec1 = node1.localPosition.clone().div(node1.localScale);
            array[i].vec2 = node2.localPosition.clone().div(node2.localScale);

            this.worldMatrix.transformPoint(line.vec1, line.vec1);
            this.worldMatrix.transformPoint(line.vec2, line.vec2);

            array[i].diffVector = new pc.Vec3().sub2(line.vec1, line.vec2).normalize();
            array[i].normalVector = new pc.Vec3().cross(line.diffVector, pc.Vec3.UP);
            array[i].offsetVector = line.vec1.clone().project(line.normalVector);

            array[i].planeVector = new pc.Vec3();
            array[i]._vector = new pc.Vec3();
        });
    }
};


FieldRule.prototype.update = function (dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request");
};

FieldRule.prototype.track = function (data) {
    this.targetVector.copy(data.worldPosition);
    this._targetVector.mul2(this.targetVector, this.plane);

    this.lines.every((line, i, array) => {
        line.planeVector.copy(this._targetVector).project(line.diffVector).add(line.offsetVector);

        array[i].distance = line._vector.sub2(line.vec1, this._targetVector).dot(line.normalVector);
        if (line.planeTest !== undefined) array[i]._planeTest = line.planeTest;
        array[i].planeTest = line.distance < 0;

        line.entity.setPosition(line.planeVector);

        if (line.planeTest !== undefined && line._planeTest !== undefined) if (!line.planeTest && line.planeTest != line._planeTest) {
            if (line.entity.tags.has('foul')) this.app.inningMaster.fire('foul', data.entity);
            else if (line.entity.tags.has('fence')) {
                this.entity.fire('emit', data.entity.getPosition());
                this.app.inningMaster.fire('homerun', data.entity);
            }

            this.shouldTrack = false;

            return false;
        }

        return true;
    });
};

// Timer.js
const Timer = pc.createScript('timer');

Timer.prototype.initialize = function() {
    this.timers = {};
    this.nextFreeId = 0;
};

Timer.prototype.add = function(duration, callback, scope) {
    if (duration > 0) {
        const handle = {};
        handle.id = this.nextFreeId;
        
        this.timers[this.nextFreeId] = {
            resume: false,
            secsLeft: duration,
            callback: callback,
            scope: scope,
        };
        
        let _timer = this.timers[this.nextFreeId];
        
        _timer.start = () => _timer.resume = true;
        _timer.stop = () => _timer.resume = false;
        _timer.reset = () => {
            _timer.stop();
            _timer.secsLeft = duration;
        };
        
        handle.timer = _timer;

        this.nextFreeId += 1;
        return handle;
    }
    return null;
};

Timer.prototype.fire = function(duration, callback, overlap, scope) {
    if (duration > 0) {
        if (overlap) {
            if(this.app.debug) console.log(this.timers);
            for (let property in this.timers) {
                let timer = this.timers[property];

                if (timer.temp === true) {
                    timer.resume = false;
                    delete this.timers[property];
                }
            }
            if(this.app.debug) console.log(this.timers);
        }
        
        this.timers[this.nextFreeId] = {
            resume: true,
            temp: true,
            secsLeft: duration,
            callback: callback,
            scope: scope,
        };

        this.nextFreeId += 1;
    }
};

Timer.prototype.start = function(handle) { if (handle) this.timers[handle.id].start(); };
Timer.prototype.stop = function(handle) { if (handle) this.timers[handle.id].stop(); };
Timer.prototype.reset = function(handle) { if (handle) this.timers[handle.id].reset(); };
Timer.prototype.delete = function(handle) { if (handle) delete this.timers[handle.id]; };

Timer.prototype.log = function() {
    console.log(this.timers, `Next Free ID : ${this.nextFreeId}`);
};

Timer.prototype.update = function(dt) {
    for (let property in this.timers) {
        let timer = this.timers[property];
        
        if (timer.resume === true) {
            if (timer.secsLeft > 0) timer.secsLeft -= dt / this.app.timeScale;
            else if (timer.secsLeft <= 0) {
                timer.callback.call(timer.scope);
                if (timer.reset) timer.reset();
                else delete this.timers[property];
            }
        }
    }
};

// TrackingFloor.js
var TrackingFloor = pc.createScript('trackingFloor');

// initialize code called once per entity
TrackingFloor.prototype.initialize = function () {
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
TrackingFloor.prototype.update = function (dt) {
    if (this.shouldTrack) this.entity.fire("tracker:request");
};

TrackingFloor.prototype.track = function (data) {
    this.position.copy(data.worldPosition).mul(this.projection).sub(this.offset);
    this.entity.setPosition(this.position);
};

// BatchManager.js
const BatchManager = pc.createScript('batchManager');

BatchManager.attributes.add('batchGroups', {
    title: 'Batch Groups',
    type: 'string',
    array: true,
});

// initialize code called once per entity
BatchManager.prototype.initialize = function() {
    const _groupArray = [];
    const batcher = this.app.batcher;
    
    this.batchGroups.every((batch, i, array) => {
        let id = batcher.getGroupByName(batch.name);
        _groupArray.push(id);
    });
    
    batcher.generate(_groupArray);
};

// GuideUI.js
const GuideUi = pc.createScript('guideUi');

GuideUi.attributes.add('player', {
    title: 'Player',
    type: 'entity',
});

GuideUi.attributes.add('guideText', {
    title: 'Text',
    type: 'entity',
});

GuideUi.attributes.add('ripple', {
    title: 'Ripple',
    type: 'entity',
});

GuideUi.attributes.add('dragArrow', {
    title: 'Drag Arrow',
    type: 'entity',
});

GuideUi.attributes.add('textList', {
    title: 'Text List',
    type: 'asset',
    assetType: 'json'
});

// initialize code called once per entity
GuideUi.prototype.initialize = function() {
    this.entity.enabled = (this.app.settings.toggleGuide !== undefined && this.app.settings.toggleGuide !== null? this.app.settings.toggleGuide : true );
    
    let onChangeSettings = () => this.entity.enabled = this.app.settings.toggleGuide;
    this.app.on("change:settings", onChangeSettings, this);
    
    this.UIpos = new pc.Vec2();
    this.mouseVel = new pc.Vec2();
    
    this.device = this.app.graphicsDevice;
    this.screen = this.player.defaultUI.screen;
    this.correctionRatio = this.device.maxPixelRatio / this.screen.scale;
    
    this.device.on('resizecanvas', function (width, height) {
        this.screen = this.player.defaultUI.screen;
        this.correctionRatio = this.device.maxPixelRatio / this.screen.scale;
    }, this);
    
    if(this.app.touch) this.list = this.textList.resource.onTouch;
    else if(this.app.mouse) this.list = this.textList.resource.onMouse;
    
    this.maxVel = 0;
    this.currVel = 0;
    this.minVeltoPitch = this.player.script.pitch.config.minimumVelocity;
    
    this.angle = new pc.Quat();
    this.currAngle = new pc.Quat();
    this.targetAngle = new pc.Quat();
    this.alpha = 0;
    
    this.reset();
    
    this.app.inningMaster.on("reset", this.reset, this);
    this.app.inningMaster.on("pitch", () => {
        this.guideText.enabled = false;
        this.ripple.enabled = false;
        this.dragArrow.enabled = false;
        this.pitched = true;
        
        if (this.app.mouse) {
            this.app.off("pitcher:mousepress:left", this.press, this);
            this.app.off("pitcher:mousemove:left", this.move, this);
            this.app.off("pitcher:mouserelease:left", this.release, this);            
        }

        if (this.app.touch) {
            this.app.off("pitcher:touchstart", this.press, this);
            this.app.off("pitcher:touchmove", this.move, this);
            this.app.off("pitcher:touchend", this.release, this);
        }
    }, this);
    
    
    // On destruction of an entity
    // Turn off any event handler attached to an entity
    this.entity.on("destroy", () => {
        this.app.off("pitcher:mousepress:left", this.press, this);
        this.app.off("pitcher:mousemove:left", this.move, this);
        this.app.off("pitcher:mouserelease:left", this.release, this);            

        this.app.off("pitcher:touchstart", this.press, this);
        this.app.off("pitcher:touchmove", this.move, this);
        this.app.off("pitcher:touchend", this.release, this);
        
        this.app.off("change:settings", onChangeSettings, this);
    }, this);
};

GuideUi.prototype.reset = function() {
    this.guideText.enabled = true;
    this.ripple.enabled = true;
    this.dragArrow.enabled = false;
    
    this.safetyLock = false;
    this.pitched = false;
    
    this.guideText.element.text = this.list.none;
    this.entity.setLocalPosition(0, 0, 0);
    
    if (this.app.mouse) {
        this.app.on("pitcher:mousepress:left", this.press, this);
        this.app.on("pitcher:mousemove:left", this.move, this);
        this.app.on("pitcher:mouserelease:left", this.release, this);         
    }

    if (this.app.touch) {
        this.app.on("pitcher:touchstart", this.press, this);
        this.app.on("pitcher:touchmove", this.move, this);
        this.app.on("pitcher:touchend", this.release, this);
    }
};

GuideUi.prototype.press = function (event) {
    this.guideText.element.text = this.list.press;
    if (this.app.ball) this.setUIPosition(event.x, event.y);
    this.ripple.enabled = false;
    this.safetyLock = true;
};
    
GuideUi.prototype.move = function (event) {
    if (this.safetyLock) {
        this.alpha = 0;
        this.currAngle.copy(this.angle);
        
        let mag = 75;
        this.mouseVel.set(event.dx, event.dy);
        this.maxVel = this.mouseVel.length();
        this.mouseVel.normalize();
        
        let targetEulerAngle = pc.customMath.vec2ToDeg(this.mouseVel, true);
        this.targetAngle.setFromEulerAngles(0, 0, targetEulerAngle);
        
        this.mouseVel.mulScalar(mag);
        this.mouseVel.mulScalar(this.correctionRatio);
        
        if (this.app.ball) this.setUIPosition(event.x, event.y);
    }
};
    
GuideUi.prototype.release = function (event) {
    if (this.safetyLock) {
        this.guideText.element.text = this.list.moreVel;
        this.dragArrow.enabled = false;
        this.maxVel = 0;
        if (this.pitched === false) {
            this.ripple.enabled = true;
        }
    }
};

GuideUi.prototype.setUIPosition = function (x, y) {
    this.UIpos.set(x, y);
    this.app.centricConverter.convert(this.UIpos);
    this.UIpos.mulScalar(this.correctionRatio);
    
    this.entity.setLocalPosition(this.UIpos.x, -this.UIpos.y, 0);
};

GuideUi.prototype.update = function (dt) {
    if (this.pitched === false) {
        this.alpha += 0.07;
        if(this.alpha > 1) this.alpha = 1;

        if (this.currVel < 0) this.currVel = 0;
        else if (this.currVel >= 0 && this.currVel <= this.maxVel) {

            let _diff = Math.abs(this.maxVel - this.currVel);
            _diff = pc.math.smoothstep(0, 5, _diff);

            if (this.maxVel > this.currVel) {
                this.currVel += _diff;
            } else if (this.maxVel < this.currVel) {
                this.currVel -= _diff;
            }

        } else if (this.currVel > this.maxVel) this.currVel = this.maxVel;

        this.angle.slerp(this.currAngle, this.targetAngle, this.alpha);

        if (this.currVel < 2) {
            this.dragArrow.enabled = false;
            this.guideText.enabled = true;
        } else if (this.currVel >= 2 && this.currVel <= this.minVeltoPitch/4) {
            this.dragArrow.enabled = true;
            this.guideText.enabled = false;
            this.dragArrow.element.spriteFrame = 0;
        }else if (this.currVel > this.minVeltoPitch/4 && this.currVel <= this.minVeltoPitch) this.dragArrow.element.spriteFrame = 1;
        else if (this.currVel > this.minVeltoPitch) this.dragArrow.element.spriteFrame = 2;

        this.dragArrow.parent.setLocalRotation(this.angle);
    }
};

// ResultStats.js
const ResultStats = pc.createScript('resultStats');

ResultStats.attributes.add('dataName', {
    type: 'string',
    title: 'Data Name',
    description: 'Write down the name of a key in this.app.result'
});

// initialize code called once per entity
ResultStats.prototype.initialize = function() {
    try {
        this.value = this.app.result[this.dataName];
        if(this.app.debug && typeof this.value === undefined) throw `No value ${this.dataName}, ${Object.entries(this.app.result)}`;
        this.txtElement = this.entity.findByName("Number");
        this.originalText = this.txtElement.element.text;
        
        this.txtElement.element.text = this.originalText.replace('&int', `${this.value}`);
    } catch (e) {
        console.error(e);
        console.trace();
    }
};

