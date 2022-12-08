const Timer = pc.createScript('timer');

Timer.prototype.initialize = function() {
    this.timers = {};
    this.nextFreeId = 0;
};

Timer.prototype.add = function(duration, callback, scope) {
    if (duration > 0) {
        const handle = {};
        handle.id = this.nextFreeId;
        
        this.timers[this.nextFreeId] = {
            resume: false,
            secsLeft: duration,
            callback: callback,
            scope: scope,
        };
        
        let _timer = this.timers[this.nextFreeId];
        
        _timer.start = () => _timer.resume = true;
        _timer.stop = () => _timer.resume = false;
        _timer.reset = () => {
            _timer.stop();
            _timer.secsLeft = duration;
        };
        
        handle.timer = _timer;

        this.nextFreeId += 1;
        return handle;
    }
    return null;
};

Timer.prototype.fire = function(duration, callback, overlap, scope) {
    if (duration > 0) {
        if (overlap) {
            if(this.app.debug) console.log(this.timers);
            for (let property in this.timers) {
                let timer = this.timers[property];

                if (timer.temp === true) {
                    timer.resume = false;
                    delete this.timers[property];
                }
            }
            if(this.app.debug) console.log(this.timers);
        }
        
        this.timers[this.nextFreeId] = {
            resume: true,
            temp: true,
            secsLeft: duration,
            callback: callback,
            scope: scope,
        };

        this.nextFreeId += 1;
    }
};

Timer.prototype.start = function(handle) { if (handle) this.timers[handle.id].start(); };
Timer.prototype.stop = function(handle) { if (handle) this.timers[handle.id].stop(); };
Timer.prototype.reset = function(handle) { if (handle) this.timers[handle.id].reset(); };
Timer.prototype.delete = function(handle) { if (handle) delete this.timers[handle.id]; };

Timer.prototype.log = function() {
    console.log(this.timers, `Next Free ID : ${this.nextFreeId}`);
};

Timer.prototype.update = function(dt) {
    for (let property in this.timers) {
        let timer = this.timers[property];
        
        if (timer.resume === true) {
            if (timer.secsLeft > 0) timer.secsLeft -= dt / this.app.timeScale;
            else if (timer.secsLeft <= 0) {
                timer.callback.call(timer.scope);
                if (timer.reset) timer.reset();
                else delete this.timers[property];
            }
        }
    }
};