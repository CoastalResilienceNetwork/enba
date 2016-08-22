
// Plugins should load their own versions of any libraries used even if those libraries are also used
// by the GeositeFramework, in case a future framework version uses a different library version.

require({
    // Specify library locations.
    // The calls to location.pathname.replace() below prepend the app's root path to the specified library location.
    // Otherwise, since Dojo is loaded from a CDN, it will prepend the CDN server path and fail, as described in
    // https://dojotoolkit.org/documentation/tutorials/1.7/cdn
    packages: [
        {
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        },
        {
            name: "underscore",
            location: "//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3",
            main: "underscore-min"
        }
    ]
});

define([
		"dojo/_base/declare",
		"framework/PluginBase",
		"dojo/parser",
		"dijit/registry",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-geometry",
		"dojo/_base/lang",
		"dojo/_base/array",
		"dojo/query",
		 "d3",
		"underscore",
		"./app",
		"dojo/text!plugins/enba/enba_data.json",
		"dojo/text!plugins/enba/eca_interface.json",
		"dojo/text!./templates.html"
       ],
       function (declare, PluginBase, parser, registry, domClass, domStyle, domGeom, lang, array, query, d3, _, enba, appData, appConfig, templates) {
           return declare(PluginBase, {
               toolbarName: "Economics of Nature-Based Adaptation",
               toolbarType: "sidebar",
               resizable: false,
               showServiceLayersInLegend: true,
               allowIdentifyWhenActive: true,
               infoGraphic: "",
               pluginDirectory: "plugins/enba",
               width: 515,
			   height: "auto",
			   _state: {},
			   _firstLoad: true,

               activate: function () {
					//process this._state if a populated object from setState exists
					if (!_.isEmpty(this._state)) {
						 for (var control in this._state.controls.radiocheck) {
							 for (property in this._state.controls.radiocheck[control]) {
								 this.enbaTool[control][property] = this._state.controls.radiocheck[control][property];
							 }
						 }

						 if (!_.isUndefined(this.enbaTool._map.getLayer("enbaMapLayer"))) {
							 this.enbaTool.updateLayer([]);
						 }

						 for (var control in this._state.controls.selects) {
							 for (property in this._state.controls.selects[control]) {
								 this.enbaTool[control][property] = this._state.controls.selects[control][property];
							 }
						 }

						 for (var slider in this._state.controls.sliders) {
							 for (property in this._state.controls.sliders[slider]) {
								this.enbaTool[slider].set(property, this._state.controls.sliders[slider][property]);
							 }
						 }
						 
						 this.chart._filter_value =  this._state.controls.selects.discountRateSelect.value;
						 this.chart._storm_value =  this._state.controls.selects.stormSelect.value;

						this._state = {};
					}

					this.enbaTool.showTool();
					
					if (this._firstLoad) {
						console.log(this);
						domStyle.set(this.container.parentNode.parentNode, {
							"left": (domGeom.getMarginBox(this.container.parentNode.parentNode).l + 30) + "px",
							"top": (domGeom.getMarginBox(this.container.parentNode.parentNode).t + 30) + "px"
						});
						this._firstLoad = false;
					}
               },

               deactivate: function () {
                   this.enbaTool.hideTool();
               },

               hibernate: function () {
				   this.enbaTool.closeTool();
				   this.enbaTool.resetInterface();
               },

               initialize: function (frameworkParameters) {
				   declare.safeMixin(this, frameworkParameters);
                      var djConfig = {
                        parseOnLoad: true
                   };
                   domClass.add(this.container, "claro");
					this.enbaTool = new enba(this, appData, appConfig, templates);
					this.enbaTool.initialize(this.enbaTool);
					enbaTool = this.enbaTool;
					domStyle.set(this.container.parentNode, {
						"padding": "0px"
					});
               },

               getState: function () {
                   var state = new Object();
				   
				   state.controls = {};
				   state.controls.selects = {};
				   state.controls.sliders = {};
				   state.controls.radiocheck = {};

                   state.controls.selects.managementTypeSelect = {
						"value": this.enbaTool.managementTypeSelect.value
				   }
				   state.controls.selects.hazardSelect = {
						"value": this.enbaTool.hazardSelect.value
				   }
				   state.controls.selects.damageSelect = {
						"value": this.enbaTool.damageSelect.value
				   }
				   state.controls.selects.discountRateSelect = {
						"value": this.enbaTool.discountRateSelect.value
				   }
				   state.controls.selects.stormSelect = {
						"value": this.enbaTool.stormSelect.value
				   }
				   
				   state.controls.sliders.climateYearSliderDamages = {
						"value": this.enbaTool.climateYearSliderDamages.get("value")
				   }

				   state.controls.radiocheck.managementLayerCheckBox = {
					   "checked": this.enbaTool.managementLayerCheckBox.checked,
					   "disabled": this.enbaTool.managementLayerCheckBox.disabled
				   }
				   state.controls.radiocheck.hazardLayerCheckBox = {
					   "checked": this.enbaTool.hazardLayerCheckBox.checked,
					   "disabled": this.enbaTool.hazardLayerCheckBox.disabled
				   }
				   state.controls.radiocheck.damageLayerCheckBox = {
					   "checked": this.enbaTool.damageLayerCheckBox.checked,
					   "disabled": this.enbaTool.damageLayerCheckBox.disabled
				   }
				   state.controls.radiocheck.ecosystemCheckBox = {
					   "checked": this.enbaTool.ecosystemCheckBox.checked,
					   "disabled": this.enbaTool.ecosystemCheckBox.disabled
				   }
				   
				   console.log(state);

                   return state;

                },

               setState: function (state) {
				   this._state = state;
               },

               identify: function(){

               }
           });
       });
