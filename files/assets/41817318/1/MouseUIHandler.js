var MouseUIHandler = pc.createScript('mouseUIHandler');

// initialize code called once per entity
MouseUIHandler.prototype.initialize = function() {
    var mouseUI = this.app.constantUI.findByName("MouseUI");
    
    this.mouseUIImage = mouseUI.findByName("MouseImage").element;
    this.mouseUIText = {
        left : mouseUI.findByName("LeftText").element,
        right : mouseUI.findByName("RightText").element,
    };
    
    this.entity.on("mousePressed", this.onMousePressed, this);
    this.entity.on("mouseReleased", this.onMouseReleased, this);
    
    var mouseTexturesAssets = this.app.assets.findByTag("mouseUI");
    this.mouseTextures = {
        idle : this.app.assets.find("mouse_Idle.png", "texture"),
        left : this.app.assets.find("mouse_LeftPressed.png", "texture"),
        right : this.app.assets.find("mouse_RightPressed.png", "texture"),
        both : this.app.assets.find("mouse_BothPressed.png", "texture"),
    };
    
    this.mouseText = {
        leftIdle : "leftIdle",
        leftPressed : "leftPressed",
        rightIdle : "rightIdle",
        rightPressed : "rightPressed",
    };
    
    this.setMouseTextFrom( this.app.playerManager.currentRole );
    
    this.app.on("setRole", function (_role, camera, ui) {
        this.setMouseTextFrom(_role);
    }, this);
    
};

MouseUIHandler.prototype.setMouseTextFrom = function (_role) {
    if (_role.script.mouseUISender ) {
        this.mouseText = _role.script.mouseUISender.mouseText;
    }
    this.mouseUIText.left.text = this.mouseText.leftIdle;
    this.mouseUIText.right.text = this.mouseText.rightIdle;
};

MouseUIHandler.prototype.onMouse = {
    press : function (event) {
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
    
    move : function (event) {
    },
    
    release : function (event) {
        var _button = event.button;
        var _MOUSEBUTTON_BOTH = 3;

        _button = (event.buttons[pc.MOUSEBUTTON_LEFT] && event.buttons[pc.MOUSEBUTTON_RIGHT] ? _MOUSEBUTTON_BOTH : _button); 

        switch (_button) {
            case pc.MOUSEBUTTON_LEFT: {
                if (event.buttons[pc.MOUSEBUTTON_RIGHT]){
                    this.mouseUIImage.texture = this.mouseTextures.right.resource;
                } else {
                    this.mouseUIImage.texture = this.mouseTextures.idle.resource;
                }
                this.mouseUIText.left.text = this.mouseText.leftIdle;

            } break;

            case pc.MOUSEBUTTON_RIGHT: {
                if (event.buttons[pc.MOUSEBUTTON_LEFT]){
                    this.mouseUIImage.texture = this.mouseTextures.left.resource;
                } else {
                    this.mouseUIImage.texture = this.mouseTextures.idle.resource;
                }
                this.mouseUIText.right.text = this.mouseText.rightIdle;
            } break;
        }
    },
    
    out : function (event) {
    },
};
// swap method called for script hot-reloading
// inherit your script state here
// MouseUIHandler.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/