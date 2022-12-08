/* Custom Constant Functions */
// Create a 2 Dimensional Vector Array
pc.Vec2Array = function (_length) {
    let _vectors = [];

    for (var i = 0; i < _length; i++)
    _vectors.push(new pc.Vec2(0, 0));

    this.vectors = _vectors;
    this.x = [];
    this.y = [];
    this.lengths = [];
    this.mapping = (baseArray, callback, scope, targetArray) => {             
         if (baseArray) {
            if (Array.isArray(baseArray)) {
                if (!targetArray) {
                    return baseArray.map(callback.call(scope));
                } else {
                    if (Array.isArray(targetArray)) {
                        while (targetArray.length > 0) targetArray.pop();
                        baseArray.forEach(cell => targetArray.push(callback.call(scope, cell)));
                    } else {
                        targetArray = baseArray.map(callback.call(scope));
                    }
                }
            }
        }   
    };

    this.push = function (x, y) {
        for (let i = _length-1; i > 0; i--) this.vectors[i].copy(this.vectors[i-1]);
        this.vectors[0].x = x;
        this.vectors[0].y = y;
        this.update();
    };

    this.brutalSet = function (x, y) {
        this.vectors.forEach(vector => vector.set(x, y));
    };

    this.update = function () {
        this.mapping(this.vectors, vector => vector.x, this, this.x);
        this.mapping(this.vectors, vector => vector.y, this, this.y);
        this.mapping(this.vectors, vector => vector.length(), this, this.lengths);
    };

    this.reset = function () {
        this.vectors.forEach(vector => vector.set(0, 0));
        this.update();
    };

    this.update();
};

// Create a 3 Dimensional Vector Array
pc.Vec3Array = function ( _length ) {
    pc.Vec2Array.call(this, _length);
    let _vectors = [];

    for (var i = 0; i < _length; i++) {
        _vectors.push(new pc.Vec3(0, 0));
    }

    this.vectors = _vectors;
    this.z = [];

    const oldupdate = this.update;
    const oldpush = this.push;

    this.push = function (x, y, z) {
        oldpush.call(this, x, y);
        this.vectors[0].z = z;
        this.update();
    };

    this.brutalSet = function (x, y, z) {
        this.vectors.forEach(vector => vector.set(x, y, z));
    };

    this.update = function () {
        oldupdate.call(this);
        this.mapping(this.vectors, vector => vector.z, this, this.z);
    };

    this.reset = function () {
        this.vectors.forEach( vector => vector.set(0, 0, 0));
        this.update();
    };

    this.update();
};