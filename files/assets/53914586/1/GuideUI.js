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