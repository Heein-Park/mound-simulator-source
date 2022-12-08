const Global = pc.createScript('global');

// initialize code called once per entity
Global.prototype.initialize = function() {
    const url = new URL(window.location.href);
    this.app.debug = parseBoolean(url.searchParams.get("debug"));
    if (this.app.debug) console.log(this.app);
};