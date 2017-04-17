
define([
	    "dojo/_base/declare",
		"d3",
		"use!underscore",		
	    "dojo/json", 
		"dijit/layout/ContentPane",
		"dojo/on",
		"dojo/_base/array",
		"dojo/_base/window",
		"dojo/query",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/dom-style",
		"dojo/dom-attr",
		"dojo/_base/window",
		"dojo/dom-construct",
		"dojo/dom-geometry",
		"dojo/parser",
		"dijit/registry",
		"dijit/form/HorizontalSlider",
		"dijit/form/HorizontalRuleLabels",
		"dojox/form/RangeSlider",
		"esri/layers/ArcGISDynamicMapServiceLayer",
		"esri/geometry/Extent",
		"dojo/_base/html",
		"dojo/NodeList-traverse"
		],

	function (declare,
			d3,
			_, 
			JSON,
			ContentPane,
			on,
			array,
			win,
			query,
			dom,
			domClass,
			domStyle,
			domAttr,
			win,
			domConstruct,
			domGeom,
			parser,
			registry,
			HorizontalSlider,
			HorizontalRuleLabels,
			RangeSlider,
			DynamicMapServiceLayer,
			Extent,
			html
		  ) 
		
		{

		var enbaTool = function(plugin, appData, enbaConfig, templates){
			this._legend = plugin.legendContainer;
			this._map = plugin.map;
			this._app = plugin.app;
			this._container = plugin.container;
			this._plugin = plugin;
			this._$templates = $('<div>').append($($.trim(templates)))
			
			var self = this;
			this.parameters = {};
			this.pluginDirectory = plugin.pluginDirectory;
			this.utilities = {};
			
			this.initialize = function(){
				this._data = JSON.parse(appData);
				this._interface = JSON.parse(enbaConfig);
				this.parameters.layersLoaded = false;
				
				this.chart = {};
				this.chart.damages = {};
				this.chart.cost_benefit = {};
				d3.csv(this.pluginDirectory + "/data/damages.csv", function(error, data){
					data.forEach(function(d) { 
						d.damages = +d.damages;
						d.diff = +d.diff;
					});
					self.chart.damages.data = data;
				})
				d3.csv(this.pluginDirectory + "/data/cost_benefit_2.csv", function(error, data){
					data.forEach(function(d) { 
						d.ratio = +d.ratio;
						d.storm = +d.storm;
						d.cost = +d.cost;
						d.benefit = +d.benefit;
						d.discount = +d.discount;
						d.net = +d.net;
						d.ecosystem = +d.ecosystem;
						d.net_ecosystem = +d.net_ecosystem;
					});
					self.chart.cost_benefit.data = data;
				});
				this.chart._filter = "discount";
				this.chart._filter_value = 3;
				this.chart._storm_value = 100;
				this.chart._x_key = "storm";
				this.chart._y_key = "net";
				
				domStyle.set(this._container, {
					"padding": "0px"
				});
				
				this.loadInterface(this);
			}
			
			this.showIntro = function(){
				var self = this;	
			};

			this.showTool = function(){
				if (_.isUndefined(this._map.getLayer("enbamapLayer")) ) {
					this.initializeMap();
				} else {
					this.mapLayer.show();
				}
			} 

			this.hideTool = function(){
				if (this.mapLayer && this.mapLayer.loaded) { 
					//this.mapLayer.hide();
				}
			}
			
			this.closeTool = function(){
				if (this.mapLayer && this.mapLayer.loaded) { 
					this._map.removeLayer(this.mapLayer);
				}
			}
			
			this.resetInterface = function(){
				if (this.mapLayer && this.mapLayer.loaded) {
					this.managementTypeSelect.value = _.first(this._interface.exposure.controls.management).value;
					this.hazardSelect.value = _.first(this._interface.exposure.controls.hazard).value;
					this.damageSelect.value = _.first(this._interface.exposure.controls.damage).value;
					this.discountRateSelect.value = 3;
					this.stormSelect.value = 100;
					this.climateYearSliderDamages.set("value", this._interface.exposure.controls.slider.climate.length-1);
					this.managementLayerCheckBox.checked = true;
					this.managementLayerCheckBox.disabled = true;
					this.hazardLayerCheckBox.checked = true;
					this.hazardLayerCheckBox.disabled = true;
					this.damageLayerCheckBox.checked = true;
					this.damageLayerCheckBox.disabled = true;
					this.ecosystemCheckBox.checked = true;
					this.ecosystemCheckBox.disabled = false;
					
					this.chart._storm_value = this.stormSelect.value;
					this.updateLineChart();
					this.updateExposureResults();
				}
			}

			this.initializeMap = function(){
				//initialize an empty dynamic map service layer
			    var mapUrl = this._interface.service;
				
				this.mapLayer = new DynamicMapServiceLayer(this._data.url, { id:"enbamapLayer" });
				this._map.addLayer(this.mapLayer);
				this.mapLayer.hide();
				this.mapLayer.setVisibleLayers([]);
				
				var extent = new Extent(this._interface.extents.initial);
				this._map.setExtent(extent, false);
				this.parameters.layersLoaded = true;
			}

			this.updateLayer = function(visibleLayers){
				this.mapLayer.setVisibleLayers(visibleLayers);
	            this.mapLayer.show();
			}
						
			this.loadInterface = function() {
				var self = this;
				
				//empty layout containers
			    this.cpExposure = new ContentPane({
					id:"plugin-enba-" + self._map.id,
					style: 'position:relative;;overflow: visible;',
					className: 'cr-dojo-dijits'
			    });
			    this.cpExposure.startup();
				this._container.appendChild(this.cpExposure.domNode);
				
				this.createExposureInputs();
			    this.createExposureChart();
				
				this.tip = domConstruct.create("div", { className: "enba-tooltip interface" });
				win.body().appendChild(this.tip);
				
				on(this._map, "resize", function() {
					
				});
			}
			
			this.createExposureInputs = function(){
				this.exposureInputsPane = new ContentPane();
				this.cpExposure.domNode.appendChild(this.exposureInputsPane.domNode);
			    domStyle.set(this.exposureInputsPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"background": "#edf2f2",
					"padding": "20px"
				});
				
				var table = domConstruct.create("table", {style:"position:relative;width: 100%;background: none;border: none; margin:0px 0px 20px 0px;"}, this.exposureInputsPane.containerNode);
				var tr = domConstruct.create("tr", {}, table);
				var managementTd = domConstruct.create("td", { style:"position:relative;width:33%; text-align:center;"}, tr);
				var hazardTd = domConstruct.create("td", { style:"position:relative;width:33%; text-align:center;"}, tr);
				var damageTd = domConstruct.create("td", { style:"position:relative;width:33%; text-align:center;"}, tr);
				
				// management controls
				var managementTypeText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;",
					innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-management'></i>&nbsp;<b>Adaptation Strategy:</b>"
				}, managementTd);
				
				var managementTypeSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:150px;display:inline-block;" 
				}, managementTd);
				this.managementTypeSelect = dojo.create("select", { name: "managementType"}, managementTypeSelectDiv);
				dojo.forEach(this._interface.exposure.controls.management, function(item) {
					dojo.create("option", { innerHTML: item.name, value: item.value }, self.managementTypeSelect);
				});
				on(this.managementTypeSelect, "change", function() {
					var management = this.value;
					var hazard = self.hazardSelect.value;
					var damage = self.damageSelect.value;
					var climate = self._interface.exposure.controls.slider.climate[self.climateYearSliderDamages.get("value")];
					
					if (self.managementLayerCheckBox.checked) {
						var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.flatten(_.values(self._data.layers.management)));
						if (management != "" && management != "existing") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.management[this.value]);
							domAttr.set(self.managementLayerCheckBox, "disabled", false);
						} else {
							domAttr.set(self.managementLayerCheckBox, "disabled", true);
						}
						self.updateMapLayers(visibleLayers, self.mapLayer);
					}
					
					if (self.hazardLayerCheckBox.checked) {
						var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.hazard["all-layer-index"][0], self._data.layers.hazard["all-layer-index"][1]+1));
						if (management != "" && management != "existing" && hazard != "total") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.hazard[management][hazard][climate]);
							domAttr.set(self.hazardLayerCheckBox, "disabled", false);
						} else {
							domAttr.set(self.hazardLayerCheckBox, "disabled", true);
						}
						self.updateMapLayers(visibleLayers, self.mapLayer);
					}
					
					if (self.damageLayerCheckBox.checked) {
						var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.damage["all-layer-index"][0], self._data.layers.damage["all-layer-index"][1]+1));
						if (hazard != "total" && damage != "total") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.damage[damage][management][hazard][climate]);
							domAttr.set(self.damageLayerCheckBox, "disabled", false);
						} else {
							domAttr.set(self.damageLayerCheckBox, "disabled", true);
						}
						self.updateMapLayers(visibleLayers, self.mapLayer);
					}
				});
				
				var checkBoxDiv = domConstruct.create("label", { for: "management-layer-" + self._map.id, className:"styled-checkbox", style:"display:inline-block;" }, managementTd);
				this.managementLayerCheckBox = domConstruct.create("input", { type:"checkbox", value:"management", name:"management-layer", id:"management-layer-" + self._map.id, disabled:true, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { innerHTML: '<span>view map layer</span>'}, checkBoxDiv);
				on(self.managementLayerCheckBox, "change", function(){
					var management = self.managementTypeSelect.value;
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers[this.value]["all-layer-index"][0], self._data.layers[this.value]["all-layer-index"][1]+1));
					if (this.checked) {
						if (management != "" && management != "existing") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.management[management]);
						}
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
				});
				
				// hazard controls
				var hazardText = domConstruct.create("div", {style: "position:relative;margin-bottom:5px;", innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-hazard'></i>&nbsp;<b>Hazard:</b>"}, hazardTd);
				
				var hazardSelectDiv = domConstruct.create("div", { className: "styled-select", style:"width:110px;display:inline-block;" }, hazardTd);
				this.hazardSelect = dojo.create("select", { name: "hazard", "disabled": false }, hazardSelectDiv);
				dojo.forEach(this._interface.exposure.controls.hazard, function(item) {
					dojo.create("option", { innerHTML: item.name, value: item.value }, self.hazardSelect);
				});
				on(this.hazardSelect, "change", function() { 
					var management = self.managementTypeSelect.value;
					var hazard = this.value;
					var damage = self.damageSelect.value;
					var climate = self._interface.exposure.controls.slider.climate[self.climateYearSliderDamages.get("value")];
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.hazard["all-layer-index"][0], self._data.layers.hazard["all-layer-index"][1]+1));
					if (management != "" && management != "existing" && hazard != "total") {
						var visibleLayers = _.union(visibleLayers, self._data.layers.hazard[management][hazard][climate]);
						domAttr.set(self.hazardLayerCheckBox, "disabled", false);
					} else {
						domAttr.set(self.hazardLayerCheckBox, "disabled", true);
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
					
					if (self.damageLayerCheckBox.checked) {
						var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.damage["all-layer-index"][0], self._data.layers.damage["all-layer-index"][1]+1));
						if (hazard != "total" && damage != "total") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.damage[damage][management][hazard][climate]);
							domAttr.set(self.damageLayerCheckBox, "disabled", false);
						} else {
							domAttr.set(self.damageLayerCheckBox, "disabled", true);
						}
						self.updateMapLayers(visibleLayers, self.mapLayer);
					}
					self.updateLineChart();
					self.updateExposureResults();
					
				});
				
				var checkBoxDiv = domConstruct.create("label", { for: "hazard-layer-" + self._map.id, className:"styled-checkbox", style:"display:inline-block;" }, hazardTd);
				this.hazardLayerCheckBox = domConstruct.create("input", { type:"checkbox", value:"hazard", name:"hazard-layer", id:"hazard-layer-" + self._map.id, disabled:true, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { innerHTML: '<span>view map layer</span>'}, checkBoxDiv);
				on(self.hazardLayerCheckBox, "change", function(){
					var management = self.managementTypeSelect.value;
					var hazard = self.hazardSelect.value;
					var climate = self._interface.exposure.controls.slider.climate[self.climateYearSliderDamages.get("value")];
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers[this.value]["all-layer-index"][0], self._data.layers[this.value]["all-layer-index"][1]+1));
					if (this.checked) {
						if (management != "" && management != "existing" && hazard != "total") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.hazard[management][hazard][climate]);
						}
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
				});
				
				// damage controls
				var damageEstimateText = domConstruct.create("div", {style: "position:relative;margin-bottom:5px;", innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-damage'></i>&nbsp;<b>Damage Estimate:</b>"}, damageTd);
				
				var damageSelectDiv = domConstruct.create("div", { className: "styled-select", style:"width:130px;display:inline-block;" }, damageTd);
				this.damageSelect = dojo.create("select", { name: "damage"}, damageSelectDiv);
				dojo.forEach(this._interface.exposure.controls.damage, function(item) {
					dojo.create("option", { innerHTML: item.name, value: item.value }, self.damageSelect);
				});
				on(this.damageSelect, "change", function() { 
					var management = self.managementTypeSelect.value;
					var hazard = self.hazardSelect.value;
					var damage = this.value;
					var climate = self._interface.exposure.controls.slider.climate[self.climateYearSliderDamages.get("value")];
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.damage["all-layer-index"][0], self._data.layers.damage["all-layer-index"][1]+1));
					if (hazard != "total" && damage != "total") {
						var visibleLayers = _.union(visibleLayers, self._data.layers.damage[damage][management][hazard][climate]);
						domAttr.set(self.damageLayerCheckBox, "disabled", false);
					} else {
						domAttr.set(self.damageLayerCheckBox, "disabled", true);
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
				});
				
				var checkBoxDiv = domConstruct.create("label", { for: "damage-layer-" + self._map.id, className:"styled-checkbox", style:"display:inline-block;" }, damageTd);
				this.damageLayerCheckBox = domConstruct.create("input", { type:"checkbox", value:"damage", name:"damage-layer", id:"damage-layer-" + self._map.id, disabled:true, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { innerHTML: '<span>view map layer</span>'}, checkBoxDiv);
				on(self.damageLayerCheckBox, "change", function(){
					var management = self.managementTypeSelect.value;
					var hazard = self.hazardSelect.value;
					var damage = self.damageSelect.value;
					var climate = self._interface.exposure.controls.slider.climate[self.climateYearSliderDamages.get("value")];
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.damage["all-layer-index"][0], self._data.layers.damage["all-layer-index"][1]+1));
					if (this.checked) {
						if (hazard != "total" && damage != "total") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.damage[damage][management][hazard][climate]);
						}
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
				});
				
				//climate year slider
			    var climateYearSliderLabel = domConstruct.create("div", {innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-climate'></i>&nbsp;<b>Climate Year: </b>", style:"position:relative; width:100px; top:-10px; display:inline-block; margin-left:6px;"});
				this.exposureInputsPane.containerNode.appendChild(climateYearSliderLabel);
				this.climateYearSliderDamages = new HorizontalSlider({
			        name: "climateYearSlider",
			        value: this._interface.exposure.controls.slider.climate.length-1,
			        minimum: 0,
			        maximum: this._interface.exposure.controls.slider.climate.length-1,
			        discreteValues: this._interface.exposure.controls.slider.climate.length,
			        showButtons: false,
					disabled: false,
			        style: "width:340px; display:inline-block; margin:0px 0px 0px 10px; background:none;",
			        onChange: function(value){
						var management = self.managementTypeSelect.value;
						var hazard = self.hazardSelect.value;
						var damage = self.damageSelect.value;
						var climate = self._interface.exposure.controls.slider.climate[self.climateYearSliderDamages.get("value")];
						
						if (self.hazardLayerCheckBox.checked) {
							var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.hazard["all-layer-index"][0], self._data.layers.hazard["all-layer-index"][1]+1));
							if (management != "" && management != "existing" && hazard != "total") {
								var visibleLayers = _.union(visibleLayers, self._data.layers.hazard[management][hazard][climate]);
								domAttr.set(self.hazardLayerCheckBox, "disabled", false);
							} else {
								domAttr.set(self.hazardLayerCheckBox, "disabled", true);
							}
							self.updateMapLayers(visibleLayers, self.mapLayer);
						}
						
						if (self.damageLayerCheckBox.checked) {
							var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.damage["all-layer-index"][0], self._data.layers.damage["all-layer-index"][1]+1));
							if (hazard != "total" && damage != "total") {
								var visibleLayers = _.union(visibleLayers, self._data.layers.damage[damage][management][hazard][climate]);
								domAttr.set(self.damageLayerCheckBox, "disabled", false);
							} else {
								domAttr.set(self.damageLayerCheckBox, "disabled", true);
							}
							self.updateMapLayers(visibleLayers, self.mapLayer);
						}
						self.updateLineChart();
						self.updateExposureResults();
			        }
			    });
			    this.exposureInputsPane.containerNode.appendChild(this.climateYearSliderDamages.domNode);

			    var climateYearSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: this._interface.exposure.controls.slider.climate,
			    	style: "margin-top: 5px;"
			    });
			    this.climateYearSliderDamages.addChild(climateYearSliderLabels);
				
				var clearDiv = domConstruct.create("div", {style: 'height: 15px; position: relative; width: 100%;'});
				this.exposureInputsPane.containerNode.appendChild(clearDiv);
				
				/* var radioButtonLabel = domConstruct.create("label", { className:"styled-radio", for: "armor-" + self._map.id }, this.exposureInputsPane.containerNode);
				this.armorRadioButton = domConstruct.create("input", { type:"radio", value:"armoring", name:"management", id:"armor-" + self._map.id }, radioButtonLabel);
				domConstruct.create("span", { innerHTML:"Coastal Armoring" }, radioButtonLabel );
				
				var radioButtonLabel = domConstruct.create("label", { className:"styled-radio", for: "nature-" + self._map.id }, this.exposureInputsPane.containerNode);
				this.natureRadioButton = domConstruct.create("input", { type:"radio", value:"nature-based", name:"management", id:"nature-" + self._map.id }, radioButtonLabel);
				domConstruct.create("span", { innerHTML:"Nature-based" }, radioButtonLabel ); */
				
			}
			
			this.updateMapLayers = function(visibleLayers, mapLayer) {
				mapLayer.setVisibleLayers(visibleLayers);
				mapLayer.show();
			}
			
			this.createExposureResults = function(){
				this.exposureMessagePane = new ContentPane();
				dojo.place(this.exposureMessagePane.domNode, this.cpExposure.domNode);
				domStyle.set(this.exposureMessagePane.containerNode, {
					"position": "relative",
					"padding": "0px 8px 0px 8px",
					"overflow": "visible"
				});
				
				var div = domConstruct.create("div", { className: "results-note" }, this.exposureMessagePane.containerNode);
				domConstruct.create("div", {
					className: "results-note-controls",
					innerHTML: '(based on a <span id="results-discount-' + this._map.id + '" class="results-select"> </span> discount rate and <span id="results-storm-' + this._map.id + '" class="results-select"></span> year storm)'
				}, div);
				
				var discountRateSelectDiv = domConstruct.create("div",{
					className: "styled-select results-select",
					style:"width: 50px;"
				}, dom.byId("results-discount-" + this._map.id));
				this.discountRateSelect = dojo.create("select", { name: "discount"}, discountRateSelectDiv);
				dojo.forEach(this._interface.exposure.controls.discount, function(item) {
					var selected = (item.value == self.chart._filter_value) ? true : false;
					dojo.create("option", { innerHTML: item.name, value: item.value, selected: selected  }, self.discountRateSelect);
				});
				on(this.discountRateSelect, "change", function() {
					self.updateLineChart();
					self.updateExposureResults();
				});
				
				var stormSelectDiv = domConstruct.create("div",{
					className: "styled-select results-select",
					style:"width: 80px;"
				}, dom.byId("results-storm-" + this._map.id));
				this.stormSelect = dojo.create("select", { name: "discount"}, stormSelectDiv);
				dojo.forEach(this._interface.exposure.controls.storm, function(item) {
					var selected = (item.value == self.chart._storm_value) ? true : false;
					dojo.create("option", { innerHTML: item.name, value: item.value, selected: selected }, self.stormSelect);
				});
				on(this.stormSelect, "change", function() {
					self.updateCurrentStormValue(this.value);
					self.chart._storm_value = this.value;
					self.stormSelect.value = this.value;
					self.updateExposureResults();
				});
				
				this.chart._filter_value = this.discountRateSelect.value;
				this.chart._storm_value = this.stormSelect.value;
								
				var checkBoxDiv = domConstruct.create("label", { for: "ecosystem-" + self._map.id, className:"styled-checkbox ecosystem-checkbox", style:"max-width:400px;position:relative;margin:0px 0px 0px 55px;" }, this.exposureMessagePane.containerNode);
				this.ecosystemCheckBox = domConstruct.create("input", { type:"checkbox", value:"ecosystem", name:"ecosystem", id:"ecosystem-" + self._map.id, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { style:"max-width:400px;", innerHTML: '<span>include benefits from investment in ecosystem services</span>'}, checkBoxDiv);
				on(this.ecosystemCheckBox,"change", function(){
					var _filter_value = self.discountRateSelect.value;
					var checked = this.checked;
					self.adjustLineForEcosystem(_filter_value, this.checked);
					self.updateExposureResults();
				});
			}
			
			this.updateExposureResults = function() {
				var _storm_value = this.chart._storm_value; 
				var _filter_value = this.discountRateSelect.value;
				var hazard = this.hazardSelect.value;
				var ecosystem = this.ecosystemCheckBox.checked;
				var climate = this._interface.exposure.controls.slider.climate[this.climateYearSliderDamages.get("value")];
				
				var _data = this.chart.cost_benefit.data.filter(function(d){ return d[self.chart._filter] == _filter_value && d.climate == climate && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				
				var _cca = _.first(array.filter(_nested[0].values, function(d) { return d.storm == self.chart._storm_value; }));
				var _nba = _.first(array.filter(_nested[1].values, function(d) { return d.storm == self.chart._storm_value; }));
				var diff = (ecosystem) ? _cca.net - (_nba.net + _nba.ecosystem) : _cca.net - _nba.net;
				
				var strategy_text = {"CCA": "engineered", "NBA": "natural" }
				var strategy = (diff > 0) ? "CCA" : "NBA";
				var strategy_alternative = (strategy == "CCA") ? "NBA" : "CCA";
				
				_.first(query("#" + "plugin-enba-" + this._map.id + " .results-strategy")).innerHTML = strategy_text[strategy];
				_.first(query("#" + "plugin-enba-" + this._map.id + " .results-strategy-alternative")).innerHTML = strategy_text[strategy_alternative];
				this.netBenefits.innerHTML = d3.format("$,.1f")(Math.abs(diff)) + "M";
				
				var color = (diff > 0) ? "#923034" : "#30928D";
				query("#" + "plugin-enba-" + this._map.id + " .results-stat").style("color", color);
				
				this.updateCurrentStormValue(_storm_value, strategy);
			}
			
			this.createExposureChart = function(){
				this.exposureChartPane = new ContentPane({});
				this.cpExposure.domNode.appendChild(this.exposureChartPane.domNode);
				domStyle.set(this.exposureChartPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"padding": "0px 8px 0px 8px"
				});
				
				var div = domConstruct.create("div", { className: "results-stat" }, this.exposureChartPane.containerNode);
				domConstruct.create("div", {
					className: "results-stat-text",
					innerHTML: 'net <span class="">benefits</span> of <span class="results-strategy"></span> solutions <b>exceed</b> that of <span class="results-strategy-alternative"></span> by'
				}, div);
				
				var div2 = domConstruct.create("div", { className: "results-stat-number-container" }, div);
				this.netBenefits = domConstruct.create("div", {
					id:"results-stat-number-" + this._map.id,
					className: "results-stat-number",
					innerHTML: d3.format("$,.1f")(0) + "M"
				}, div2);
				
				this.chart.position = { 
					height: 200,
					width: 400,
					margin: {
						top: 0, 
						right: 20,
						bottom: 50,
						left: 60
					},
					padding: 0.25
				};
				
				var chartNodeHeight = this.chart.position.height + this.chart.position.margin.top + this.chart.position.margin.bottom;
				this.chart.node = domConstruct.create("div", { 
					"style": "height:" + chartNodeHeight + "px; width:100%; margin-top:0px; margin-bottom: 0px;",
					"class": "enba-chart-" + this._map.id
				});
				this.exposureChartPane.containerNode.appendChild(this.chart.node);
				
				/* this.chart.note = domConstruct.create("div", {
					style: "position:absolute; text-align:center; font-size:12px; width:100%; top:20px; left:0px; color: #666666;",
					innerHTML: "hover over any chart point for more Results"
				});
				this.exposureChartPane.containerNode.appendChild(this.chart.note); */
				
				window.setTimeout(function() {
					self.createExposureResults();
					self.createLineChart();
					
					self.adjustLineForEcosystem(self.chart._filter_value, true);
					self.updateExposureResults();
					
					self.createTooltips();
				}, 2000);
				
				/* //discount rate slider
			    var discountRateSliderLabel = domConstruct.create("div", {innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-climateInfo'></i>&nbsp;<b>Discount Rate: </b>", style:"position:relative; width: 120px; top:-7px; margin: 10px 0px 10px 20px; display: inline-block"});
				this.exposureChartPane.containerNode.appendChild(discountRateSliderLabel);
				this.discountRateSlider = new HorizontalSlider({
			        name: "discountRateSlider",
			        value: 2,
			        minimum: 0,
			        maximum:  this._interface.exposure.controls.slider.discountRate.length-1,
			        discreteValues:  this._interface.exposure.controls.slider.discountRate.length,
			        showButtons: false,
			        style: "width: 315px; display: inline-block; margin:0px 10px 0px 0px; background:none;",
			        onChange: function(value){
					  self.updateLineChart();
					  self.updateExposureResults();
			        }
			    });
			    this.exposureChartPane.containerNode.appendChild(this.discountRateSlider.domNode);

			    var discountRateSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: array.map(this._interface.exposure.controls.slider.discountRate, function(label) { return label + "%"; }),
			    	style: "margin-top: 5px; font-size:14px;"
			    });
			    this.discountRateSlider.addChild(discountRateSliderLabels); */
				
				/* var checkBoxDiv = domConstruct.create("label", { for: "ecosystem-" + self._map.id, className:"styled-checkbox", style:"max-width:350px;position:relative;margin:0px 0px 0px 85px;" }, this.exposureChartPane.containerNode);
				this.ecosystemCheckBox = domConstruct.create("input", { type:"checkbox", value:"ecosystem", name:"ecosystem", id:"ecosystem-" + self._map.id, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { style:"max-width:350px;font-size:16px;", innerHTML: '<span>include benefits from investment in ecosystem services</span>'}, checkBoxDiv);
				on(this.ecosystemCheckBox,"change", function(){
					var _filter_value = self.discountRateSelect.value;
					var checked = this.checked;
					self.adjustLineForEcosystem(_filter_value, this.checked);
					self.updateExposureResults();
				}); */
				
			}
			
			this.createLineChart = function() {
				var hazard = this.hazardSelect.value;
				var climate = this._interface.exposure.controls.slider.climate[this.climateYearSliderDamages.get("value")];
				
				var _data = this.chart.cost_benefit.data.filter(function(d){ return d[self.chart._filter] == self.chart._filter_value && d.climate == climate && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				_data = _nested.reduce(function(a,b){ return a.concat(b.values); },[]);
				
				this.chart.x = d3.scale.ordinal()
					.domain( d3.set(_data.map(function (d) { return d[self.chart._x_key]; })).values() )
					.rangePoints([0, self.chart.position.width], 0.05);
				
				var _axis_data = _.union(_data.map(function(d) { return d[self.chart._y_key]; }), _data.map(function(d) { return d["net_ecosystem"]; }))
				var minY = d3.min(_axis_data);
				var maxY = d3.max(_axis_data);
				var range = Math.abs(maxY-minY);
				this.chart.y = d3.scale.linear()
					.domain([minY-range*0.1, maxY+range*0.15])
					.range([self.chart.position.height, 0]);
					
				var xAxis = d3.svg.axis()
					.scale(self.chart.x)
					.outerTickSize(0)
					.orient("bottom");

				this.chart.yAxis = d3.svg.axis()
					.scale(self.chart.y)
					.ticks(10)
					.tickFormat(d3.format(".0f"))
					.outerTickSize(0)
					.orient("left");
					
				this.chart.plot = d3.select(".enba-chart-" + self._map.id)
					.append("svg")
						.attr("width", self.chart.position.width + self.chart.position.margin.left + self.chart.position.margin.right)
						.attr("height", self.chart.position.height + self.chart.position.margin.top + self.chart.position.margin.bottom)
					.append("g")
						.attr("transform", "translate(" + self.chart.position.margin.left + "," + self.chart.position.margin.top + ")");
					
				this.chart.plot.append("g")
					  .attr("class", "x axis")
					  .attr("transform", "translate(0," + self.chart.position.height + ")")
					  .call(xAxis)
					.append("text")
					  .attr("y", 40)
					  .attr("x", self.chart.position.width/2)
					  .style("text-anchor", "middle")
					  .text("Storm Frequency (years)");
					  /* .on("mouseover", function(){
						var message = self._interface["exposure"]["tooltips"]["chart"]["x-axis"];
						self.showMessageDialog(this, message);
					  })
					  .on("mouseout", function(){
						self.hideMessageDialog();
					  }); */
				
				d3.selectAll(".plugin-enba .x g.tick")
					.attr("class", function(d) { return "tick storm_" + d; })
					.on("click", function(d) {
						self.chart._storm_value = d;
						self.stormSelect.value = d;
						self.updateExposureResults();
					});
					
				d3.selectAll(".plugin-enba .x g.tick")	
					.filter(function(d) { return d == self.chart._storm_value; })
					.select("text")
					.classed("tick_on", true);

				this.chart.plot.append("g")
					  .attr("class", "y axis")
					  .call(self.chart.yAxis)
					.append("text")
					  .attr("transform", "rotate(-90)")
					  .attr("y", 15 - self.chart.position.margin.left)
					  .attr("x", 0-self.chart.position.height/2)
					  .style("text-anchor", "middle")
					  .text("Net Benefits ($ Millions)")
					  .on("mouseover", function(){
						var message = self._interface["exposure"]["tooltips"]["chart"]["y-axis"];
						self.showMessageDialog(this, message, { t:10 });
					  })
					  .on("mouseout", function(){
						self.hideMessageDialog();
					  });
				
				this.chart.line = d3.svg.line()
					.interpolate("linear")
					.x(function (d) { return self.chart.x(d[self.chart._x_key]); })
					.y(function (d) { return self.chart.y(d[self.chart._y_key]); });
					
				this.chart.line_es = d3.svg.line()
					.interpolate("linear")
					.x(function (d) { return self.chart.x(d[self.chart._x_key]); })
					.y(function (d) { return self.chart.y(d.net_ecosystem); });
					
				this.chart.area = d3.svg.area()
					.x(function (d) { return self.chart.x(d[self.chart._x_key]); })
					.y0(function (d) { return self.chart.y(minY); })
					.y1(function (d) { return self.chart.y(d[self.chart._y_key]); });
					
				this.chart.area_es = d3.svg.area()
					.x(function (d) { return self.chart.x(d[self.chart._x_key]); })
					.y0(function (d) { return self.chart.y(minY); })
					.y1(function (d) { return self.chart.y(d.net_ecosystem); });
				
				this.chart.plot.selectAll('g.chart-area')
					.data([ _nested ])
					.enter()
					.append('g')
						.classed('chart-area', true)
						.attr('transform', 'translate(0,0)')
					.selectAll('path.group')
						.data(function (d) { return d; })
						.enter()
						.append('path')
						.attr("class", function (d) { return "group " + d.key; })
						.attr('d', function (d) { return self.chart.line(d.values); })
						
				this.chart.zero = [
					{ "values": [
							{ "benefit": 0, "cost": 0, "net": 0, "net_ecosystem": 0, "ecosystem": 0, "ratio": 1, "discount": 0, "storm": 20 },
							{ "benefit": 0, "cost": 0, "net": 0, "net_ecosystem": 0, "ecosystem": 0, "ratio": 1, "discount": 0, "storm": 50 },
							{ "benefit": 0, "cost": 0, "net": 0, "net_ecosystem": 0, "ecosystem": 0, "ratio": 1, "discount": 0, "storm": 75 },
							{ "benefit": 0, "cost": 0, "net": 0, "net_ecosystem": 0, "ecosystem": 0, "ratio": 1, "discount": 0, "storm": 100 },
							{ "benefit": 0, "cost": 0, "net": 0, "net_ecosystem": 0, "ecosystem": 0, "ratio": 1, "discount": 0, "storm": 200 }
						]
					}
				];
				
				this.chart.plot.select('g.chart-area')
					.append("clipPath")
						.attr("id", "clip")
					.append("rect")
						.attr("id", "clip-rect")
						.attr("x", "0")
						.attr("y", "0")
						.attr('width', self.chart.position.width)
						.attr('height', self.chart.position.height);
				
				this.chart.plot.select('g.chart-area')
					.selectAll('path.line-cb')
					.data(self.chart.zero)
					.enter()
					.append("path")
						.attr("clip-path", "url(#clip)")
						.attr("class", "line-cb")
						.attr('d', function (d) { return self.chart.line(d.values); })
					
				this.chart.plot.select('g.chart-area')
					.selectAll('circle.group')
						.data(_data)
						.enter()
						.append('circle')
						.attr("class", function (d) { return (d.storm == self.chart._storm_value) ? "group " + d.type + " storm_" + d.storm + " on" : "group " + d.type + " storm_" + d.storm; })
						.attr("r", function (d) { return (d.storm == self.chart._storm_value) ? 6 : 4; })
						.attr("cx", function(d) { return self.chart.x(d[self.chart._x_key]) })
						.attr("cy",function(d) {  return self.chart.y(d[self.chart._y_key]) })
						.on('mousemove',function(d) {
							var checked = self.ecosystemCheckBox.checked;
							var format = function(n) {
								var num = d3.format("$,.0f")(Math.abs(n));
								num = (n > 0) ? num + "M": "(" + num + "M)";
								return num;
							}
							
							var netValue = (checked) ? format(d.net + d.ecosystem) : format(d.net);
							var benefitValue = (checked) ? format(d.benefit + d.ecosystem) : format(d.benefit);
							
							var message = netValue + " net" + "<br>" + benefitValue + " gross";
							self.showMessageDialog(this, message);
						})
						.on('mouseout', function(d) {
							self.hideMessageDialog()
						})
						.on('click', function(d) {	
							self.chart._storm_value = d.storm;
							self.stormSelect.value = d.storm;
							self.updateExposureResults();
						});
				
				var legendText = {"NBA": "nature-based", "CCA": "engineering-based"};
				var groups = d3.set(_data.map(function (d) { return d.type; })).values();
 				var legend = this.chart.plot.append("g")
						.attr("class", "enba-legend-container");
				
				legend.append("rect")
					.attr("style", "fill:#ffffff;width:130px;height:40px;opacity:1.0;")
					.attr("x", self.chart.position.width - 120);
				
				legend.selectAll("enba-legend")
					.data(groups)
					.enter()
					.append("g")
						.attr("class", "enba-legend")
						.attr("transform", function(d, i) { return "translate(0," + (0 + (i * 20)) + ")"; })
				
				legend.selectAll("g.enba-legend")
					.data(groups)
					.append("rect")
						.attr("x", self.chart.position.width - 10)
						.attr("class", function(d) { return d; })
						.attr("width", 10)
						.attr("height", 10)
				
				legend.selectAll("g.enba-legend")
					.data(groups)
					.append("text")
						.attr("x", self.chart.position.width - 20)
						.attr("y", 9)
						.attr("dy", 1)
						.style("text-anchor", "end")
						.text(function(d) { return legendText[d]; });
			}
			
			this.updateCurrentStormValue = function(d, strategy) {
				this.chart.plot.selectAll('circle.group')
					.classed("on", false)
					.attr("r", 4);
					
				d3.selectAll(".tick_on")
					.classed("tick_on", false);
					
				d3.selectAll("circle." + strategy + ".storm_" + d)
					//.transition()
					.attr("r", 6)
					.classed("on", true);
					
				d3.select(".tick.storm_" + d)
					.select("text")
					.classed("tick_on", true);
					
				/* this.chart._storm_value = d;
				this.stormSelect.value = d;
				this.updateExposureResults(); */
			}
			
			this.updateLineChart = function() {
				this.chart._filter_value = this.discountRateSelect.value;
				var checked = this.ecosystemCheckBox.checked;
				var hazard = this.hazardSelect.value;
				var climate = this._interface.exposure.controls.slider.climate[this.climateYearSliderDamages.get("value")];
				var _data = this.chart.cost_benefit.data.filter(function(d){ return d[self.chart._filter] == self.chart._filter_value && d.climate == climate && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				_data = _nested.reduce(function(a,b){ return a.concat(b.values); },[]);
				
				var _axis_data = _.union(_data.map(function(d) { return d[self.chart._y_key]; }), _data.map(function(d) { return d["net_ecosystem"]; }))
				var minY = d3.min(_axis_data);
				var maxY = d3.max(_axis_data);
				var range = Math.abs(maxY-minY);
				var fraction = (hazard != "wave" && hazard != "total") ? 0.35 : 0.15;
				
				this.chart.y.domain([minY-range*0.1, maxY+range*fraction]);
				this.chart.plot.select(".y.axis")
					.transition()
					.duration(500)
					.call(this.chart.yAxis);
				
				this.chart.plot.select(".line-cb")
					.data(self.chart.zero)
					.transition()
					.duration(500)
					.attr("d", function(d) { return self.chart.line(d.values) });
					
				this.chart.area = d3.svg.area()
						.x(function (d) { return self.chart.x(d[self.chart._x_key]); })
						.y0(function (d) { return self.chart.y(minY); })
						.y1(function (d) { return self.chart.y(d[self.chart._y_key]); });
						
				this.chart.area_es = d3.svg.area()
					.x(function (d) { return self.chart.x(d[self.chart._x_key]); })
					.y0(function (d) { return self.chart.y(minY); })
					.y1(function (d) { return self.chart.y(d.net_ecosystem); });
				
				this.chart.plot.selectAll('path.group')
					.data(_nested)
					.transition()
					.duration(500)
					.attr('d', function (d) {
						if (checked) {
							return self.chart.line_es(d.values);
							//return self.chart.area_es(d.values);
						} else {
							return self.chart.line(d.values);
							//return self.chart.area(d.values);
						}
					});
					
				this.chart.plot.selectAll('circle.group')
					.data(_data)
					.transition()
					.duration(500)
					.attr("cx", function(d) { return self.chart.x(d[self.chart._x_key]) })
					.attr("cy",function(d) {
						if (checked) {
							return self.chart.y(d.net_ecosystem);
						} else {
							return self.chart.y(d[self.chart._y_key]);
						}
					});
			}
			
			this.adjustLineForEcosystem = function(_filter_value, checked) {
				this.chart._filter_value = _filter_value;
				var hazard = this.hazardSelect.value;
				var climate = this._interface.exposure.controls.slider.climate[this.climateYearSliderDamages.get("value")];
				var _data = this.chart.cost_benefit.data.filter(function(d){ return d[self.chart._filter] == _filter_value && d.type == "NBA" && d.climate == climate && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				_data = _nested.reduce(function(a,b){ return a.concat(b.values); },[]);
				
				this.chart.plot.selectAll('path.group.NBA')
					.data(_nested)
					.transition()
					.duration(500)
					.attr('d', function (d) {
						if (checked) {
							return self.chart.line_es(d.values);
						} else {
							return self.chart.line(d.values);
						}
					});
					
				this.chart.plot.selectAll('circle.group.NBA')
					.data(_data)
					.transition()
					.duration(500)
					.attr("cx", function(d) { return self.chart.x(d[self.chart._x_key]) })
					.attr("cy",function(d) {  
						if (checked) {
							return self.chart.y(d.net_ecosystem);
						} else {
							return self.chart.y(d[self.chart._y_key]);
						}
					})
				this.updateExposureResults();
			}
			
			this.createGroupedChart = function() {
				d3.csv(this.pluginDirectory + "/data/data.csv", function(error, data){
					data.forEach(function(d) { 
						d.ratio = +d.ratio;
						d.storm = +d.storm;
						d.cost = +d.cost;
						d.benefit = +d.benefit;
						d.discount = +d.discount;
						d.discount = +d.net;
					});
					self.chart.data = data;
					
					var groups = ["benefit","cost"];
					
					var _discount_value = 3;
					var _storm_value = 20;
					
					var _data = data.filter(function(d){ return d.storm == _storm_value && d.discount == _discount_value; });
					var _nested = d3.nest().key(function(d) { return d.type; }).entries(_data);
					
					var x0 = d3.scale.ordinal()
						.rangeRoundBands([0, self.chart.position.width], .1);

					var x1 = d3.scale.ordinal();

					var y = d3.scale.linear()
						.range([self.chart.position.height, 0]);

					var color = d3.scale.ordinal()
						.range(["#30928D", "#923034"]);
					
					var xAxisText = {"NBA": "Nature-Based", "CCA": "Coastal Armoring"}
					var xAxis = d3.svg.axis()
						.scale(x0)
						.tickFormat(function(d) { return xAxisText[d]; })
						.orient("bottom")
						.outerTickSize(0);

					var yAxis = d3.svg.axis()
						.scale(y)
						.orient("left")
						.tickFormat(d3.format(".2s"))
						.outerTickSize(0);

					var svg = d3.select(".enba-chart-" + self._map.id)
						.append("svg")
							.attr("width", self.chart.position.width + self.chart.position.margin.left + self.chart.position.margin.right)
							.attr("height", self.chart.position.height + self.chart.position.margin.top + self.chart.position.margin.bottom)
						.append("g")
							.attr("transform", "translate(" + self.chart.position.margin.left + "," + self.chart.position.margin.top + ")");
							
					data.forEach(function(d) {
						d.groups = groups.map(function(name) { return {name: name, value: +d[name]}; });
					});

					x0.domain(d3.set(_data.map(function (d) { return d.type; })).values());
					x1.domain(groups).rangeRoundBands([0, x0.rangeBand()]);
					y.domain([0, d3.max(data, function(d) { return d3.max(d.groups, function(d) { return d.value; })*1.25; })]);

					svg.append("g")
						.attr("class", "x axis")
						.attr("transform", "translate(0," + self.chart.position.height + ")")
						.call(xAxis);

					svg.append("g")
						  .attr("class", "y axis")
						  .call(yAxis)
						.append("text")
						  .attr("transform", "rotate(-90)")
						  .attr("y", -35)
						  .attr("x", 0-self.chart.position.height/2)
						  .style("text-anchor", "middle")
						  .text("Benefits & Costs ($ Millions)");

					var bar = svg.selectAll(".enba-bar")
						.data(data)
						.enter().append("g")
							.attr("class",  function(d) { return "enba-bar " + d.class; })
							.attr("transform", function(d) { return "translate(" + x0(d.type) + ",0)"; });

					bar.selectAll("rect")
						.data(function(d) { return d.groups; })
						.enter().append("rect")
						.attr("width", x1.rangeBand())
							.attr("x", function(d) { return x1(d.name); })
							.attr("y", function(d) { return y(d.value); })
							.attr("height", function(d) { return self.chart.position.height - y(d.value); })
							.style("fill", function(d) { return color(d.name); });

					var legend = svg.selectAll(".enba-legend")
						.data(groups)
						.enter().append("g")
							.attr("class", "enba-legend")
							.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

					legend.append("rect")
						.attr("x", self.chart.position.width - 18)
						.attr("width", 18)
						.attr("height", 18)
						.style("fill", color);
					
					var legendText = {"benefit": "Damage Reduction", "cost": "Costs"}
					legend.append("text")
						.attr("x", self.chart.position.width - 24)
						.attr("y", 9)
						.attr("dy", ".35em")
						.style("text-anchor", "end")
						.text(function(d) { return legendText[d]; });
				});
			}

			this.createTooltips = function() {
				
				on(query("i.fa-question-circle.enba-" + this._map.id), "mousemove", function(evt) {
					var cssClass = _.last(domAttr.get(this, "class").split(" "));
					var tab = _.first(cssClass.split("-"));
					var control = _.last(cssClass.split("-"));
					var message = self._interface[tab]["tooltips"]["info-circle"][control];
					self.showMessageDialog(this, message);
				});
				
				on(query("i.fa-question-circle.enba-" + this._map.id), "mouseout", function() {
					self.hideMessageDialog();
				});
				
				dojo.forEach(_.keys(this._interface["exposure"]["tooltips"]["controls"]["select"]), function(control) {
					on(query("#results-" + control + "-" + self._map.id + " div"), "mouseover", function(){
						var message = self._interface["exposure"]["tooltips"]["controls"]["select"][control];
						self.showMessageDialog(this, message, { t: (domGeom.position(this).h/2) - 5 });
					});
					
					on(query("#results-" + control + "-" + self._map.id + " div"), "mouseout", function(){
						self.hideMessageDialog();
					});
				});
				
				dojo.forEach(_.keys(this._interface["exposure"]["tooltips"]["controls"]["checkbox"]), function(control) {
					on(query("#" + control + "-" + self._map.id + " ~ div"), "mouseover", function(){
						var message = self._interface["exposure"]["tooltips"]["controls"]["checkbox"][control];
						self.showMessageDialog(this, message, {l:7});
					});
					
					on(query("#" + control + "-" + self._map.id + " ~ div"), "mouseout", function(){
						self.hideMessageDialog();
					});
				});
				
				dojo.forEach(_.keys(this._interface["exposure"]["tooltips"]["results"]), function(item) {
					on(query("#results-" + item + "-" + self._map.id), "mouseover", function(){
						var message = self._interface["exposure"]["tooltips"]["results"][item];
						self.showMessageDialog(this, message, { t:5 });
					});
					
					on(query("#results-" + item + "-" + self._map.id), "mouseout", function(){
						self.hideMessageDialog();
					});
				});
				
				/* array.forEach(this.tc.tablist.getChildren(), function(node) {
					var keys = _.keys(self._interface);
					for (var i = 0; i < keys.length; i++) {
						var index = node.id.toLowerCase().indexOf(keys[i]);
						if (index >=0) {
							on(node.domNode, "mouseover", function() {
								var message = self._interface[keys[i]]['tooltips']['tab'];
								var parent = self.tc.tablist.id;
								self.showMessageDialog(parent, message.label, message.value);
							})
							on(node.domNode, "mouseout", function() {
								self.hideMessageDialog();;
							})
							break;
						}
					}
				}); */
			}
			
			this.formatter = function(value,n) {
				return Math.round(value/n);
			}
			
			this.getTemplate = function(name) {
                var template = _.template($.trim(this._$templates.find('#' + name).html()));
                return template;
            }

			this.showMessageDialog = function(node, message, position) {
				self.tip.innerHTML = message;
				domStyle.set(self.tip, { "display": "block" });
				
				var p = domGeom.position(win.body());
				var n = domGeom.position(node);
				var t = domGeom.getMarginBox(self.tip);
				
				var left = n.x - p.x - t.w/2 + n.w/2;
				var top = n.y - p.y - t.h - n.h/2;
				
				left = (position && position.l) ? n.x - p.x - t.w/2 + position.l : left;
				top = (position && position.t) ? n.y - p.y - t.h - position.t : top;
				
				domStyle.set(self.tip, {
					"left": left + "px",
					"top": top + "px"
				});
            }

            this.hideMessageDialog = function() {
        		domStyle.set(self.tip, { "display": "none" });
			}


		};// End enbaTool

		
		return enbaTool;	
		
	} //end anonymous function

); //End define
