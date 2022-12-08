const Token = pc.createScript('token');

// initialize code called once per entity
Token.prototype.initialize = function() {
    this.sprite = this.entity.element.sprite;
    if (this.sprite) {
        this.entity.on("on", function () {
            this.entity.element.spriteFrame = 1;
            if (this.app.debug) console.log(`Token Status Change ${this.entity.element.spriteFrame > 0? "on": "off"}`); 
        }, this);

        this.entity.on("off", function () {
            this.entity.element.spriteFrame = 0;
            if (this.app.debug) console.log(`Token Status Change ${this.entity.element.spriteFrame > 0? "on": "off"}`); 
        }, this);
    } else {
        console.error(`No ${this.sprite}`);
    }
};