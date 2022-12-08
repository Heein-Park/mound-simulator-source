const BooleanButton = pc.createScript('booleanButton');

// initialize code called once per entity
BooleanButton.prototype.initialize = function() {
    this.boolean = true;
    
    this.element = this.entity.element;
    this.entity.button.on("click", this.toggle, this);
    this.entity.once("set:default", function (value) {
        if (typeof value === "string") 
            this.boolean = parseBoolean(value);
        else if (typeof value === "boolean")
            this.boolean = value;

        this.setBoolean(this.boolean);
    }, this);
    
    // The property this.value will be equally used in any element in settings
    // that may differ based on the type of a button.
    // In this case, a boolean button will return this.boolean when a user requests its value.
    this.__defineGetter__('value', function() { return this.boolean; });
};

BooleanButton.prototype.postInitialize = function() {
    this.entity.fire("requestDefault");
};

BooleanButton.prototype.toggle = function() {
    this.boolean = !this.boolean;
    this.setBoolean(this.boolean);
};

BooleanButton.prototype.setBoolean = function(_boolean) {
    if (this.element.type === "image")
    switch (_boolean) {
        case false: this.element.spriteFrame = 0; break;
        case true: this.element.spriteFrame = 1; break;
    }
    
    this.entity.fire("set:value", this.value);
};