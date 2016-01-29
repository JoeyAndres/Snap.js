"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

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
    /*!
     * PEP v0.4.1 | https://github.com/jquery/PEP
     * Copyright jQuery Foundation and other contributors | http://jquery.org/license
     */
    (function (global, factory) {
      (typeof exports === "undefined" ? "undefined" : _typeof(exports)) === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.PointerEventsPolyfill = factory();
    })(this, function () {
      'use strict';

      /**
       * This is the constructor for new PointerEvents.
       *
       * New Pointer Events must be given a type, and an optional dictionary of
       * initialization properties.
       *
       * Due to certain platform requirements, events returned from the constructor
       * identify as MouseEvents.
       *
       * @constructor
       * @param {String} inType The type of the event to create.
       * @param {Object} [inDict] An optional dictionary of initial event properties.
       * @return {Event} A new PointerEvent of type `inType`, initialized with properties from `inDict`.
       */

      var MOUSE_PROPS = ['bubbles', 'cancelable', 'view', 'detail', 'screenX', 'screenY', 'clientX', 'clientY', 'ctrlKey', 'altKey', 'shiftKey', 'metaKey', 'button', 'relatedTarget', 'pageX', 'pageY'];

      var MOUSE_DEFAULTS = [false, false, null, null, 0, 0, 0, 0, false, false, false, false, 0, null, 0, 0];

      function PointerEvent(inType, inDict) {
        inDict = inDict || Object.create(null);

        var e = document.createEvent('Event');
        e.initEvent(inType, inDict.bubbles || false, inDict.cancelable || false);

        // define inherited MouseEvent properties
        // skip bubbles and cancelable since they're set above in initEvent()
        for (var i = 2, p; i < MOUSE_PROPS.length; i++) {
          p = MOUSE_PROPS[i];
          e[p] = inDict[p] || MOUSE_DEFAULTS[i];
        }
        e.buttons = inDict.buttons || 0;

        // Spec requires that pointers without pressure specified use 0.5 for down
        // state and 0 for up state.
        var pressure = 0;
        if (inDict.pressure) {
          pressure = inDict.pressure;
        } else {
          pressure = e.buttons ? 0.5 : 0;
        }

        // add x/y properties aliased to clientX/Y
        e.x = e.clientX;
        e.y = e.clientY;

        // define the properties of the PointerEvent interface
        e.pointerId = inDict.pointerId || 0;
        e.width = inDict.width || 0;
        e.height = inDict.height || 0;
        e.pressure = pressure;
        e.tiltX = inDict.tiltX || 0;
        e.tiltY = inDict.tiltY || 0;
        e.pointerType = inDict.pointerType || '';
        e.hwTimestamp = inDict.hwTimestamp || 0;
        e.isPrimary = inDict.isPrimary || false;
        return e;
      }

      var _PointerEvent = PointerEvent;

      /**
       * This module implements a map of pointer states
       */
      var USE_MAP = window.Map && window.Map.prototype.forEach;
      var PointerMap = USE_MAP ? Map : SparseArrayMap;

      function SparseArrayMap() {
        this.array = [];
        this.size = 0;
      }

      SparseArrayMap.prototype = {
        set: function set(k, v) {
          if (v === undefined) {
            return this.delete(k);
          }
          if (!this.has(k)) {
            this.size++;
          }
          this.array[k] = v;
        },
        has: function has(k) {
          return this.array[k] !== undefined;
        },
        delete: function _delete(k) {
          if (this.has(k)) {
            delete this.array[k];
            this.size--;
          }
        },
        get: function get(k) {
          return this.array[k];
        },
        clear: function clear() {
          this.array.length = 0;
          this.size = 0;
        },

        // return value, key, map
        forEach: function forEach(callback, thisArg) {
          return this.array.forEach(function (v, k) {
            callback.call(thisArg, v, k, this);
          }, this);
        }
      };

      var _pointermap = PointerMap;

      var CLONE_PROPS = [

      // MouseEvent
      'bubbles', 'cancelable', 'view', 'detail', 'screenX', 'screenY', 'clientX', 'clientY', 'ctrlKey', 'altKey', 'shiftKey', 'metaKey', 'button', 'relatedTarget',

      // DOM Level 3
      'buttons',

      // PointerEvent
      'pointerId', 'width', 'height', 'pressure', 'tiltX', 'tiltY', 'pointerType', 'hwTimestamp', 'isPrimary',

      // event instance
      'type', 'target', 'currentTarget', 'which', 'pageX', 'pageY', 'timeStamp'];

      var CLONE_DEFAULTS = [

      // MouseEvent
      false, false, null, null, 0, 0, 0, 0, false, false, false, false, 0, null,

      // DOM Level 3
      0,

      // PointerEvent
      0, 0, 0, 0, 0, 0, '', 0, false,

      // event instance
      '', null, null, 0, 0, 0, 0];

      var BOUNDARY_EVENTS = {
        'pointerover': 1,
        'pointerout': 1,
        'pointerenter': 1,
        'pointerleave': 1
      };

      var HAS_SVG_INSTANCE = typeof SVGElementInstance !== 'undefined';

      /**
       * This module is for normalizing events. Mouse and Touch events will be
       * collected here, and fire PointerEvents that have the same semantics, no
       * matter the source.
       * Events fired:
       *   - pointerdown: a pointing is added
       *   - pointerup: a pointer is removed
       *   - pointermove: a pointer is moved
       *   - pointerover: a pointer crosses into an element
       *   - pointerout: a pointer leaves an element
       *   - pointercancel: a pointer will no longer generate events
       */
      var dispatcher = {
        pointermap: new _pointermap(),
        eventMap: Object.create(null),
        captureInfo: Object.create(null),

        // Scope objects for native events.
        // This exists for ease of testing.
        eventSources: Object.create(null),
        eventSourceList: [],
        /**
         * Add a new event source that will generate pointer events.
         *
         * `inSource` must contain an array of event names named `events`, and
         * functions with the names specified in the `events` array.
         * @param {string} name A name for the event source
         * @param {Object} source A new source of platform events.
         */
        registerSource: function registerSource(name, source) {
          var s = source;
          var newEvents = s.events;
          if (newEvents) {
            newEvents.forEach(function (e) {
              if (s[e]) {
                this.eventMap[e] = s[e].bind(s);
              }
            }, this);
            this.eventSources[name] = s;
            this.eventSourceList.push(s);
          }
        },
        register: function register(element) {
          var l = this.eventSourceList.length;
          for (var i = 0, es; i < l && (es = this.eventSourceList[i]); i++) {

            // call eventsource register
            es.register.call(es, element);
          }
        },
        unregister: function unregister(element) {
          var l = this.eventSourceList.length;
          for (var i = 0, es; i < l && (es = this.eventSourceList[i]); i++) {

            // call eventsource register
            es.unregister.call(es, element);
          }
        },
        contains: /*scope.external.contains || */function contains(container, contained) {
          try {
            return container.contains(contained);
          } catch (ex) {

            // most likely: https://bugzilla.mozilla.org/show_bug.cgi?id=208427
            return false;
          }
        },

        // EVENTS
        down: function down(inEvent) {
          inEvent.bubbles = true;
          this.fireEvent('pointerdown', inEvent);
        },
        move: function move(inEvent) {
          inEvent.bubbles = true;
          this.fireEvent('pointermove', inEvent);
        },
        up: function up(inEvent) {
          inEvent.bubbles = true;
          this.fireEvent('pointerup', inEvent);
        },
        enter: function enter(inEvent) {
          inEvent.bubbles = false;
          this.fireEvent('pointerenter', inEvent);
        },
        leave: function leave(inEvent) {
          inEvent.bubbles = false;
          this.fireEvent('pointerleave', inEvent);
        },
        over: function over(inEvent) {
          inEvent.bubbles = true;
          this.fireEvent('pointerover', inEvent);
        },
        out: function out(inEvent) {
          inEvent.bubbles = true;
          this.fireEvent('pointerout', inEvent);
        },
        cancel: function cancel(inEvent) {
          inEvent.bubbles = true;
          this.fireEvent('pointercancel', inEvent);
        },
        leaveOut: function leaveOut(event) {
          this.out(event);
          if (!this.contains(event.target, event.relatedTarget)) {
            this.leave(event);
          }
        },
        enterOver: function enterOver(event) {
          this.over(event);
          if (!this.contains(event.target, event.relatedTarget)) {
            this.enter(event);
          }
        },

        // LISTENER LOGIC
        eventHandler: function eventHandler(inEvent) {

          // This is used to prevent multiple dispatch of pointerevents from
          // platform events. This can happen when two elements in different scopes
          // are set up to create pointer events, which is relevant to Shadow DOM.
          if (inEvent._handledByPE) {
            return;
          }
          var type = inEvent.type;
          var fn = this.eventMap && this.eventMap[type];
          if (fn) {
            fn(inEvent);
          }
          inEvent._handledByPE = true;
        },

        // set up event listeners
        listen: function listen(target, events) {
          events.forEach(function (e) {
            this.addEvent(target, e);
          }, this);
        },

        // remove event listeners
        unlisten: function unlisten(target, events) {
          events.forEach(function (e) {
            this.removeEvent(target, e);
          }, this);
        },
        addEvent: /*scope.external.addEvent || */function addEvent(target, eventName) {
          target.addEventListener(eventName, this.boundHandler);
        },
        removeEvent: /*scope.external.removeEvent || */function removeEvent(target, eventName) {
          target.removeEventListener(eventName, this.boundHandler);
        },

        // EVENT CREATION AND TRACKING
        /**
         * Creates a new Event of type `inType`, based on the information in
         * `inEvent`.
         *
         * @param {string} inType A string representing the type of event to create
         * @param {Event} inEvent A platform event with a target
         * @return {Event} A PointerEvent of type `inType`
         */
        makeEvent: function makeEvent(inType, inEvent) {

          // relatedTarget must be null if pointer is captured
          if (this.captureInfo[inEvent.pointerId]) {
            inEvent.relatedTarget = null;
          }
          var e = new _PointerEvent(inType, inEvent);
          if (inEvent.preventDefault) {
            e.preventDefault = inEvent.preventDefault;
          }
          e._target = e._target || inEvent.target;
          return e;
        },

        // make and dispatch an event in one call
        fireEvent: function fireEvent(inType, inEvent) {
          var e = this.makeEvent(inType, inEvent);
          return this.dispatchEvent(e);
        },
        /**
         * Returns a snapshot of inEvent, with writable properties.
         *
         * @param {Event} inEvent An event that contains properties to copy.
         * @return {Object} An object containing shallow copies of `inEvent`'s
         *    properties.
         */
        cloneEvent: function cloneEvent(inEvent) {
          var eventCopy = Object.create(null);
          var p;
          for (var i = 0; i < CLONE_PROPS.length; i++) {
            p = CLONE_PROPS[i];
            eventCopy[p] = inEvent[p] || CLONE_DEFAULTS[i];

            // Work around SVGInstanceElement shadow tree
            // Return the <use> element that is represented by the instance for Safari, Chrome, IE.
            // This is the behavior implemented by Firefox.
            if (HAS_SVG_INSTANCE && (p === 'target' || p === 'relatedTarget')) {
              if (eventCopy[p] instanceof SVGElementInstance) {
                eventCopy[p] = eventCopy[p].correspondingUseElement;
              }
            }
          }

          // keep the semantics of preventDefault
          if (inEvent.preventDefault) {
            eventCopy.preventDefault = function () {
              inEvent.preventDefault();
            };
          }
          return eventCopy;
        },
        getTarget: function getTarget(inEvent) {
          var capture = this.captureInfo[inEvent.pointerId];
          if (!capture) {
            return inEvent._target;
          }
          if (inEvent._target === capture || !(inEvent.type in BOUNDARY_EVENTS)) {
            return capture;
          }
        },
        setCapture: function setCapture(inPointerId, inTarget) {
          if (this.captureInfo[inPointerId]) {
            this.releaseCapture(inPointerId);
          }
          this.captureInfo[inPointerId] = inTarget;
          var e = document.createEvent('Event');
          e.initEvent('gotpointercapture', true, false);
          e.pointerId = inPointerId;
          this.implicitRelease = this.releaseCapture.bind(this, inPointerId);
          document.addEventListener('pointerup', this.implicitRelease);
          document.addEventListener('pointercancel', this.implicitRelease);
          e._target = inTarget;
          this.asyncDispatchEvent(e);
        },
        releaseCapture: function releaseCapture(inPointerId) {
          var t = this.captureInfo[inPointerId];
          if (t) {
            var e = document.createEvent('Event');
            e.initEvent('lostpointercapture', true, false);
            e.pointerId = inPointerId;
            this.captureInfo[inPointerId] = undefined;
            document.removeEventListener('pointerup', this.implicitRelease);
            document.removeEventListener('pointercancel', this.implicitRelease);
            e._target = t;
            this.asyncDispatchEvent(e);
          }
        },
        /**
         * Dispatches the event to its target.
         *
         * @param {Event} inEvent The event to be dispatched.
         * @return {Boolean} True if an event handler returns true, false otherwise.
         */
        dispatchEvent: /*scope.external.dispatchEvent || */function dispatchEvent(inEvent) {
          var t = this.getTarget(inEvent);
          if (t) {
            return t.dispatchEvent(inEvent);
          }
        },
        asyncDispatchEvent: function asyncDispatchEvent(inEvent) {
          requestAnimationFrame(this.dispatchEvent.bind(this, inEvent));
        }
      };
      dispatcher.boundHandler = dispatcher.eventHandler.bind(dispatcher);

      var _dispatcher = dispatcher;

      var targeting = {
        shadow: function shadow(inEl) {
          if (inEl) {
            return inEl.shadowRoot || inEl.webkitShadowRoot;
          }
        },
        canTarget: function canTarget(shadow) {
          return shadow && Boolean(shadow.elementFromPoint);
        },
        targetingShadow: function targetingShadow(inEl) {
          var s = this.shadow(inEl);
          if (this.canTarget(s)) {
            return s;
          }
        },
        olderShadow: function olderShadow(shadow) {
          var os = shadow.olderShadowRoot;
          if (!os) {
            var se = shadow.querySelector('shadow');
            if (se) {
              os = se.olderShadowRoot;
            }
          }
          return os;
        },
        allShadows: function allShadows(element) {
          var shadows = [];
          var s = this.shadow(element);
          while (s) {
            shadows.push(s);
            s = this.olderShadow(s);
          }
          return shadows;
        },
        searchRoot: function searchRoot(inRoot, x, y) {
          if (inRoot) {
            var t = inRoot.elementFromPoint(x, y);
            var st, sr;

            // is element a shadow host?
            sr = this.targetingShadow(t);
            while (sr) {

              // find the the element inside the shadow root
              st = sr.elementFromPoint(x, y);
              if (!st) {

                // check for older shadows
                sr = this.olderShadow(sr);
              } else {

                // shadowed element may contain a shadow root
                var ssr = this.targetingShadow(st);
                return this.searchRoot(ssr, x, y) || st;
              }
            }

            // light dom element is the target
            return t;
          }
        },
        owner: function owner(element) {
          var s = element;

          // walk up until you hit the shadow root or document
          while (s.parentNode) {
            s = s.parentNode;
          }

          // the owner element is expected to be a Document or ShadowRoot
          if (s.nodeType !== Node.DOCUMENT_NODE && s.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
            s = document;
          }
          return s;
        },
        findTarget: function findTarget(inEvent) {
          var x = inEvent.clientX;
          var y = inEvent.clientY;

          // if the listener is in the shadow root, it is much faster to start there
          var s = this.owner(inEvent.target);

          // if x, y is not in this root, fall back to document search
          if (!s.elementFromPoint(x, y)) {
            s = document;
          }
          return this.searchRoot(s, x, y);
        }
      };

      /**
       * This module uses Mutation Observers to dynamically adjust which nodes will
       * generate Pointer Events.
       *
       * All nodes that wish to generate Pointer Events must have the attribute
       * `touch-action` set to `none`.
       */
      var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
      var map = Array.prototype.map.call.bind(Array.prototype.map);
      var toArray = Array.prototype.slice.call.bind(Array.prototype.slice);
      var filter = Array.prototype.filter.call.bind(Array.prototype.filter);
      var MO = window.MutationObserver || window.WebKitMutationObserver;
      var SELECTOR = '[touch-action]';
      var OBSERVER_INIT = {
        subtree: true,
        childList: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['touch-action']
      };

      function Installer(add, remove, changed, binder) {
        this.addCallback = add.bind(binder);
        this.removeCallback = remove.bind(binder);
        this.changedCallback = changed.bind(binder);
        if (MO) {
          this.observer = new MO(this.mutationWatcher.bind(this));
        }
      }

      Installer.prototype = {
        watchSubtree: function watchSubtree(target) {

          // Only watch scopes that can target find, as these are top-level.
          // Otherwise we can see duplicate additions and removals that add noise.
          //
          // TODO(dfreedman): For some instances with ShadowDOMPolyfill, we can see
          // a removal without an insertion when a node is redistributed among
          // shadows. Since it all ends up correct in the document, watching only
          // the document will yield the correct mutations to watch.
          if (this.observer && targeting.canTarget(target)) {
            this.observer.observe(target, OBSERVER_INIT);
          }
        },
        enableOnSubtree: function enableOnSubtree(target) {
          this.watchSubtree(target);
          if (target === document && document.readyState !== 'complete') {
            this.installOnLoad();
          } else {
            this.installNewSubtree(target);
          }
        },
        installNewSubtree: function installNewSubtree(target) {
          forEach(this.findElements(target), this.addElement, this);
        },
        findElements: function findElements(target) {
          if (target.querySelectorAll) {
            return target.querySelectorAll(SELECTOR);
          }
          return [];
        },
        removeElement: function removeElement(el) {
          this.removeCallback(el);
        },
        addElement: function addElement(el) {
          this.addCallback(el);
        },
        elementChanged: function elementChanged(el, oldValue) {
          this.changedCallback(el, oldValue);
        },
        concatLists: function concatLists(accum, list) {
          return accum.concat(toArray(list));
        },

        // register all touch-action = none nodes on document load
        installOnLoad: function installOnLoad() {
          document.addEventListener('readystatechange', function () {
            if (document.readyState === 'complete') {
              this.installNewSubtree(document);
            }
          }.bind(this));
        },
        isElement: function isElement(n) {
          return n.nodeType === Node.ELEMENT_NODE;
        },
        flattenMutationTree: function flattenMutationTree(inNodes) {

          // find children with touch-action
          var tree = map(inNodes, this.findElements, this);

          // make sure the added nodes are accounted for
          tree.push(filter(inNodes, this.isElement));

          // flatten the list
          return tree.reduce(this.concatLists, []);
        },
        mutationWatcher: function mutationWatcher(mutations) {
          mutations.forEach(this.mutationHandler, this);
        },
        mutationHandler: function mutationHandler(m) {
          if (m.type === 'childList') {
            var added = this.flattenMutationTree(m.addedNodes);
            added.forEach(this.addElement, this);
            var removed = this.flattenMutationTree(m.removedNodes);
            removed.forEach(this.removeElement, this);
          } else if (m.type === 'attributes') {
            this.elementChanged(m.target, m.oldValue);
          }
        }
      };

      var installer = Installer;

      function shadowSelector(v) {
        return 'body /shadow-deep/ ' + selector(v);
      }
      function selector(v) {
        return '[touch-action="' + v + '"]';
      }
      function rule(v) {
        return '{ -ms-touch-action: ' + v + '; touch-action: ' + v + '; touch-action-delay: none; }';
      }
      var attrib2css = ['none', 'auto', 'pan-x', 'pan-y', {
        rule: 'pan-x pan-y',
        selectors: ['pan-x pan-y', 'pan-y pan-x']
      }];
      var styles = '';

      // only install stylesheet if the browser has touch action support
      var hasNativePE = window.PointerEvent || window.MSPointerEvent;

      // only add shadow selectors if shadowdom is supported
      var hasShadowRoot = !window.ShadowDOMPolyfill && document.head.createShadowRoot;

      function applyAttributeStyles() {
        if (hasNativePE) {
          attrib2css.forEach(function (r) {
            if (String(r) === r) {
              styles += selector(r) + rule(r) + '\n';
              if (hasShadowRoot) {
                styles += shadowSelector(r) + rule(r) + '\n';
              }
            } else {
              styles += r.selectors.map(selector) + rule(r.rule) + '\n';
              if (hasShadowRoot) {
                styles += r.selectors.map(shadowSelector) + rule(r.rule) + '\n';
              }
            }
          });

          var el = document.createElement('style');
          el.textContent = styles;
          document.head.appendChild(el);
        }
      }

      var mouse__pointermap = _dispatcher.pointermap;

      // radius around touchend that swallows mouse events
      var DEDUP_DIST = 25;

      // left, middle, right, back, forward
      var BUTTON_TO_BUTTONS = [1, 4, 2, 8, 16];

      var HAS_BUTTONS = false;
      try {
        HAS_BUTTONS = new MouseEvent('test', { buttons: 1 }).buttons === 1;
      } catch (e) {}

      // handler block for native mouse events
      var mouseEvents = {
        POINTER_ID: 1,
        POINTER_TYPE: 'mouse',
        events: ['mousedown', 'mousemove', 'mouseup', 'mouseover', 'mouseout'],
        register: function register(target) {
          _dispatcher.listen(target, this.events);
        },
        unregister: function unregister(target) {
          _dispatcher.unlisten(target, this.events);
        },
        lastTouches: [],

        // collide with the global mouse listener
        isEventSimulatedFromTouch: function isEventSimulatedFromTouch(inEvent) {
          var lts = this.lastTouches;
          var x = inEvent.clientX;
          var y = inEvent.clientY;
          for (var i = 0, l = lts.length, t; i < l && (t = lts[i]); i++) {

            // simulated mouse events will be swallowed near a primary touchend
            var dx = Math.abs(x - t.x);
            var dy = Math.abs(y - t.y);
            if (dx <= DEDUP_DIST && dy <= DEDUP_DIST) {
              return true;
            }
          }
        },
        prepareEvent: function prepareEvent(inEvent) {
          var e = _dispatcher.cloneEvent(inEvent);

          // forward mouse preventDefault
          var pd = e.preventDefault;
          e.preventDefault = function () {
            inEvent.preventDefault();
            pd();
          };
          e.pointerId = this.POINTER_ID;
          e.isPrimary = true;
          e.pointerType = this.POINTER_TYPE;
          return e;
        },
        prepareButtonsForMove: function prepareButtonsForMove(e, inEvent) {
          var p = mouse__pointermap.get(this.POINTER_ID);
          e.buttons = p ? p.buttons : 0;
          inEvent.buttons = e.buttons;
        },
        mousedown: function mousedown(inEvent) {
          if (!this.isEventSimulatedFromTouch(inEvent)) {
            var p = mouse__pointermap.get(this.POINTER_ID);
            var e = this.prepareEvent(inEvent);
            if (!HAS_BUTTONS) {
              e.buttons = BUTTON_TO_BUTTONS[e.button];
              if (p) {
                e.buttons |= p.buttons;
              }
              inEvent.buttons = e.buttons;
            }
            mouse__pointermap.set(this.POINTER_ID, inEvent);
            if (!p) {
              _dispatcher.down(e);
            } else {
              _dispatcher.move(e);
            }
          }
        },
        mousemove: function mousemove(inEvent) {
          if (!this.isEventSimulatedFromTouch(inEvent)) {
            var e = this.prepareEvent(inEvent);
            if (!HAS_BUTTONS) {
              this.prepareButtonsForMove(e, inEvent);
            }
            _dispatcher.move(e);
          }
        },
        mouseup: function mouseup(inEvent) {
          if (!this.isEventSimulatedFromTouch(inEvent)) {
            var p = mouse__pointermap.get(this.POINTER_ID);
            var e = this.prepareEvent(inEvent);
            if (!HAS_BUTTONS) {
              var up = BUTTON_TO_BUTTONS[e.button];

              // Produces wrong state of buttons in Browsers without `buttons` support
              // when a mouse button that was pressed outside the document is released
              // inside and other buttons are still pressed down.
              e.buttons = p ? p.buttons & ~up : 0;
              inEvent.buttons = e.buttons;
            }
            mouse__pointermap.set(this.POINTER_ID, inEvent);

            // Support: Firefox <=44 only
            // FF Ubuntu includes the lifted button in the `buttons` property on
            // mouseup.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1223366
            if (e.buttons === 0 || e.buttons === BUTTON_TO_BUTTONS[e.button]) {
              this.cleanupMouse();
              _dispatcher.up(e);
            } else {
              _dispatcher.move(e);
            }
          }
        },
        mouseover: function mouseover(inEvent) {
          if (!this.isEventSimulatedFromTouch(inEvent)) {
            var e = this.prepareEvent(inEvent);
            if (!HAS_BUTTONS) {
              this.prepareButtonsForMove(e, inEvent);
            }
            _dispatcher.enterOver(e);
          }
        },
        mouseout: function mouseout(inEvent) {
          if (!this.isEventSimulatedFromTouch(inEvent)) {
            var e = this.prepareEvent(inEvent);
            if (!HAS_BUTTONS) {
              this.prepareButtonsForMove(e, inEvent);
            }
            _dispatcher.leaveOut(e);
          }
        },
        cancel: function cancel(inEvent) {
          var e = this.prepareEvent(inEvent);
          _dispatcher.cancel(e);
          this.cleanupMouse();
        },
        cleanupMouse: function cleanupMouse() {
          mouse__pointermap.delete(this.POINTER_ID);
        }
      };

      var mouse = mouseEvents;

      var captureInfo = _dispatcher.captureInfo;
      var findTarget = targeting.findTarget.bind(targeting);
      var allShadows = targeting.allShadows.bind(targeting);
      var touch__pointermap = _dispatcher.pointermap;

      // This should be long enough to ignore compat mouse events made by touch
      var DEDUP_TIMEOUT = 2500;
      var CLICK_COUNT_TIMEOUT = 200;
      var ATTRIB = 'touch-action';
      var INSTALLER;

      // The presence of touch event handlers blocks scrolling, and so we must be careful to
      // avoid adding handlers unnecessarily.  Chrome plans to add a touch-action-delay property
      // (crbug.com/329559) to address this, and once we have that we can opt-in to a simpler
      // handler registration mechanism.  Rather than try to predict how exactly to opt-in to
      // that we'll just leave this disabled until there is a build of Chrome to test.
      var HAS_TOUCH_ACTION_DELAY = false;

      // handler block for native touch events
      var touchEvents = {
        events: ['touchstart', 'touchmove', 'touchend', 'touchcancel'],
        register: function register(target) {
          if (HAS_TOUCH_ACTION_DELAY) {
            _dispatcher.listen(target, this.events);
          } else {
            INSTALLER.enableOnSubtree(target);
          }
        },
        unregister: function unregister(target) {
          if (HAS_TOUCH_ACTION_DELAY) {
            _dispatcher.unlisten(target, this.events);
          } else {

            // TODO(dfreedman): is it worth it to disconnect the MO?
          }
        },
        elementAdded: function elementAdded(el) {
          var a = el.getAttribute(ATTRIB);
          var st = this.touchActionToScrollType(a);
          if (st) {
            el._scrollType = st;
            _dispatcher.listen(el, this.events);

            // set touch-action on shadows as well
            allShadows(el).forEach(function (s) {
              s._scrollType = st;
              _dispatcher.listen(s, this.events);
            }, this);
          }
        },
        elementRemoved: function elementRemoved(el) {
          el._scrollType = undefined;
          _dispatcher.unlisten(el, this.events);

          // remove touch-action from shadow
          allShadows(el).forEach(function (s) {
            s._scrollType = undefined;
            _dispatcher.unlisten(s, this.events);
          }, this);
        },
        elementChanged: function elementChanged(el, oldValue) {
          var a = el.getAttribute(ATTRIB);
          var st = this.touchActionToScrollType(a);
          var oldSt = this.touchActionToScrollType(oldValue);

          // simply update scrollType if listeners are already established
          if (st && oldSt) {
            el._scrollType = st;
            allShadows(el).forEach(function (s) {
              s._scrollType = st;
            }, this);
          } else if (oldSt) {
            this.elementRemoved(el);
          } else if (st) {
            this.elementAdded(el);
          }
        },
        scrollTypes: {
          EMITTER: 'none',
          XSCROLLER: 'pan-x',
          YSCROLLER: 'pan-y',
          SCROLLER: /^(?:pan-x pan-y)|(?:pan-y pan-x)|auto$/
        },
        touchActionToScrollType: function touchActionToScrollType(touchAction) {
          var t = touchAction;
          var st = this.scrollTypes;
          if (t === 'none') {
            return 'none';
          } else if (t === st.XSCROLLER) {
            return 'X';
          } else if (t === st.YSCROLLER) {
            return 'Y';
          } else if (st.SCROLLER.exec(t)) {
            return 'XY';
          }
        },
        POINTER_TYPE: 'touch',
        firstTouch: null,
        isPrimaryTouch: function isPrimaryTouch(inTouch) {
          return this.firstTouch === inTouch.identifier;
        },
        setPrimaryTouch: function setPrimaryTouch(inTouch) {

          // set primary touch if there no pointers, or the only pointer is the mouse
          if (touch__pointermap.size === 0 || touch__pointermap.size === 1 && touch__pointermap.has(1)) {
            this.firstTouch = inTouch.identifier;
            this.firstXY = { X: inTouch.clientX, Y: inTouch.clientY };
            this.scrolling = false;
            this.cancelResetClickCount();
          }
        },
        removePrimaryPointer: function removePrimaryPointer(inPointer) {
          if (inPointer.isPrimary) {
            this.firstTouch = null;
            this.firstXY = null;
            this.resetClickCount();
          }
        },
        clickCount: 0,
        resetId: null,
        resetClickCount: function resetClickCount() {
          var fn = function () {
            this.clickCount = 0;
            this.resetId = null;
          }.bind(this);
          this.resetId = setTimeout(fn, CLICK_COUNT_TIMEOUT);
        },
        cancelResetClickCount: function cancelResetClickCount() {
          if (this.resetId) {
            clearTimeout(this.resetId);
          }
        },
        typeToButtons: function typeToButtons(type) {
          var ret = 0;
          if (type === 'touchstart' || type === 'touchmove') {
            ret = 1;
          }
          return ret;
        },
        touchToPointer: function touchToPointer(inTouch) {
          var cte = this.currentTouchEvent;
          var e = _dispatcher.cloneEvent(inTouch);

          // We reserve pointerId 1 for Mouse.
          // Touch identifiers can start at 0.
          // Add 2 to the touch identifier for compatibility.
          var id = e.pointerId = inTouch.identifier + 2;
          e.target = captureInfo[id] || findTarget(e);
          e.bubbles = true;
          e.cancelable = true;
          e.detail = this.clickCount;
          e.button = 0;
          e.buttons = this.typeToButtons(cte.type);
          e.width = inTouch.radiusX || inTouch.webkitRadiusX || 0;
          e.height = inTouch.radiusY || inTouch.webkitRadiusY || 0;
          e.pressure = inTouch.force || inTouch.webkitForce || 0.5;
          e.isPrimary = this.isPrimaryTouch(inTouch);
          e.pointerType = this.POINTER_TYPE;

          // forward touch preventDefaults
          var self = this;
          e.preventDefault = function () {
            self.scrolling = false;
            self.firstXY = null;
            cte.preventDefault();
          };
          return e;
        },
        processTouches: function processTouches(inEvent, inFunction) {
          var tl = inEvent.changedTouches;
          this.currentTouchEvent = inEvent;
          for (var i = 0, t; i < tl.length; i++) {
            t = tl[i];
            inFunction.call(this, this.touchToPointer(t));
          }
        },

        // For single axis scrollers, determines whether the element should emit
        // pointer events or behave as a scroller
        shouldScroll: function shouldScroll(inEvent) {
          if (this.firstXY) {
            var ret;
            var scrollAxis = inEvent.currentTarget._scrollType;
            if (scrollAxis === 'none') {

              // this element is a touch-action: none, should never scroll
              ret = false;
            } else if (scrollAxis === 'XY') {

              // this element should always scroll
              ret = true;
            } else {
              var t = inEvent.changedTouches[0];

              // check the intended scroll axis, and other axis
              var a = scrollAxis;
              var oa = scrollAxis === 'Y' ? 'X' : 'Y';
              var da = Math.abs(t['client' + a] - this.firstXY[a]);
              var doa = Math.abs(t['client' + oa] - this.firstXY[oa]);

              // if delta in the scroll axis > delta other axis, scroll instead of
              // making events
              ret = da >= doa;
            }
            this.firstXY = null;
            return ret;
          }
        },
        findTouch: function findTouch(inTL, inId) {
          for (var i = 0, l = inTL.length, t; i < l && (t = inTL[i]); i++) {
            if (t.identifier === inId) {
              return true;
            }
          }
        },

        // In some instances, a touchstart can happen without a touchend. This
        // leaves the pointermap in a broken state.
        // Therefore, on every touchstart, we remove the touches that did not fire a
        // touchend event.
        // To keep state globally consistent, we fire a
        // pointercancel for this "abandoned" touch
        vacuumTouches: function vacuumTouches(inEvent) {
          var tl = inEvent.touches;

          // pointermap.size should be < tl.length here, as the touchstart has not
          // been processed yet.
          if (touch__pointermap.size >= tl.length) {
            var d = [];
            touch__pointermap.forEach(function (value, key) {

              // Never remove pointerId == 1, which is mouse.
              // Touch identifiers are 2 smaller than their pointerId, which is the
              // index in pointermap.
              if (key !== 1 && !this.findTouch(tl, key - 2)) {
                var p = value.out;
                d.push(p);
              }
            }, this);
            d.forEach(this.cancelOut, this);
          }
        },
        touchstart: function touchstart(inEvent) {
          this.vacuumTouches(inEvent);
          this.setPrimaryTouch(inEvent.changedTouches[0]);
          this.dedupSynthMouse(inEvent);
          if (!this.scrolling) {
            this.clickCount++;
            this.processTouches(inEvent, this.overDown);
          }
        },
        overDown: function overDown(inPointer) {
          touch__pointermap.set(inPointer.pointerId, {
            target: inPointer.target,
            out: inPointer,
            outTarget: inPointer.target
          });
          _dispatcher.over(inPointer);
          _dispatcher.enter(inPointer);
          _dispatcher.down(inPointer);
        },
        touchmove: function touchmove(inEvent) {
          if (!this.scrolling) {
            if (this.shouldScroll(inEvent)) {
              this.scrolling = true;
              this.touchcancel(inEvent);
            } else {
              inEvent.preventDefault();
              this.processTouches(inEvent, this.moveOverOut);
            }
          }
        },
        moveOverOut: function moveOverOut(inPointer) {
          var event = inPointer;
          var pointer = touch__pointermap.get(event.pointerId);

          // a finger drifted off the screen, ignore it
          if (!pointer) {
            return;
          }
          var outEvent = pointer.out;
          var outTarget = pointer.outTarget;
          _dispatcher.move(event);
          if (outEvent && outTarget !== event.target) {
            outEvent.relatedTarget = event.target;
            event.relatedTarget = outTarget;

            // recover from retargeting by shadow
            outEvent.target = outTarget;
            if (event.target) {
              _dispatcher.leaveOut(outEvent);
              _dispatcher.enterOver(event);
            } else {

              // clean up case when finger leaves the screen
              event.target = outTarget;
              event.relatedTarget = null;
              this.cancelOut(event);
            }
          }
          pointer.out = event;
          pointer.outTarget = event.target;
        },
        touchend: function touchend(inEvent) {
          this.dedupSynthMouse(inEvent);
          this.processTouches(inEvent, this.upOut);
        },
        upOut: function upOut(inPointer) {
          if (!this.scrolling) {
            _dispatcher.up(inPointer);
            _dispatcher.out(inPointer);
            _dispatcher.leave(inPointer);
          }
          this.cleanUpPointer(inPointer);
        },
        touchcancel: function touchcancel(inEvent) {
          this.processTouches(inEvent, this.cancelOut);
        },
        cancelOut: function cancelOut(inPointer) {
          _dispatcher.cancel(inPointer);
          _dispatcher.out(inPointer);
          _dispatcher.leave(inPointer);
          this.cleanUpPointer(inPointer);
        },
        cleanUpPointer: function cleanUpPointer(inPointer) {
          touch__pointermap.delete(inPointer.pointerId);
          this.removePrimaryPointer(inPointer);
        },

        // prevent synth mouse events from creating pointer events
        dedupSynthMouse: function dedupSynthMouse(inEvent) {
          var lts = mouse.lastTouches;
          var t = inEvent.changedTouches[0];

          // only the primary finger will synth mouse events
          if (this.isPrimaryTouch(t)) {

            // remember x/y of last touch
            var lt = { x: t.clientX, y: t.clientY };
            lts.push(lt);
            var fn = function (lts, lt) {
              var i = lts.indexOf(lt);
              if (i > -1) {
                lts.splice(i, 1);
              }
            }.bind(null, lts, lt);
            setTimeout(fn, DEDUP_TIMEOUT);
          }
        }
      };

      if (!HAS_TOUCH_ACTION_DELAY) {
        INSTALLER = new installer(touchEvents.elementAdded, touchEvents.elementRemoved, touchEvents.elementChanged, touchEvents);
      }

      var touch = touchEvents;

      var ms__pointermap = _dispatcher.pointermap;
      var HAS_BITMAP_TYPE = window.MSPointerEvent && typeof window.MSPointerEvent.MSPOINTER_TYPE_MOUSE === 'number';
      var msEvents = {
        events: ['MSPointerDown', 'MSPointerMove', 'MSPointerUp', 'MSPointerOut', 'MSPointerOver', 'MSPointerCancel', 'MSGotPointerCapture', 'MSLostPointerCapture'],
        register: function register(target) {
          _dispatcher.listen(target, this.events);
        },
        unregister: function unregister(target) {
          _dispatcher.unlisten(target, this.events);
        },
        POINTER_TYPES: ['', 'unavailable', 'touch', 'pen', 'mouse'],
        prepareEvent: function prepareEvent(inEvent) {
          var e = inEvent;
          if (HAS_BITMAP_TYPE) {
            e = _dispatcher.cloneEvent(inEvent);
            e.pointerType = this.POINTER_TYPES[inEvent.pointerType];
          }
          return e;
        },
        cleanup: function cleanup(id) {
          ms__pointermap.delete(id);
        },
        MSPointerDown: function MSPointerDown(inEvent) {
          ms__pointermap.set(inEvent.pointerId, inEvent);
          var e = this.prepareEvent(inEvent);
          _dispatcher.down(e);
        },
        MSPointerMove: function MSPointerMove(inEvent) {
          var e = this.prepareEvent(inEvent);
          _dispatcher.move(e);
        },
        MSPointerUp: function MSPointerUp(inEvent) {
          var e = this.prepareEvent(inEvent);
          _dispatcher.up(e);
          this.cleanup(inEvent.pointerId);
        },
        MSPointerOut: function MSPointerOut(inEvent) {
          var e = this.prepareEvent(inEvent);
          _dispatcher.leaveOut(e);
        },
        MSPointerOver: function MSPointerOver(inEvent) {
          var e = this.prepareEvent(inEvent);
          _dispatcher.enterOver(e);
        },
        MSPointerCancel: function MSPointerCancel(inEvent) {
          var e = this.prepareEvent(inEvent);
          _dispatcher.cancel(e);
          this.cleanup(inEvent.pointerId);
        },
        MSLostPointerCapture: function MSLostPointerCapture(inEvent) {
          var e = _dispatcher.makeEvent('lostpointercapture', inEvent);
          _dispatcher.dispatchEvent(e);
        },
        MSGotPointerCapture: function MSGotPointerCapture(inEvent) {
          var e = _dispatcher.makeEvent('gotpointercapture', inEvent);
          _dispatcher.dispatchEvent(e);
        }
      };

      var ms = msEvents;

      function platform_events__applyPolyfill() {

        // only activate if this platform does not have pointer events
        if (!window.PointerEvent) {
          window.PointerEvent = _PointerEvent;

          if (window.navigator.msPointerEnabled) {
            var tp = window.navigator.msMaxTouchPoints;
            Object.defineProperty(window.navigator, 'maxTouchPoints', {
              value: tp,
              enumerable: true
            });
            _dispatcher.registerSource('ms', ms);
          } else {
            _dispatcher.registerSource('mouse', mouse);
            if (window.ontouchstart !== undefined) {
              _dispatcher.registerSource('touch', touch);
            }
          }

          _dispatcher.register(document);
        }
      }

      var n = window.navigator;
      var s, r;
      function assertDown(id) {
        if (!_dispatcher.pointermap.has(id)) {
          throw new Error('InvalidPointerId');
        }
      }
      if (n.msPointerEnabled) {
        s = function s(pointerId) {
          assertDown(pointerId);
          this.msSetPointerCapture(pointerId);
        };
        r = function r(pointerId) {
          assertDown(pointerId);
          this.msReleasePointerCapture(pointerId);
        };
      } else {
        s = function setPointerCapture(pointerId) {
          assertDown(pointerId);
          _dispatcher.setCapture(pointerId, this);
        };
        r = function releasePointerCapture(pointerId) {
          assertDown(pointerId);
          _dispatcher.releaseCapture(pointerId, this);
        };
      }

      function _capture__applyPolyfill() {
        if (window.Element && !Element.prototype.setPointerCapture) {
          Object.defineProperties(Element.prototype, {
            'setPointerCapture': {
              value: s
            },
            'releasePointerCapture': {
              value: r
            }
          });
        }
      }

      applyAttributeStyles();
      platform_events__applyPolyfill();
      _capture__applyPolyfill();

      var pointerevents = {
        dispatcher: _dispatcher,
        Installer: installer,
        PointerEvent: _PointerEvent,
        PointerMap: _pointermap,
        targetFinding: targeting
      };

      return pointerevents;
    });
  }, {}], 2: [function (require, module, exports) {
    var Snap = require('./snap');

    if (typeof window !== "undefined" && !window.Snap) {
      window.Snap = Snap;
    }
  }, { "./snap": 3 }], 3: [function (require, module, exports) {
    /*
     * Snap.js
     *
     * Copyright 2013, Jacob Kelley - http://jakiestfu.com/
     * Released under the MIT Licence
     * http://opensource.org/licenses/MIT
     *
     * Copyright 2016, Joey Andres
     */

    require("pepjs");

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
        enableCSS3Transform: true, // Slow on nested components.
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
          return e["page" + t];
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

            if (settings.enableCSS3Transform) {
              var theTranslate = "translate3d(" + n + "px, 0,0)";
              settings.element.style[cache.vendor + 'Transform'] = theTranslate;
            } else {
              settings.element.style.width = (window.innerWidth || document.documentElement.clientWidth) + 'px';

              settings.element.style.left = n + "px";
              settings.element.style.right = '';
            }
          }
        },
        drag: {
          listen: function listen() {
            cache.translation = 0;
            cache.easing = false;
            utils.events.addEvent(settings.element, utils.eventType('down'), action.drag.startDrag);
            utils.events.addEvent(settings.element, utils.eventType('move'), action.drag.dragging);
            utils.events.addEvent(settings.element, utils.eventType('up'), action.drag.endDrag);
          },
          stopListening: function stopListening() {
            utils.events.removeEvent(settings.element, utils.eventType('down'), action.drag.startDrag);
            utils.events.removeEvent(settings.element, utils.eventType('move'), action.drag.dragging);
            utils.events.removeEvent(settings.element, utils.eventType('up'), action.drag.endDrag);
          },
          startDrag: function startDrag(e) {
            if (settings.stopPropagation) e.stopPropagation();

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
              if (settings.stopPropagation) e.stopPropagation();

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
              if (settings.stopPropagation) e.stopPropagation();

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
        if (opts.element) {
          utils.deepExtend(settings, opts);
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
  }, { "pepjs": 1 }] }, {}, [2]);