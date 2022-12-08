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

Pitch.prototype.initialize = function() {    
    // ReferenceDim
    this.device = this.app.graphicsDevice;
    
    // Get the Screen Ratio and Reference Dimension
    const getScrRatio = _device => {
        let refDim = (_device.width + _device.height) / 2;
        let advantage = { width: (_device.width < 1920?  1920 / _device.width: 1), height: (_device.height < 1080?  1080 / _device.height: 1) };
        return {
            width : (_device.width > refDim? _device.width: refDim) / _device.width * advantage.width,
            height : (_device.height > refDim? _device.height: refDim) / _device.height * advantage.height
        };
     };
    this.screenRatio = getScrRatio(this.device);
    this.device.on('resizecanvas', () => {
        this.screenRatio = getScrRatio(this.device);
        if(this.app.debug) console.log(this.screenRatio);
    }, this);
    
    // Input Velocitys
    const _inputVelocity = function () {
        this.screen = new pc.Vec2();
        this.world = new pc.Vec3();
    };

    this.inputVelocity = {
        linear : new _inputVelocity(),
        angular : new _inputVelocity(),
    };
    
    this.mouseHistory = {
        length : this.config.historyNum,
        delta : new pc.Vec2Array(this.config.historyNum),
        accel : new pc.Vec2Array(this.config.historyNum - 1),
        pos : new pc.Vec2Array(this.config.historyNum),
    };
    
    // Push new vectors while discharging the latest vectors
    Object.defineProperty(this.mouseHistory, 'pushDelta', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function ( dx, dy ) {
            this.delta.push( dx, dy );
            for (let i = 0; this.length-1 > i; ++i) {
                this.accel.vectors[i].sub2(this.delta.vectors[i], this.delta.vectors[i+1]);
            }
            this.accel.update();
        }
    });
    
    Object.defineProperty(this.mouseHistory, 'pushPos', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function (x, y) { this.pos.push(x, y); }
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
    this.viewMatrix = new pc.Mat4();
    this.linearVelocity = new pc.Vec3();
    this.angularVelocity = new pc.Vec3();
    
    this.tangents = new pc.Vec2Array(this.config.historyNum);
    this.normals = new pc.Vec2Array(this.config.historyNum);
    this.averageTangents = new pc.Vec2();
    this.averageNormals = new pc.Vec2();
    
    let onCloseSettings = () => this.safetyLock = false;
    this.app.on("close:settings", onCloseSettings, this);
};

Pitch.prototype.postInitialize = function() {
    // Set this.view with priority
    // Scan the attribute first, then find any camera entity
    if(!this.view) this.view = this.entity.defaultCamera? this.entity.defaultCamera : this.entity.findByName("Camera");
    this.depth = Math.abs( this.entity.getPosition().sub( this.view.getPosition() ).z ); // Apply pc.Vec3.sub() to two pc.Vec3 objects and get absolute number of Z difference between two objects.
    
    // Input Callbacks
    const _press = ({ x, y }) => {
        if (this.canPitch) {
            this.safetyLock = true;
            this.ball.setPosition(this.view.camera.screenToWorld(x, y, this.depth));
            this.mouseHistory.reset();
            this.mouseHistory.pos.brutalSet(x, y);
        }
    };
    
    const _move = event => (this.canPitch && this.safetyLock)? this.move(event): null;
    const _release = event => (this.canPitch && this.safetyLock)? this.pitch(this.ball, this.mouseHistory): null;
    
    // Event Handler
    // Listen to global app events
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
    
    this.reset();
    this.app.inningMaster.on('reset', this.reset, this);
};

Pitch.prototype.move = function (_event) {    
    this.mouseHistory.pushDelta(_event.dx * this.screenRatio.width, _event.dy * this.screenRatio.height);
    this.mouseHistory.pushPos(_event.x, _event.y);
    this.ball.setPosition(this.view.camera.screenToWorld(_event.x, _event.y, this.depth));
};

