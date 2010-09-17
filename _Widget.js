/*
    cujo._Widget
    (c) copyright 2009, unscriptable.com
    author: john

    LICENSE: see the LICENSE.txt file. If file is missing, this file is subject to the AFL 3.0
    license at the following url: http://www.opensource.org/licenses/afl-3.0.php.

    TODO: i18n support
    TODO: remove event handlers inherited from dijit._Widget and create topics instead?
            or is it okay to have dom events be sync/non-guaranteed?

    TODO: widgets to create
        - Grid
        - EditGrid
        - BulkDelete button for EditGrid (simply as an example?)
        - Tooltip that hovers in a corner position instead of adjacent (which is almost always
          a bad place) and is moveable! (but baloon pointer still points at the source node)
        - Stack and Accordion
        - NavBar, TabBar, and MenuBar
        - Mult-view Navigator (Tree view or Finder views [icons, list, columns, cover flow])
        - Splitter
        - Calendar


*/
dojo.provide('cujo._Widget');

dojo.require('dijit._Widget');
dojo.require('dojo.Stateful');

// cujo.registerPublisher('cujo.customize', 'last'); // last to register has right of first refusal
    //  other publisher types:
    //      first - first to register has right of first refusal
    //      any - keeps calling listeners until one returns a truthy value
    //      all - keeps calling listeners until one returns an explicit false

(function () { // local scope

dojo.declare('cujo._Widget', [dijit._Widget], {

    // most cujo images should reside here:
    imagesPath: dojo.moduleUrl('cujo', 'theme/img'),

/*=====
    //  attributeMap: Object
    //      attributeMap is defined in dijit._Widget, but cujo._Widget has an additional attribute
    //      type added: 'widget'. This allows embedded widgets to be included in the bindings.
    //      attributeMap: {
    //          startDate: {
    //              node: 'startDateBox',
    //              type: 'widget',
    //              attribute: 'value'
    //          },
    //          displayDate: [
    //              {
    //                  node: 'startDateTitle',
    //                  type: 'attribute',
    //                  attribute: 'title'
    //              },
    //              {
    //                  node: 'startDateTitle',
    //                  type: 'innerHTML'
    //              }
    //          ]
    //      }
    //      In this example, startDateBox is the name of the attach point for some widget. There is also
    //      a node (attach point == 'startDateTitle') that is bound twice to displayDate (title attribute
    //      and innerHTML).
    //      Bi-directional binding:
    //      When a binding is bi-directional, the developer must also designate the event to be
    //      hooked in order to receive update notifications.  Example:
    //      attributeMap: {
    //          startDate: {
    //              node: 'startDateBox',
    //              type: 'widget',
    //              attribute: 'value',
    //              event: 'onChange',
    //              watch: "" // future
    //          }
    //      }
    //      When dijit's widgets support the watch method, the watch property (if present) will preclude
    //      the event property.  The watch property may have a string value that indicates the name of
    //      the property to watch on the widget. If set to "", the attribute property is the default.
    attributeMap: null,
=====*/


    //  customizableProps: Array (of String)
    //  TODO: expand this to allow for i18n and multiple resource bundles mapped to multiple properties 
    //      A list of strings to be translated or customized before instantiating this widget.
    //      It is the developer's responsibility to subscribe to the 'cujo.customize' topic
    //      and listen for publications for this widget.  The listener should replace any
    //      properties listed in the customizableProps property.  If customizableProps is null,
    //      then the listener should use its own logic (e.g. all or nothing).  The parameters
    //      to the cujo.custimze topic are as follows:
    //          obj: cujo._Widget - the widget that is requesting customization
    //          declaredClass: String - the name of the widget requesting customization
    //          customizableProps: Array - list of strings that need to be customized
    //      example listener:
    //          dojo.subscribe('cujo.customize', function (widget, clazz, props) {
    //              // myGlobalCustomProps is a hierarchical map of objects that mirrors
    //              // our widgets (e.g. {cujo: {Accordion: {collapseLabel: 'collapse'}}})
    //              var custBase = dojo.getObject(clazz, myGlobalCustomProps, false);
    //              if (custBase) {
    //                  if (props) {
    //                      for (var p in props)
    //                          if (custBase[p])
    //                              widget[p] = custBase[p];
    //                  }
    //                  else {
    //                      // copy from our global customization heirarchy to our widget
    //                      dojo.mixin(widget, custBase);
    //                  }
    //              }
    //          })
    customizableProps: null,

    postMixInProperties: function () {
        dojo.publish('cujo.customize', [this, this.declaredClass, this.customizableProps]);
    },

    // TODO: remove for dojo 1.6 which will have watch() already
    set: function (name, value) {
        if (dojo.isObject(name)) {
            // inherited dijit._Widget will break object into individual properties
            // and call set() recursively
            this.inherited(arguments);
        }
        else {
            var oldValue = this[name];
            this.inherited(arguments);
            if (oldValue !== value) {
                if (this._watchCallbacks && oldValue !== value) {
                    this._watchCallbacks(name, oldValue, value);
                }
            }
        }
        return this;
    },

    // TODO: remove for dojo 1.6 which will have watch() already
    watch: dojo.Stateful.prototype.watch,

    _attrToDom: function (/*String*/ attr, /*String*/ value) {
        // handles child widgets that dijit._Widget does not and hooks up bi-directional bindings
        if (this.domNode) {
            var commands = this.attributeMap[attr];
            dojo.forEach(commands && [].concat(commands), function (command) {
                // check for widgets
                var node = this[command.node],
                    attribute = command.attribute || attr;
                if (command.type == 'widget') {
                   node.set(attribute, value);
                }
            }, this);
            // call inherited
            this.inherited(arguments);
        }
    },

    _domToAttr: function (attr, command) {
        // Note: node could be a widget
        var node = this[command.node || command || 'domNode'],
            attribute = command.attribute || attr,
            val = node.get ? node.get(attribute) : dojo.attr(node, attribute);
        this.set(attr, val);
    },

    _applyAttributes: function () {
        //  dijit._Widget only binds the starting value of a property onto a node (i.e. runs
        //  _attrToDom()) if the property has a custom setter _setXXXAttr or has a non-falsy
        //  initial value on the prototype or was supplied as a constructor param.
        //  We need the _attrToDom to run for anything with two-way binding, too!
        // TODO: add watch support when dijit supports it
        cujo.lang.forInAll(this.attributeMap, function (commands, attr) {
            dojo.forEach(commands && [].concat(commands), function (command) {
                if (command.event) {
                    // check for two-way binding
                    var node = this[command.node];
                    if (node) {
                        this.connect(node, command.event, function () { this._domToAttr(attr, command); });
                    }
                    // TODO: only process attributes that wouldn't get set by dijit_Widget's _applyAttributes
                    this.set(attr, this[attr]);
                }
            }, this);
        }, this);
        return this.inherited(arguments);
    }

});

})(); // end of local scope
