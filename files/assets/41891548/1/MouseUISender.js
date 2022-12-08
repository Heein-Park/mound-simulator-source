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
MouseUISender.prototype.initialize = function() {
    this._MOUSEBUTTON_BOTH = 3;
    
    this.mouseText = {
        leftIdle : this.leftIdleText,
        leftPressed : this.leftPressedText,
        rightIdle : this.rightIdleText,
        rightPressed : this.rightPressedText,
    };
};

// update code called every frame
MouseUISender.prototype.update = function(dt) {
    
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