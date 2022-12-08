const Settings = pc.createScript('settings');

Settings.attributes.add('options', {
    type: 'json',
    array: true,
    schema: [{
        name: 'name',
        title: 'Name',
        type: 'string',
    }, {
        name: 'val',
        title: 'Default Value',
        type: 'string',
    }, {
        name: 'entity',
        title: 'UI Entity',
        type: 'entity',
    }]
});

Settings.attributes.add('primaryUI', {
    type: 'entity',
    title: 'Primary UI'
});

// initialize code called once per entity
Settings.prototype.initialize = function() {
    this.app.on("open:settings", this.openSettings, this);
    this.app.on("close:settings", this.closeSettings, this);
    
    if (!this.app.settings) this.app.settings = {};
        
    this.options.forEach((option) => {
        // Fill the app settings with the date in the localstorage or option.val
        const storedVal = () => {
            // Rename any useful variable with an easier term
            let fromLocal = localStorage.getItem(option.name);
            let fromApp = this.app.settings[option.name];
            
            let parsedInt = parseInt(fromLocal);
            fromLocal = (isNaN(parsedInt)? parseBoolean(fromLocal): parsedInt);
            if(this.app.debug) console.log(`Check the value from Localstorage to see whether it is integer or boolean : ${fromLocal}`);
            
            const checkFunc = _var => (typeof _var !== 'undefined' && _var !== null);
            
            // Check the undefined or null in localStorage first, then repeat same process to this.app.settings if nothing exists in localStorage
            return (checkFunc(fromLocal)? fromLocal: (checkFunc(fromApp)? fromApp: option.val));
        };        
        Object.defineProperty(this.app.settings, option.name, {value: storedVal.call(this), writable: true});

        // Put eventhandler for each option entity
        option.entity.on("set:value", (_value, _name = option.name) => {
            functionalPermission = parseInt(localStorage.getItem("storagePermission")) & 1 << 1;
            if (functionalPermission) localStorage.setItem(_name, _value);
            this.app.settings[_name] = _value;
        }, this);
        option.entity.on("requestDefault", () => option.entity.fire("set:default", this.app.settings[option.name]), this);

        // Check Funnctional Permission, then set items in localStorage if necessary
        let functionalPermission = parseInt(localStorage.getItem("storagePermission")) & 1 << 1;
        if (!localStorage.getItem(option.name) && functionalPermission) localStorage.setItem(option.name, option.val);
    });
    
    this.entity.on("destroy", () => {
        this.app.off("open:settings", this.openSettings, this);
        this.app.off("close:settings", this.closeSettings, this);
    }, this);
};

Settings.prototype.openSettings = function() {
    const bg = this.entity.findByName("Background");
    this.primaryUI.enabled = true;
    if (bg) bg.enabled = true;
};

Settings.prototype.closeSettings = function() {
    this.entity.children.forEach(node => node.enabled = false);
};