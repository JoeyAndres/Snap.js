let Snap = require('./snap');

if (typeof window !== "undefined" && !window.Snap) {
    window.Snap = Snap;
}
