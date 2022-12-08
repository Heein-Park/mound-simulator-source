const Loader = pc.createScript('loader');

Loader.attributes.add('targetAssets', {
    type: 'json',
    title: 'Assets',
    schema: [{
        name: "direct",
        type: 'asset',
        array: true,
    }, {
        name: "tag",
        type: 'string',
        array: true,
    }]
});

Loader.attributes.add('config', {
    title: 'Configuration',
    type: 'json',
    schema: [{
        name: "autoCheck",
        type: 'boolean', 
        title: 'Auto Check',
        default: true,
    },{
        name: "checkOnly",
        type: 'boolean', 
        title: 'Check Only',
        default: false,
    }]
});

// initialize code called once per entity
Loader.prototype.initialize = function() {
    this.assetsNum = 0;
    this.allLoaded = false;
    
    this.assets = this.targetAssets.direct; // Array
    this.targetAssets.tag.forEach((tag, i, tags) => {
        for (let asset of this.app.assets.findByTag(tag)) {
            this.assets.push(asset);
        }
    });
    
    this.entity.on("check:loader", this.checkLoad, this);
    if(this.config.autoCheck) this.checkLoad();
};

Loader.prototype.postInitialize = function() {
    if (!this.allLoaded && !this.checkOnly) {
        for (let asset of this.assets) {
            if (!asset.loaded) {
                this.app.assets.load(asset);
            }
        }
    }
};

Loader.prototype.checkLoad = function() {
    this.assetsNum = 0;
    const numCheck = () => {
        ++this.assetsNum;
        if (this.assetsNum >= this.assets.length) {
            this.entity.fire("load");
            this.allLoaded = true;
        }
    };
    
    this.assets.forEach((asset, i, assets) => {
        if(asset.loaded) {
            numCheck();
        } else {
            asset.ready(function (asset) {
                numCheck();
            }, this);
        }
    });
};
