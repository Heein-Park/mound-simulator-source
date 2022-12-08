class InteractiveElement extends pc.ScriptType {
    initialize() {
        if (this.app.mouse) this.app.mouse.disableContextMenu();
        
        this.entity.isInit = true;
        this.entity.callbacks = {
            onClick : {
                left: [],
                right: [],
            },
            onTouch : []
        };
        
        const canvas = document.body.getElementsByTagName("canvas")[0];
        
        this.entity.button.on("click", (event) => {
            if (event.event.target === canvas) {
                if (event instanceof pc.ElementMouseEvent)
                switch (event.button) {
                    case 0:
                        if (this.entity.callbacks.onClick.left.length > 0)
                        this.entity.callbacks.onClick.left.forEach(_callback => _callback.call(this));
                        break;
                    case 2:
                        if (this.entity.callbacks.onClick.right.length > 0)
                        this.entity.callbacks.onClick.right.forEach(_callback => _callback.call(this));
                        break;
                }
                else if (event instanceof pc.ElementTouchEvent) 
                if (this.entity.callbacks.onTouch.length > 0)
                this.entity.callbacks.onTouch.forEach(_callback => _callback.call(this));
            }
        }, this);
        
        const onLeave = () => this.app.fire("leave:UI", this.entity.button);
        const onEnter = () => this.app.fire("enter:UI", this.entity.button);
        
        if (this.app.mouse) {
            this.entity.button.on("mouseleave", onLeave, this);
            this.entity.button.on("mouseenter", onEnter, this);
        }
        
        if (this.app.touch) {
            this.entity.button.on("touchcancel", onLeave, this);
            this.entity.button.on("touchleave", onLeave, this);
            this.entity.button.on("touchstart", onEnter, this);
            // this.entity.button.on("touchcancel", onLeave, this);
        }
    }
}

class MenuSwitchButton extends InteractiveElement {
    initialize() {
        if(!this.entity.isInit)
        super.initialize();
        
        const click = () => {
            if (this.menus.from) this.menus.from.enabled = false;
            if (this.menus.to) this.menus.to.enabled = true;
        };

        this.entity.callbacks.onClick.left.push(click);
        this.entity.callbacks.onTouch.push(click);
    }
}

class InGameButton extends InteractiveElement {
    initialize() {
        if(!this.entity.isInit)
        super.initialize();
        
        this.targetScope = undefined;
        
        switch (this.scope) {
            default :
                this.targetScope = this.app;
                break;
            case 1 :
                this.targetScope = this.entity;
                break;
        }
        
        const click = () => {
            if (this.targetScope) this.targetScope.fire(this.message);
            if (this.app.debug) console.log(this.message);
        };
        
        this.entity.callbacks.onClick.left.push(click);
        this.entity.callbacks.onTouch.push(click);
    }
}

class HTMLPopUpButton extends InteractiveElement {
    initialize() {
        if(!this.entity.isInit)
        super.initialize();
        
        const click = () => this.htmlContainer.fire("show");

        this.entity.callbacks.onClick.left.push(click);
        this.entity.callbacks.onTouch.push(click);
    }
}

pc.registerScript(MenuSwitchButton, "menuSwitchButton");
pc.registerScript(HTMLPopUpButton, "HTMLPopUpButton");
pc.registerScript(InGameButton, "inGameButton");

MenuSwitchButton.attributes.add('menus', {
    type: 'json',
    title: 'Target Menu',
    schema: [{
        name: "from",
        type: 'entity',
    }, {
        name: "to",
        type: 'entity',
    }]
});

HTMLPopUpButton.attributes.add('htmlContainer', {
    type: 'entity',
    title: 'Html Container',
});

InGameButton.attributes.add('message', {
    type: 'string',
    title: 'Message',
});

InGameButton.attributes.add('scope', {
    type: 'number',
    title: 'Scope',
    default: 0,
    enum: [
        { 'application': 0 },
        { 'entity': 1 },
    ]
});