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