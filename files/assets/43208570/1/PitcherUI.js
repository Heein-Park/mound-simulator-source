const PitcherUI = pc.createScript('pitcherUI');

PitcherUI.attributes.add('UIelements', {
    type: 'json',
    title: 'UI Elements',
    schema: [{
        name: "statusText",
        type: 'entity',
    }, {
        name: "umpireSignal",
        type: 'entity',
    }]
});

// initialize code called once per entity
PitcherUI.prototype.initialize = function() {
    this.app.inningMaster.on('pitch', this.onPitch, this);
    this.app.inningMaster.on('conclude', ball => this.showUmpireText(ball), this);
    this.app.inningMaster.on("reset", this.reset, this);
    
    this.app.on("change:settings", this.onChangeSettings, this);
    
    this.entity.on("destroy", () => {
        this.app.off("change:settings", this.onChangeSettings, this);
    }, this);
};

PitcherUI.prototype.postInitialize = function() {
    this.onChangeSettings();
};

PitcherUI.prototype.onChangeSettings = function() {
    switch (parseInt(this.app.settings.pitchTraceDisplay)) {
        case 0:
            this.entity.script.arrowUI.fire("enable:inputUI", true);
            this.entity.script.mouseHistoryUI.fire("enable:inputUI", false);
            break;
        case 1: 
            this.entity.script.arrowUI.fire("enable:inputUI", false);
            this.entity.script.mouseHistoryUI.fire("enable:inputUI", true);
            break;
    }
};

PitcherUI.prototype.onPitch = function({ linearVelocity }) { 
    this.UIelements.statusText.element.text = "Speed : " + pc.customMath.round( linearVelocity.length() ,1) + "mps";
};

PitcherUI.prototype.showUmpireText = function(ball) {
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    this.UIelements.umpireSignal.enabled = true;
    this.UIelements.umpireSignal.element.text = capitalize(ball.status);
};

PitcherUI.prototype.reset = function() {
    this.UIelements.umpireSignal.enabled = false;
};