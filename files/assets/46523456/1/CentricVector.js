/* Convert any screen coordinate vectors into centirc coordinates, which are the differences between screen vectors and center vectors
since the existing screen vectors can differ based on device sizes, so unifies them to center oriented forms. */

pc.centricVector = function(_vec2) {
    let device = pc.Application.getApplication().graphicsDevice;
    this.scrDim = new pc.Vec2(device.width, device.height).divScalar(device.maxPixelRatio);
    this.centerPos = this.scrDim.clone().divScalar(2);
    this.result = new pc.Vec2();
    
    this.refDim = (device.width + device.height)/2;
    this.scrRatio = {
        width :  ( this.refDim * device.maxPixelRatio ) / device.width,
        height : ( this.refDim * device.maxPixelRatio ) / device.height,
    };
    
    device.on('resizecanvas', function (width, height) {
        this.scrDim.set(width, height).divScalar(device.maxPixelRatio);
        this.centerPos.copy(this.scrDim).divScalar(2);
    }, this);    
    
    this.result.copy(_vec2).sub(this.centerPos);
    return this.result;
};