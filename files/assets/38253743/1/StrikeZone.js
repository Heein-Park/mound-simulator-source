const StrikeZone = pc.createScript('strikeZone');

// The Zone script is created to get 3D point vertices of a rectangular zone object

// initialize code called once per entity
StrikeZone.prototype.initialize = function() {
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
    
    // this.entity.on(`contact:${this.app.ball.name}`, (ball, data) => this.app.inningMaster.fire("zone:in", ball, data), this);
    
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
            distance.mul(new pc.Vec3(1,0,1));
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
StrikeZone.prototype.update = function(dt) {
    this.app.renderLines(this.points, this.colors, {
        layer: this.layer,
        depthTest: false
    });
};