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
dojo.require('cujo._Connectable');
// cujo.registerPublisher('cujo.customize', 'last'); // last to register has right of first refusal
    //  other publisher types:
    //      first - first to register has right of first refusal
    //      any - keeps calling listeners until one returns a truthy value
    //      all - keeps calling listeners until one returns an explicit false

(function () { // local scope

dojo.declare('cujo._Widget', [dijit._Widget, cujo._Connectable], {

    // most cujo images should reside here:
    imagesPath: dojo.moduleUrl('cujo', 'theme/img'),

    //  customizableProps: Array (of String)
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
    //              // myGlobalCustomProps is a heirarchical map of objects that mirrors
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
    }

});

})(); // end of local scope
