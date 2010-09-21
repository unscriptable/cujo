/*
    cujo._base.dom
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    Note: this namespace is aliased as cujo.dom.  Developers should use cujo.dom.

    TODO: add UIBlocker onVisible
    TODO: don't force async since we're using promises now

*/
dojo.provide('cujo._base.dom');

(function () {

// cujo dom extensions

dojo.mixin(cujo, {

    head: cujo._getHeadElement,

    setDomState: function (/* cujo.__StateDef */ stateDef) {
        //  summary:
        //      Instructs the UI / DOM to enter into the specified state. Most states are simply
        //      classNames applied to the scope node specified in stateDef, but some special-
        //      purpose states, such as 'cujo-block' and 'cujo-capture' invoke behavior. All state changes
        //      are asynchronous, even when applying classNames (CSS Transitions). Therefore, be
        //      sure to supply a callback function to be notified when the state change is complete
        //      or use the returned promise.
        //      For normal, className, states and cujo-capture, the promise executes the progress() and then()
        //      paths once the className(s) are applied.  For cujo-block, the progress() path executes
        //      once the UI is blocked, but only executes the then() once any visual indication of
        //      blocking appears (spinner, text).
        //  stateDef: cujo.__StateDef | cujo.__StateDef_Block | other, future __StateDef types
        //      Specifies the scope, state, and parameters of the state change.
        //  returns dojo.Deferred (aka a promise)

        var node = stateDef.scope,
            state = stateDef.state,
            value = stateDef.value == undefined ? true : stateDef.value,
            context = stateDef.context || dojo.global,
            promise = new dojo.Deferred(),
            handles = [],
            release = function () { dojo.forEach(handles, dojo.disconnect); };

        // connect promise to error callback
        handles.push(dojo.connect(stateDef, 'onError', function () { promise.reject(); release(); }));

        switch (state) {

            case 'cujo-block': // ui blocking
                if (!node)
                    node = dojo.body();
                handles.push(dojo.connect(stateDef, 'onChanged', function () { promise.progress(); }));
                handles.push(dojo.connect(stateDef, 'onVisible', function () { promise.resolve(); release(); }));
                blockNode(node, value, stateDef.onChanged, context, stateDef);
                break;

            case 'cujo-capture': // TODO: ui input capturing
                // create a set of capturing events that block (preventDefault and stopPropagation)
                // everything but the specified nodes. If an optional onCapture callback is defined
                // check it's result to decide whether to block. The dev may specify a list of
                // event types to capture. If omitted, these are used: mousedown, mouseup, keydown,
                // keyup, focus.
                break;

            default: // assume we're applying class state
                if (!node)
                    node = dojo.doc.documentElement;
                handles.push(dojo.connect(stateDef, 'onChanged', function () { promise.progress(); promise.resolve(); release(); }));
                if (stateDef.set)
                    applyClassStateFromSet(node, state, stateDef.set, value, stateDef.custom,
                        stateDef.onChanged, context);
                else
                    applyClassState(node, state, value, stateDef.custom, stateDef.onChanged, context);
        }

        return promise;

    },

    getDomState: function (/* DOMNode */ scope, /* String */ state) {
        //  summary: Returns a true or false if the given DOM Node (scope) has been
        //  set to the specified state.
        // TODO: get ancestor states
        var node = scope;

        switch (state) {

            case 'cujo-block':
                if (!node)
                    node = dojo.body();
                return !!node._cujo_uiBlocker;

            case 'cujo-capture':
                // TODO:
                return false;

            default:
                if (!node)
                    node = dojo.doc.documentElement;
                if (state) {
                    return dojo.hasClass(node, state);
                }
                else {
                    return dojo.attr(node, 'class');    
                }

        }
        
    },

    toggleDomState: function (/* cujo.__StateDef */ stateDef) {
        //  summary: toggles the given state for the dom node specified in the stateDef object.
        //  See cujo.setDomState for more info.
        if (!stateDef.value)
            stateDef.value = !this.getState(stateDef.scope, stateDef.state);
        return this.setState(stateDef);

    }

});

/*=====
cujo.__StateDef = {
    //  scope: DOMNode
    //      Node at which the state change should be rooted
    //  state: String
    //      State to set (or unset) at the scope node.
    //  value: Boolean?
    //      Whether to apply (true) or unapply (false) the state. Default is true.
    //  set: Array|Object?
    //      Set of mutually-exclusive states. When specified, all of these states, except the one
    //      in the state property, will be unapplied.  If value is false, the opposite will occur.
    //  custom: Boolean?
    //      If true, the standard 'cujo' prefix will not be added. This parameter defaults to
    //      false when the state parameter is missing and defaults to false when it is specified.
    //      Simply set this parameter when you need to override these defaults.
    //  onChanged: Function?
    //      All UI / DOM state operations are asynchronous. To be notified when a state change is
    //      complete, provide an onChanged callback function.
    //  onError: Function?
    //      A callback function to be notified if an error occurs. single param = Exception object
    //  context: Object?
    //      If specified, the onChanged callback is executed in this object's context.
};
=====*/

/*=====
cujo.__StateDef_Block = {
    //  scope: DOMNode
    //      Node at which the state change should be rooted
    //  state: String
    //      State to set (or unset) at the scope node.
    //  value: Boolean?
    //      Whether to apply (true) or unapply (false) the state. Default is true. Block states
    //      can be applied successively and are accrued.  The same number of false values
    //      (unblocks) must be applied as were true values to totally unblock the scope node.
    //      In short, if a scope node is blocked 3 times, it must be unblocked 3 times.
    //  onVisible: Function?
    //      Blocking operations are invisible at first so the user does not experience a change in
    //      the UI unless the block will be long-lived. To be notified when the blocked UI is
    //      visible, provide a callback function.
    //  message: String?
    //      An optional message to show the user while the UI is blocked. If omitted and an
    //      existing block is applied at this scope (node), the existing message is kept.
    //      If omitted and there is no existing block, a localized (i18n) default message is shown.
    //  zIndex: Number?
    //      Specifies how high in the z-order the blocking should occur. Default is 100,000,
    //      which should probably be enough! If an existing block is applied, this is ignored.
    //  onChanged: Function?
    //      All UI / DOM state operations are asynchronous. To be notified when a state change is
    //      complete, provide an onChanged callback function.
    //  onError: Function?
    //      A callback function to be notified if an error occurs. single param = Exception object
    //  context: Object?
    //      If specified, the callbacks are executed in this object's context. To execute some
    //      callbacks in a different context, pre-bind them with dojo.hitch().
};
=====*/

function stateToClass (c, u) { return c; } //TODO: remove: return u ? c : ('cujo' + cujo.capitalize(c)) };

function applyClassState (node, state, value, custom, callback, context) {

    // apply state
    dojo.toggleClass(node, stateToClass(state, custom), value);

    // callback is always async
    if (callback)
        setTimeout(function () { callback.call(context); }, 0);

}

function applyClassStateFromSet (node, state, set, value, custom, callback, context) {
    // TODO: css transitions
    // mutually-exclusive set

    if (custom == undefined)
        custom = true;

    var obj = cujo.typeOf(set) != 'Array';

    // ensure that all other states are applied the opposite of state
    for (var p in set) {
        var itemState = (obj ? p : set[p]);
        if (itemState != state)
            dojo.toggleClass(node, stateToClass(itemState, custom), !value);
    }

    // apply primary state
    dojo.toggleClass(node, stateToClass(state, custom), value);

    // callback is always async
    if (callback)
        setTimeout(function () { callback.call(context); }, 0);

}

function blockNode (node, isBlocking, callback, context, params) {
    // TODO: keep track of previous status messages (here or in widget?)

    // reuse an existing one if it exists
    if (node._cujo_uiBlocker) {
        var uib = node._cujo_uiBlocker;
        //if (params.message) // TODO: do this here or in the widget?
            uib.attr('statusMessage', params.message);
        if (isBlocking)
            uib.block();
        else
            uib.unblock();
        // if we're no longer blocking, remove the node
        if (!uib.isBlocking()) {
            uib.destroy();
            delete node._cujo_uiBlocker;
        }
    }

    // no need to create a UIBlocker if we're unblocking and one doesn't exist (should never happen)
    else if (isBlocking) {
        var uib = node._cujo_uiBlocker = new cujo._UIBlocker(params);
        dojo.place(uib.domNode, node, 'last');
        uib.block();
    }

    // callback is always async
    if (callback)
        setTimeout(function () { callback.call(context); }, 0);

}

})();
