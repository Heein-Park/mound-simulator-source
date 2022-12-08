// https://forum.playcanvas.com/t/solved-cleaning-up-events/8451/4
pc.Entity.prototype.destroyOld = pc.Entity.prototype.destroy;
pc.Entity.prototype.destroy = function() {
    this.fire('beforedestroy', this);
    pc.Entity.prototype.destroyOld.apply(this);
};