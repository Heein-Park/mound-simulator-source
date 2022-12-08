const JsonArrange = pc.createScript('jsonArrange');

JsonArrange.prototype.recursiveArrange = function(nest, ...keys) {
    if(keys && keys.length > 0) {
        let currentKey = keys[0];
        let _nest = this.arrange(nest, currentKey);

        keys.shift();
        for (const [name, childNest] of Object.entries(_nest)) {
            const argument = [childNest].concat(keys); // argument will look like [childNest, "key2", "key3"]
            if (keys.length > 1) _nest[name] = this.recursiveArrange.apply(this, argument);
            else _nest[name] = this.arrange.apply(this, argument);
        }
        return _nest;
    }
};

JsonArrange.prototype.arrange = function(nest, key) {
    let _nest = {}; //Temporary Nest
    let currentValue; // For labelling a key of each enties

    /* Filling In! */
    // The name and the object of a setting option list
    for (const [name, obj] of Object.entries(nest)) { // Iterator
        // Check whether the object actually contain key
        if(obj.hasOwnProperty(key)) {
            let _currentValue = obj[key]; // Temporary value in order to identify any redundancy
            if (currentValue === undefined || currentValue !== _currentValue){
                currentValue = _currentValue;
                _nest[currentValue] = {}; // Labelling sub-nest(or category) with currentValue
            }
            _nest[currentValue][name] = obj; // Filling in
        }
    }
    return _nest;
};

JsonArrange.prototype.filter = function(nest, key, value) {
    let _nest = {};
    
    for (const [name, obj] of Object.entries(nest)) {
        if(obj.hasOwnProperty(key) && obj[key] === value) {
            _nest[name] = obj;
        }
    }
    return _nest;
};