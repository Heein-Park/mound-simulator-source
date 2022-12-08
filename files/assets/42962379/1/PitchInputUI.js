class PitchInputUI extends pc.ScriptType {
    initialize() {
        this.device = this.app.graphicsDevice;
        this.screen = this.UIEntity.screen;
        this.correctionRatio = this.device.maxPixelRatio / this.screen.scale;
        this.reset();

        this.device.on('resizecanvas', function (width, height) {
            this.screen = this.UIEntity.screen;
            this.correctionRatio = this.device.maxPixelRatio / this.screen.scale;
            if (this.app.debug) console.log(`Canvas Resized. this.device.maxPixelRatio / this.screen.scale = ${this.correctionRatio}`);
        }, this);

        this.app.inningMaster.on('pitch', this.display, this);
        this.app.inningMaster.on("reset", this.reset, this);
        this.on("enable:inputUI", (boolean) => {
            this.reset();
            if (boolean) this.app.inningMaster.on('pitch', this.display, this);
            else this.app.inningMaster.off('pitch', this.display, this);
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
    
    display({ mouseHistory, inputVelocity : { linear : inputLinear,  angular : inputAngular } }) {        
        this.mousePosition.copy(mouseHistory[0]).scale(this.correctionRatio);
        this.linearVector.copy(inputLinear);
        this.angularVector.copy(inputAngular);
        
        console.log(this.mousePosition, inputLinear, inputAngular);

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
    
    display({ mouseHistory }) {
        mouseHistory.forEach((_mouse) => {
            let e = this.spot.clone();
            this.entity.addChild(e);
            e.tags.add("temp");
            e.setLocalPosition(_mouse.x * this.correctionRatio, -_mouse.y * this.correctionRatio, 0);
            e.enabled = true; 
        });
    }
    
    reset() {
        let historySpots = this.entity.findByTag('temp');
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