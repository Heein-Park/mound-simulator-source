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
DebuggingAxes.prototype.initialize = function() {
    this.currentPosition = new pc.Vec3();
    this.axes = {
        X: new pc.Vec3(),
        Y: new pc.Vec3(),
        Z: new pc.Vec3(),
    };
    this.axisVector = new pc.Vec3();
};

// update code called every frame
DebuggingAxes.prototype.update = function(dt) {
    if (this.app.debug) {
        this.currentPosition.copy(this.entity.getPosition());
        
        if (this.absolute) this.axisVector.copy(pc.Vec3.ONE).mulScalar(this.scale);
        else this.axisVector.copy(this.entity.getLocalPosition()).normalize().mulScalar(this.scale);
    
        this.axes.X.copy(this.axisVector).project(pc.Vec3.UP).add(this.currentPosition);
        this.axes.Y.copy(this.axisVector).project(pc.Vec3.RIGHT).add(this.currentPosition);
        this.axes.Z.copy(this.axisVector).project(pc.Vec3.BACK).add(this.currentPosition);

        this.app.renderLine(this.currentPosition, this.axes.X, pc.Color.BLUE);
        this.app.renderLine(this.currentPosition, this.axes.Y, pc.Color.YELLOW);
        this.app.renderLine(this.currentPosition, this.axes.Z, pc.Color.RED);
    }
};