Pitch.prototype.pitch = function (_ball, _mouseHistory) {
    if(this.app.debug) console.log(_mouseHistory);
    const [{ x, y }, ...rest] = _mouseHistory.pos.vectors;
    
    // Get both linear and angular velocity from mouse tangents in the mouse history
    this.inputVelocity.linear.screen.set(
        pc.customMath.averageFloatArray( _mouseHistory.delta.x, this.weightCurve.linear ),
        pc.customMath.averageFloatArray( _mouseHistory.delta.y, this.weightCurve.linear )
    );
    
    this.inputVelocity.angular.screen.set(
        pc.customMath.averageFloatArray( _mouseHistory.accel.x, this.weightCurve.angular ),
        pc.customMath.averageFloatArray( _mouseHistory.accel.y, this.weightCurve.angular )
    );
    
    this.inputVelocity.linear.world.copy( this.view.camera.screenToWorld(x + this.inputVelocity.linear.screen.x, y + this.inputVelocity.linear.screen.y, this.depth) );
    this.inputVelocity.linear.world.sub( _ball.getPosition()).scale( this.coefficient.linear );
    
    this.inputVelocity.angular.world.copy( this.view.camera.screenToWorld(x + this.inputVelocity.angular.screen.x, y + this.inputVelocity.angular.screen.y, this.depth) );
    this.inputVelocity.angular.world.sub( _ball.getPosition()).scale( this.coefficient.angular );
    
    var magnitude = pc.customMath.averageFloatArray( _mouseHistory.delta.lengths, this.linearWeights );
    
    // Normalize the delta to apply accurate this.inputVelocity.angular.world.z
    // Unit Normal Vector != Normalized Vector
    var self = this;
    _mouseHistory.delta.vectors.forEach((element, i) => self.tangents.vectors[i].copy( element.normalize().clone() ));
    
    for (var i = 0; this.tangents.vectors.length-1 > i; ++i) {
        this.normals.vectors[i].copy( this.tangents.vectors[i+1].clone().sub(this.tangents.vectors[i]) );
    }
    
    this.tangents.update();
    this.normals.update();
    
    this.averageTangents.set( pc.customMath.averageFloatArray( this.tangents.x ), pc.customMath.averageFloatArray( this.tangents.y ));
    this.averageNormals.set( pc.customMath.averageFloatArray( this.normals.x ), pc.customMath.averageFloatArray( this.normals.y ));
    if (this.app.debug) console.log(`this.tangents`, this.tangents, `this.normals`, this.normals);
    
    var curvature = this.averageNormals.clone().scale(15).lengthSq(); // which is same as normalizedDelta[5].clone().sub(normalizedDelta[0])

    // Brutal forcing tangent direction
    var firstSection = ( this.averageNormals.x > 0 && this.averageNormals.y < 0 );
    var secondSection = ( this.averageNormals.x > 0 && this.averageNormals.y > 0);
    var thirdSection = ( this.averageNormals.x < 0 && this.averageNormals.y > 0 );
    var fourthSection = ( this.averageNormals.x < 0 && this.averageNormals.y < 0 );
    
    var clockwise = (firstSection && this.averageTangents.x > 0 && this.averageTangents.y > 0)  || (secondSection && this.averageTangents.x < 0 && this.averageTangents.y > 0) || (thirdSection && this.averageTangents.x < 0 && this.averageTangents.y < 0)  || (fourthSection && this.averageTangents.x > 0 && this.averageTangents.y < 0);
    
    var viewAngle = this.view.getEulerAngles();
    this.viewMatrix.setFromEulerAngles(viewAngle.x, viewAngle.y, viewAngle.z);
    
    // Velocity final calculation
    // The more spin the ball has, the less vertical and horizontal velocity applies. 30deg
    this.linearVelocity.set( this.inputVelocity.linear.world.x * Math.abs(this.inputVelocity.angular.world.x) / this.config.baselineAngle, this.inputVelocity.linear.world.y * Math.abs(this.inputVelocity.angular.world.y) / this.config.baselineAngle, (this.inputVelocity.linear.world.z + magnitude) * -1);
    this.angularVelocity.set( this.inputVelocity.angular.world.y, -this.inputVelocity.angular.world.x, curvature * (clockwise? -1 : 1) );
    
    
    // Pitch Data Object that will be crucial to remember
    // This object data will always be used in many scripts.
    // IMPORTANT!!!
    const data = {
        ball: this.ball,
        mouseHistory : _mouseHistory.pos.vectors,
        inputVelocity : { linear : this.inputVelocity.linear.screen, angular : this.inputVelocity.angular.screen },
        linearVelocity : this.viewMatrix.transformPoint(this.linearVelocity),
        angularVelocity : this.viewMatrix.transformPoint(this.angularVelocity),
    };
    
    if (this.linearVelocity.length() > this.config.minimumVelocity) {
        if(this.ball) this.ball.fire('pitch', data);
        if(this.app.inningMaster) this.app.inningMaster.fire('pitch', data);
        this.canPitch = false;
    }
};

Pitch.prototype.reset = function () {
    this.canPitch = true;
    this.safetyLock = false;
    this.mouseHistory.reset();
    this.createBall(this, this.view.getPosition().mul(pc.Vec3.UP));
};

Pitch.prototype.createBall = function (scope = this, pos = this.app.pitcher.getPosition()) {
    scope.ball = this.ballTemplate.resource.instantiate();
    this.app.root.children[0].addChild(scope.ball);
    scope.ball.enabled = true;
    scope.ball.setPosition(pos);
};