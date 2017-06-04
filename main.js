
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
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		"dojo/dom-geometry",
		 "d3",
		"underscore",
		"./app",
		"dojo/text!plugins/enba/data.json",
		"dojo/text!plugins/enba/interface.json",
		"dojo/text!./templates.html"
       ],
       function (declare, PluginBase, parser, domClass, domStyle, domAttr, domGeom, d3, _, enba, appData, appConfig, templates) {
           return declare(PluginBase, {
               toolbarName: "Economics of Nature-Based Adaptation",
               toolbarType: "sidebar",
               hasHelp: false,
               showServiceLayersInLegend: true,
               allowIdentifyWhenActive: true,
               infoGraphic: "",
               pluginDirectory: "plugins/enba",
               size: "custom",
			   width: 510,
			   _state: {},
			   _firstLoad: true,
			   _saveAndShare: true,

               activate: function () {
				    var self = this;
					//process this._state if a populated object from setState exists
					if (!_.isEmpty(this._state) && this._saveAndShare) {
						this._saveAndShare = false;
						this.enbaTool.initializeMap();
						window.setTimeout(function() {
							 self.enbaTool.regionSelect.value = self._state.controls.region;
							 self.enbaTool._region =  self._state.controls.region;
							 self.enbaTool.updateInterface();
							 
							 for (var control in self._state.controls.radiocheck) {
								 for (property in self._state.controls.radiocheck[control]) {
									 self.enbaTool[control][property] = self._state.controls.radiocheck[control][property];
								 }
							 }

							 for (var control in self._state.controls.selects) {
								 for (property in self._state.controls.selects[control]) {
									 self.enbaTool[control + "Select"][property] = self._state.controls.selects[control][property];
								 }
							 }

							 for (var slider in self._state.controls.sliders) {
								 for (property in self._state.controls.sliders[slider]) {
									self.enbaTool[slider].set(property, self._state.controls.sliders[slider][property]);
								 }
							 }
							 
							var management = self.enbaTool.managementTypeSelect.value;
							var hazard = self.enbaTool.hazardSelect.value;
							var damage = self.enbaTool.damageSelect.value;
							var climate = self.enbaTool._interface.region[self._state.controls.region].controls.slider.climate[self.enbaTool.climateSlider.get("value")];
							
							var visibleLayers = [];
							if (self.enbaTool.managementLayerCheckBox.checked) {
								visibleLayers = _.difference(visibleLayers, _.flatten(_.values(self.enbaTool._data.layers.management)));
								if (management != "" && management != "existing") {
									visibleLayers = _.union(visibleLayers, self.enbaTool._data.layers.management[management]);
									domAttr.set(self.enbaTool.managementLayerCheckBox, "disabled", false);
								} else {
									domAttr.set(self.enbaTool.managementLayerCheckBox, "disabled", true);
								}
							}
							
							if (self.enbaTool.hazardLayerCheckBox.checked) {
								visibleLayers = _.difference(visibleLayers, _.range(self.enbaTool._data.layers.hazard["all-layer-index"][0], self.enbaTool._data.layers.hazard["all-layer-index"][1]+1));
								if (management != "" && management != "existing" && hazard != "total") {
									visibleLayers = _.union(visibleLayers, self.enbaTool._data.layers.hazard[management][hazard][climate]);
									domAttr.set(self.enbaTool.hazardLayerCheckBox, "disabled", false);
								} else {
									domAttr.set(self.enbaTool.hazardLayerCheckBox, "disabled", true);
								}
							}
							
							if (self.enbaTool.damageLayerCheckBox.checked) {
								visibleLayers = _.difference(visibleLayers, _.range(self.enbaTool._data.layers.damage["all-layer-index"][0], self.enbaTool._data.layers.damage["all-layer-index"][1]+1));
								if (hazard != "total" && damage != "total") {
									visibleLayers = _.union(visibleLayers, self.enbaTool._data.layers.damage[damage][management][hazard][climate]);
									domAttr.set(self.enbaTool.damageLayerCheckBox, "disabled", false);
								} else {
									domAttr.set(self.enbaTool.damageLayerCheckBox, "disabled", true);
								}
							}
							self.enbaTool.updateMapLayers(visibleLayers, self.enbaTool.mapLayer);
							 
							self.enbaTool.updateLineChart2();
							self.enbaTool.updateExposureResults2();

							self._state = {};
							
							self._firstLoad = false;
						}, 1000);
					} else {
						this.enbaTool.showTool();
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
				   domClass.add(this.container, "plugin-enba");
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
				   state.controls.region =  this.enbaTool.regionSelect.value;
				   
                   state.controls.selects.managementType = {
						"value": this.enbaTool.managementTypeSelect.value
				   }
				   state.controls.selects.hazard = {
						"value": this.enbaTool.hazardSelect.value
				   }
				   state.controls.selects.damage = {
						"value": this.enbaTool.damageSelect.value
				   }
				   state.controls.selects.discountRate = {
						"value": this.enbaTool.discountRateSelect.value
				   }
				   state.controls.selects.storm = {
						"value": this.enbaTool.stormSelect.value
				   }
				   
				   state.controls.sliders.climateSlider = {
						"value": this.enbaTool.climateSlider.get("value")
				   }
				   
				   state.controls.sliders.opacitySlider = {
						"value": this.enbaTool.opacitySlider.get("value")
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

                   return state;

                },

               setState: function (state) {
				   this._state = state;
               },

               identify: function(){

               }
           });
       });
