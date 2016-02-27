"use strict";

(function e(t, n, r) {
    function s(o, u) {
        if (!n[o]) {
            if (!t[o]) {
                var a = typeof require == "function" && require;if (!u && a) return a(o, !0);if (i) return i(o, !0);throw new Error("Cannot find module '" + o + "'");
            }var f = n[o] = { exports: {} };t[o][0].call(f.exports, function (e) {
                var n = t[o][1][e];return s(n ? n : e);
            }, f, f.exports, e, t, n, r);
        }return n[o].exports;
    }var i = typeof require == "function" && require;for (var o = 0; o < r.length; o++) {
        s(r[o]);
    }return s;
})({ 1: [function (require, module, exports) {
        var Snap = require('./snap');

        if (typeof window !== "undefined" && !window.Snap) {
            window.Snap = Snap;
        }
    }, { "./snap": 2 }], 2: [function (require, module, exports) {
        /*
         * Snap.js
         *
         * Copyright 2013, Jacob Kelley - http://jakiestfu.com/
         * Released under the MIT Licence
         * http://opensource.org/licenses/MIT
         *
         * Copyright 2016, Joey Andres
         */

        var Snap = function Snap(userOpts) {
            var settings = {
                element: null,
                dragger: null,
                disable: 'none',
                addBodyClasses: true,
                hyperextensible: true,
                resistance: 0.5,
                flickThreshold: 50,
                transitionSpeed: 0.3,
                easing: 'ease',
                maxPosition: 266,
                minPosition: -266,
                tapToClose: true,
                touchToDrag: true,
                slideIntent: 40, // degrees
                minDragDistance: 5,
                stopPropagation: true
            },
                cache = {
                simpleStates: {
                    opening: null,
                    towards: null,
                    hyperExtending: null,
                    halfway: null,
                    flick: null,
                    translation: {
                        absolute: 0,
                        relative: 0,
                        sinceDirectionChange: 0,
                        percentage: 0
                    }
                }
            },
                eventList = {},
                utils = {
                hasTouch: 'ontouchstart' in window || window.DocumentTouch && document instanceof DocumentTouch,
                eventType: function eventType(action) {
                    var eventTypes = {
                        down: 'pointerdown',
                        move: 'pointermove',
                        up: 'pointerup',
                        out: 'pointerout'
                    };
                    return eventTypes[action];
                },
                page: function page(t, e) {
                    return utils.hasTouch ? e.touches ? e.touches.length > 0 ? e.touches[0]["page" + t] : e.changedTouches[0]["page" + t] : e["page" + t] : e["page" + t];
                },
                klass: {
                    has: function has(el, name) {
                        return el.className.indexOf(name) !== -1;
                    },
                    add: function add(el, name) {
                        if (!utils.klass.has(el, name) && settings.addBodyClasses) {
                            el.className += " " + name;
                        }
                    },
                    remove: function remove(el, name) {
                        if (settings.addBodyClasses) {
                            el.className = el.className.replace(name, "").replace(/^\s+|\s+$/g, '');
                        }
                    }
                },
                dispatchEvent: function dispatchEvent(type) {
                    if (typeof eventList[type] === 'function') {
                        return eventList[type].call();
                    }
                },
                vendor: function vendor() {
                    var tmp = document.createElement("div"),
                        prefixes = 'webkit Moz O ms'.split(' '),
                        i;
                    for (i in prefixes) {
                        if (typeof tmp.style[prefixes[i] + 'Transition'] !== 'undefined') {
                            return prefixes[i];
                        }
                    }
                },
                transitionCallback: function transitionCallback() {
                    return cache.vendor === 'Moz' || cache.vendor === 'ms' ? 'transitionend' : cache.vendor + 'TransitionEnd';
                },
                deepExtend: function deepExtend(destination, source) {
                    var property;
                    for (property in source) {
                        if (source[property] && source[property].constructor && source[property].constructor === Object) {
                            destination[property] = destination[property] || {};
                            utils.deepExtend(destination[property], source[property]);
                        } else {
                            destination[property] = source[property];
                        }
                    }
                    return destination;
                },
                angleOfDrag: function angleOfDrag(x, y) {
                    var degrees, theta;
                    // Calc Theta
                    theta = Math.atan2(-(cache.startDragY - y), cache.startDragX - x);
                    if (theta < 0) {
                        theta += 2 * Math.PI;
                    }
                    // Calc Degrees
                    degrees = Math.floor(theta * (180 / Math.PI) - 180);
                    if (degrees < 0 && degrees > -180) {
                        degrees = 360 - Math.abs(degrees);
                    }
                    return Math.abs(degrees);
                },
                events: {
                    addEvent: function addEvent(element, eventName, func) {
                        if (element.addEventListener) {
                            return element.addEventListener(eventName, func, false);
                        } else if (element.attachEvent) {
                            return element.attachEvent("on" + eventName, func);
                        }
                    },
                    removeEvent: function addEvent(element, eventName, func) {
                        if (element.addEventListener) {
                            return element.removeEventListener(eventName, func, false);
                        } else if (element.attachEvent) {
                            return element.detachEvent("on" + eventName, func);
                        }
                    },
                    prevent: function prevent(e) {
                        if (e.preventDefault) {
                            e.preventDefault();
                        } else {
                            e.returnValue = false;
                        }
                    }
                },
                parentUntil: function parentUntil(el, attr) {
                    var isStr = typeof attr === 'string';
                    while (el.parentNode) {
                        if (isStr && el.getAttribute && el.getAttribute(attr)) {
                            return el;
                        } else if (!isStr && el === attr) {
                            return el;
                        }
                        el = el.parentNode;
                    }
                    return null;
                }
            },
                action = {
                translate: {
                    get: {
                        matrix: function matrix(index) {
                            var matrix = window.getComputedStyle(settings.element)[cache.vendor + 'Transform'].match(/\((.*)\)/),
                                ieOffset = 8;
                            if (matrix) {
                                matrix = matrix[1].split(',');
                                if (matrix.length === 16) {
                                    index += ieOffset;
                                }
                                return parseInt(matrix[index], 10);
                            }
                            return 0;
                        }
                    },
                    easeCallback: function easeCallback() {
                        settings.element.style[cache.vendor + 'Transition'] = '';
                        cache.translation = action.translate.get.matrix(4);
                        cache.easing = false;
                        clearInterval(cache.animatingInterval);

                        if (cache.easingTo === 0) {
                            utils.klass.remove(document.body, 'snapjs-right');
                            utils.klass.remove(document.body, 'snapjs-left');
                        }

                        utils.dispatchEvent('animated');
                        utils.events.removeEvent(settings.element, utils.transitionCallback(), action.translate.easeCallback);
                    },
                    easeTo: function easeTo(n) {
                        cache.easing = true;

                        cache.easingTo = n;
                        settings.element.style[cache.vendor + 'Transition'] = 'all ' + settings.transitionSpeed + 's ' + settings.easing;
                        cache.animatingInterval = setInterval(function () {
                            utils.dispatchEvent('animating');
                        }, 1);

                        utils.events.addEvent(settings.element, utils.transitionCallback(), action.translate.easeCallback);
                        action.translate.x(n);

                        if (n === 0) {
                            settings.element.style[cache.vendor + 'Transform'] = '';
                        }
                    },
                    x: function x(n) {
                        if (settings.disable === 'left' && n > 0 || settings.disable === 'right' && n < 0) {
                            return;
                        }

                        if (!settings.hyperextensible) {
                            if (n === settings.maxPosition || n > settings.maxPosition) {
                                n = settings.maxPosition;
                            } else if (n === settings.minPosition || n < settings.minPosition) {
                                n = settings.minPosition;
                            }
                        }

                        n = parseInt(n, 10);
                        if (isNaN(n)) {
                            n = 0;
                        }

                        var theTranslate = "translate3d(" + n + "px, 0,0)";
                        settings.element.style[cache.vendor + 'Transform'] = theTranslate;
                    }
                },
                drag: {
                    listen: function listen() {
                        cache.translation = 0;
                        cache.easing = false;

                        ['touchstart', 'pointerdown', 'MSPointerDown', 'mousedown'].forEach(function (e) {
                            return utils.events.addEvent(settings.element, e, action.drag.handleEvent);
                        });
                        ['touchmove', 'pointermove', 'MSPointerMove', 'mousemove'].forEach(function (e) {
                            return utils.events.addEvent(settings.element, e, action.drag.handleEvent);
                        });
                        ['touchend', 'pointerup', 'MSPointerUp', 'mouseup', 'touchcancel', 'pointercancel', 'MSPointerCancel', 'mousecancel'].forEach(function (e) {
                            return utils.events.addEvent(settings.element, e, action.drag.handleEvent);
                        });
                    },
                    stopListening: function stopListening() {
                        ['touchstart', 'pointerdown', 'MSPointerDown', 'mousedown'].forEach(function (e) {
                            return utils.events.removeEvent(settings.element, e, action.drag.handleEvent);
                        });
                        ['touchmove', 'pointermove', 'MSPointerMove', 'mousemove'].forEach(function (e) {
                            return utils.events.removeEvent(settings.element, e, action.drag.handleEvent);
                        });
                        ['touchend', 'pointerup', 'MSPointerUp', 'mouseup', 'touchcancel', 'pointercancel', 'MSPointerCancel', 'mousecancel'].forEach(function (e) {
                            return utils.events.removeEvent(settings.element, e, action.drag.handleEvent);
                        });
                    },
                    handleEvent: function handleEvent(e) {
                        switch (e.type) {
                            case 'touchstart':
                            case 'pointerdown':
                            case 'MSPointerDown':
                            case 'mousedown':
                                action.drag.startDrag(e);
                                break;
                            case 'touchmove':
                            case 'pointermove':
                            case 'MSPointerMove':
                            case 'mousemove':
                                action.drag.dragging(e);
                                break;
                            case 'touchend':
                            case 'pointerup':
                            case 'MSPointerUp':
                            case 'mouseup':
                            case 'touchcancel':
                            case 'pointercancel':
                            case 'MSPointerCancel':
                            case 'mousecancel':
                                action.drag.endDrag(e);
                                break;
                        }
                    },
                    startDrag: function startDrag(e) {
                        // No drag on ignored elements
                        var target = e.target ? e.target : e.srcElement,
                            ignoreParent = utils.parentUntil(target, 'data-snap-ignore');

                        if (ignoreParent) {
                            utils.dispatchEvent('ignore');
                            return;
                        }

                        if (settings.dragger) {
                            var dragParent = utils.parentUntil(target, settings.dragger);

                            // Only use dragger if we're in a closed state
                            if (!dragParent && cache.translation !== settings.minPosition && cache.translation !== settings.maxPosition) {
                                return;
                            }
                        }

                        utils.dispatchEvent('start');
                        settings.element.style[cache.vendor + 'Transition'] = '';
                        cache.isDragging = true;
                        cache.hasIntent = null;
                        cache.intentChecked = false;
                        cache.startDragX = utils.page('X', e);
                        cache.startDragY = utils.page('Y', e);
                        cache.dragWatchers = {
                            current: 0,
                            last: 0,
                            hold: 0,
                            state: ''
                        };
                        cache.simpleStates = {
                            opening: null,
                            towards: null,
                            hyperExtending: null,
                            halfway: null,
                            flick: null,
                            translation: {
                                absolute: 0,
                                relative: 0,
                                sinceDirectionChange: 0,
                                percentage: 0
                            }
                        };
                    },
                    dragging: function dragging(e) {
                        if (cache.isDragging && settings.touchToDrag) {
                            if (cache.hasIntent && settings.stopPropagation) e.stopPropagation();

                            var thePageX = utils.page('X', e),
                                thePageY = utils.page('Y', e),
                                translated = cache.translation,
                                absoluteTranslation = action.translate.get.matrix(4),
                                whileDragX = thePageX - cache.startDragX,
                                openingLeft = absoluteTranslation > 0,
                                translateTo = whileDragX,
                                diff;

                            // Shown no intent already
                            if (cache.intentChecked && !cache.hasIntent) {
                                return;
                            }

                            if (settings.addBodyClasses) {
                                if (absoluteTranslation > 0) {
                                    utils.klass.add(document.body, 'snapjs-left');
                                    utils.klass.remove(document.body, 'snapjs-right');
                                } else if (absoluteTranslation < 0) {
                                    utils.klass.add(document.body, 'snapjs-right');
                                    utils.klass.remove(document.body, 'snapjs-left');
                                }
                            }

                            if (cache.hasIntent === false || cache.hasIntent === null) {
                                var deg = utils.angleOfDrag(thePageX, thePageY),
                                    inRightRange = deg >= 0 && deg <= settings.slideIntent || deg <= 360 && deg > 360 - settings.slideIntent,
                                    inLeftRange = deg >= 180 && deg <= 180 + settings.slideIntent || deg <= 180 && deg >= 180 - settings.slideIntent;
                                if (!inLeftRange && !inRightRange) {
                                    cache.hasIntent = false;
                                } else {
                                    cache.hasIntent = true;
                                    if (settings.stopPropagation) e.stopPropagation();
                                }
                                cache.intentChecked = true;
                            }

                            if (settings.minDragDistance >= Math.abs(thePageX - cache.startDragX) || // Has user met minimum drag distance?
                            cache.hasIntent === false) {
                                return;
                            }

                            utils.events.prevent(e);
                            utils.dispatchEvent('drag');

                            cache.dragWatchers.current = thePageX;
                            // Determine which direction we are going
                            if (cache.dragWatchers.last > thePageX) {
                                if (cache.dragWatchers.state !== 'left') {
                                    cache.dragWatchers.state = 'left';
                                    cache.dragWatchers.hold = thePageX;
                                }
                                cache.dragWatchers.last = thePageX;
                            } else if (cache.dragWatchers.last < thePageX) {
                                if (cache.dragWatchers.state !== 'right') {
                                    cache.dragWatchers.state = 'right';
                                    cache.dragWatchers.hold = thePageX;
                                }
                                cache.dragWatchers.last = thePageX;
                            }
                            if (openingLeft) {
                                // Pulling too far to the right
                                if (settings.maxPosition < absoluteTranslation) {
                                    diff = (absoluteTranslation - settings.maxPosition) * settings.resistance;
                                    translateTo = whileDragX - diff;
                                }
                                cache.simpleStates = {
                                    opening: 'left',
                                    towards: cache.dragWatchers.state,
                                    hyperExtending: settings.maxPosition < absoluteTranslation,
                                    halfway: absoluteTranslation > settings.maxPosition / 2,
                                    flick: Math.abs(cache.dragWatchers.current - cache.dragWatchers.hold) > settings.flickThreshold,
                                    translation: {
                                        absolute: absoluteTranslation,
                                        relative: whileDragX,
                                        sinceDirectionChange: cache.dragWatchers.current - cache.dragWatchers.hold,
                                        percentage: absoluteTranslation / settings.maxPosition * 100
                                    }
                                };
                            } else {
                                // Pulling too far to the left
                                if (settings.minPosition > absoluteTranslation) {
                                    diff = (absoluteTranslation - settings.minPosition) * settings.resistance;
                                    translateTo = whileDragX - diff;
                                }
                                cache.simpleStates = {
                                    opening: 'right',
                                    towards: cache.dragWatchers.state,
                                    hyperExtending: settings.minPosition > absoluteTranslation,
                                    halfway: absoluteTranslation < settings.minPosition / 2,
                                    flick: Math.abs(cache.dragWatchers.current - cache.dragWatchers.hold) > settings.flickThreshold,
                                    translation: {
                                        absolute: absoluteTranslation,
                                        relative: whileDragX,
                                        sinceDirectionChange: cache.dragWatchers.current - cache.dragWatchers.hold,
                                        percentage: absoluteTranslation / settings.minPosition * 100
                                    }
                                };
                            }

                            action.translate.x(translateTo + translated);
                        }
                    },
                    endDrag: function endDrag(e) {
                        if (cache.isDragging) {
                            utils.dispatchEvent('end');
                            var translated = action.translate.get.matrix(4);

                            // Tap Close
                            if (cache.dragWatchers.current === 0 && translated !== 0 && settings.tapToClose) {
                                utils.dispatchEvent('close');
                                utils.events.prevent(e);
                                action.translate.easeTo(0);
                                cache.isDragging = false;
                                cache.startDragX = 0;
                                return;
                            }

                            // Revealing Left
                            if (cache.simpleStates.opening === 'left') {
                                // Halfway, Flicking, or Too Far Out
                                if (cache.simpleStates.halfway || cache.simpleStates.hyperExtending || cache.simpleStates.flick) {
                                    if (cache.simpleStates.flick && cache.simpleStates.towards === 'left') {
                                        // Flicking Closed
                                        action.translate.easeTo(0);
                                    } else if (cache.simpleStates.flick && cache.simpleStates.towards === 'right' || // Flicking Open OR
                                    cache.simpleStates.halfway || cache.simpleStates.hyperExtending // At least halfway open OR hyperextending
                                    ) {
                                            action.translate.easeTo(settings.maxPosition); // Open Left
                                        }
                                } else {
                                        action.translate.easeTo(0); // Close Left
                                    }
                                // Revealing Right
                            } else if (cache.simpleStates.opening === 'right') {
                                    // Halfway, Flicking, or Too Far Out
                                    if (cache.simpleStates.halfway || cache.simpleStates.hyperExtending || cache.simpleStates.flick) {
                                        if (cache.simpleStates.flick && cache.simpleStates.towards === 'right') {
                                            // Flicking Closed
                                            action.translate.easeTo(0);
                                        } else if (cache.simpleStates.flick && cache.simpleStates.towards === 'left' || // Flicking Open OR
                                        cache.simpleStates.halfway || cache.simpleStates.hyperExtending // At least halfway open OR hyperextending
                                        ) {
                                                action.translate.easeTo(settings.minPosition); // Open Right
                                            }
                                    } else {
                                            action.translate.easeTo(0); // Close Right
                                        }
                                }
                            cache.isDragging = false;
                            cache.startDragX = utils.page('X', e);
                        }
                    }
                }
            },
                _init = function _init(opts) {
                utils.deepExtend(settings, opts);
                if (settings.element) {
                    settings.element.setAttribute("touch-action", "pan-y");
                } else {
                    throw "Snap's element argument does not exist.";
                }
            },
                init = function init(opts) {
                _init(opts);
                cache.vendor = utils.vendor();
                action.drag.listen();
            };
            /*
             * Public
             */
            this.open = function (side) {
                utils.dispatchEvent('open');
                utils.klass.remove(document.body, 'snapjs-expand-left');
                utils.klass.remove(document.body, 'snapjs-expand-right');

                if (side === 'left') {
                    cache.simpleStates.opening = 'left';
                    cache.simpleStates.towards = 'right';
                    utils.klass.add(document.body, 'snapjs-left');
                    utils.klass.remove(document.body, 'snapjs-right');
                    action.translate.easeTo(settings.maxPosition);
                } else if (side === 'right') {
                    cache.simpleStates.opening = 'right';
                    cache.simpleStates.towards = 'left';
                    utils.klass.remove(document.body, 'snapjs-left');
                    utils.klass.add(document.body, 'snapjs-right');
                    action.translate.easeTo(settings.minPosition);
                }
            };
            this.close = function () {
                utils.dispatchEvent('close');
                action.translate.easeTo(0);
            };
            this.expand = function (side) {
                var to = window.innerWidth || document.documentElement.clientWidth;

                if (side === 'left') {
                    utils.dispatchEvent('expandLeft');
                    utils.klass.add(document.body, 'snapjs-expand-left');
                    utils.klass.remove(document.body, 'snapjs-expand-right');
                } else {
                    utils.dispatchEvent('expandRight');
                    utils.klass.add(document.body, 'snapjs-expand-right');
                    utils.klass.remove(document.body, 'snapjs-expand-left');
                    to *= -1;
                }
                action.translate.easeTo(to);
            };

            this.on = function (evt, fn) {
                eventList[evt] = fn;
                return this;
            };
            this.off = function (evt) {
                if (eventList[evt]) {
                    eventList[evt] = false;
                }
            };

            this.enable = function () {
                utils.dispatchEvent('enable');
                action.drag.listen();
            };
            this.disable = function () {
                utils.dispatchEvent('disable');
                action.drag.stopListening();
            };

            this.settings = function (opts) {
                _init(opts);
            };

            this.state = function () {
                var state,
                    fromLeft = action.translate.get.matrix(4);
                if (fromLeft === settings.maxPosition) {
                    state = 'left';
                } else if (fromLeft === settings.minPosition) {
                    state = 'right';
                } else {
                    state = 'closed';
                }
                return {
                    state: state,
                    info: cache.simpleStates
                };
            };
            init(userOpts);
        };
        module.exports = Snap;
    }, {}] }, {}, [1]);