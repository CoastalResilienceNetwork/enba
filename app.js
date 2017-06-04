
define([
	    "dojo/_base/declare",
		"d3",
		"use!underscore",		
	    "dojo/json", 
		"dojo/parser",
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
		"dojo/_base/fx",
		"dojo/fx",
		"dojox/fx",
		"dijit/registry",
		"dijit/layout/ContentPane",
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
			parser,
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
			fx,
			coreFx,
			xFx,
			registry,
			ContentPane,
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
			this._extent = {
				"xmin": 0,
				"ymin": 0,
				"xmax": 0,
				"ymax": 0,
				"spatialReference": {
					"wkid": 102100,
					"latestWkid": 3857
				}
			};
			this._region = "";
			this._data = JSON.parse(appData);
			this._interface = JSON.parse(enbaConfig);
			this._$templates = $('<div>').append($($.trim(templates)))
			
			var self = this;
			this.parameters = {};
			this.pluginDirectory = plugin.pluginDirectory;
			this.utilities = {};
			
			this.initialize = function(){
				this.parameters.layersLoaded = false;
				
				this._extent.xmin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmin; }));
				this._extent.ymin = _.min(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymin; }));
				this._extent.xmax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.xmax; }));
				this._extent.ymax = _.max(dojo.map(_.keys(this._interface.region), function(region) { return self._interface.region[region].extent.ymax; }));
				
				this.chart = {};
				this.chart.cost_benefit = {};
				this.chart.cost_benefit.data = {};
				
				d3.csv(this.pluginDirectory + "/data/cost_benefit_default.csv", function(error, data){
					data.forEach(function(d) { 
						d.storm = +d.storm;
						d.discount = +d.discount;
						d.net = +d.net;
						d.net_ecosystem = +d.net_ecosystem;
						d.ecosystem = +d.ecosystem;
					});
					self.chart.cost_benefit.data.default = data;
				});
				
				array.forEach(_.keys(this._interface.region), function(item) {
					d3.csv(self.pluginDirectory + "/data/cost_benefit_" + item.toLowerCase() + ".csv", function(error, data){
						data.forEach(function(d) { 
							d.storm = +d.storm;
							d.discount = +d.discount;
							d.net = +d.net;
							d.net_ecosystem = +d.net_ecosystem;
							d.ecosystem = +d.ecosystem;
						});
						self.chart.cost_benefit.data[item] = data;
					});
				});
				
				this.chart._filter = "discount";
				this.chart._filter_value = 3;
				this.chart._storm_value = 100;
				this.chart._x_key = "storm";
				this.chart._y_key = "net";
				
				domStyle.set(this._container, {
					"padding": "0px"
				});
				
				var node = _.first(query("#" + this._container.parentNode.id + " .sidebar-nav"));
				this.infoGraphicButton = domConstruct.create("button", {
					class: "button button-default plugin-slr info-graphic",
					style: "display:none",
					innerHTML: '<img src="' + this._plugin_directory + '/InfographicIcon_v1_23x23.png" alt="show overview graphic">'
				}, node, "first")
				
				if (_.has(this._interface, "infoGraphic")) {
					domAttr.set(this.infoGraphicButton, "data-popup", JSON.stringify(this._interface.infoGraphic.popup));
					domAttr.set(this.infoGraphicButton, "data-url", this._interface.infoGraphic.url);
					
					var display = (this._interface.infoGraphic.show) ? "block" : "none";
					domStyle.set(this.infoGraphicButton, "display", display);
				}
				
				on(this.infoGraphicButton, "mouseover", function(){
					self.showMessageDialog(this, "Learn more");
				})
				
				on(this.infoGraphicButton, "mouseout", function(){
					self.hideMessageDialog();
				})
				
				var plugin = this;
				on(this.infoGraphicButton, "click", function(c){
					var popup = JSON.parse(domAttr.get(this, "data-popup"));
					var url = domAttr.get(this, "data-url");
					if (popup) {
						var html = url.replace("PLUGIN-DIRECTORY", plugin._plugin_directory);
						TINY.box.show({
							animate: true,
							html: html,
							fixed: true,
							width: 640,
							height: 450
						});
					} else {
						window.open(url, "_blank");
					}
					
				})
				
				var loadingDiv = domConstruct.create("div", {
					innerHTML:"<i class='fa fa-spinner fa-spin fa-3x fa-fw'></i>",
					style:"position:absolute; left: 50%; top:50%; -webkit-transform: translateX(-50%); transform: translateX(-50%); width:100px; height:100px; line-height:100px; text-align:center;"
				}, this._container);
				
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

			this.initializeMap = function(){
				//initialize an empty dynamic map service layer
			    var mapUrl = this._interface.service;
				
				this.mapLayer = new DynamicMapServiceLayer(this._data.url, { id:"enbamapLayer" });
				this._map.addLayer(this.mapLayer);
				this.mapLayer.hide();
				this.mapLayer.setVisibleLayers([]);
				
				var extent = new Extent(this._extent);
				this._map.setExtent(extent, false);
				this.parameters.layersLoaded = true;
			}
			
			this.updateMapLayers = function(visibleLayers, mapLayer) {
				mapLayer.setVisibleLayers(visibleLayers);
				mapLayer.show();
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
				
				this.tip = domConstruct.create("div", { className: "enba-tooltip interface tooltip-top" });
				win.body().appendChild(this.tip);
				
				domStyle.set(_.first(query(".plugin-enba .fa-spinner")).parentNode, "display", "none");
				
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
				
				var table = domConstruct.create("table", { style:"position:relative;width: 100%;background: none;border: none; margin:0px 0px 20px 0px;"}, this.exposureInputsPane.containerNode);
				var tr = domConstruct.create("tr", {}, table);
				var regionTd = domConstruct.create("td", { "colspan":3, "style": "padding-bottom:10px;" }, tr);
				
				var regionText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;text-align:left;",
					innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-region'></i>&nbsp;<b>Select a Region:</b>"
				}, regionTd);
				
				var regionSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:150px;display:inline-block;" 
				}, regionTd);
				this.regionSelect = dojo.create("select", { name: "regionType"}, regionSelectDiv);
				if (_.keys(this._interface.region).length > 1) {
					domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.regionSelect);
				}
				array.forEach(_.keys(this._interface.region), function(item) {
					domConstruct.create("option", { innerHTML: item, value: item }, self.regionSelect);
				});
				on(this.regionSelect, "change", function() {
					self._region = this.value;
					self.updateInterface("region");
				});
				this.regionSelect.value = _.first(this.regionSelect.options).value;
				this._region = this.regionSelect.value;
				
				this.downloadReport = domConstruct.create("div", { className:"downloadButton enba-report", innerHTML:'<i class="fa fa-file-pdf-o downloadIcon"></i><span class="downloadText">Download Technical Report</span>' }, regionTd);
				on(this.downloadReport,"mouseover", function(){
					if (self._region && self._region != "") {
						domStyle.set(this, "background", "#0096d6");
					}
				});
				on(this.downloadReport,"mouseout", function(){
					if (self._region && self._region != "") {
						 domStyle.set(this, "background", "#2B2E3B");
					}
				});
				on(this.downloadReport,"click", function(){
					 if (self._region && self._region != "") {
						var url = self._interface.region[self._region].download.report;
						url = url.replace("HOSTNAME-", window.location.href);
						window.open(url, "_blank");
					 }
				});
				
				var tr = domConstruct.create("tr", {}, table);
				var managementTd = domConstruct.create("td", { style:"position:relative;width:33%; text-align:left;"}, tr);
				var hazardTd = domConstruct.create("td", { style:"position:relative;width:33%; text-align:center;"}, tr);
				var damageTd = domConstruct.create("td", { style:"position:relative;width:33%; text-align:center;"}, tr);
				
				// management controls
				var managementTypeText = domConstruct.create("div", {
					style:"position:relative;margin-bottom:5px;",
					innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-management'></i>&nbsp;<b><span class='control-text'>Adaptation Strategy</span>:</b>"
				}, managementTd);
				
				var managementTypeSelectDiv = domConstruct.create("div", { 
					className: "styled-select",
					style:"width:150px;display:inline-block;" 
				}, managementTd);
				this.managementTypeSelect = dojo.create("select", { name: "managementType"}, managementTypeSelectDiv);
				domConstruct.create("option", { innerHTML: " -- ", value: "" }, this.managementTypeSelect);
				dojo.forEach(this._interface.controls.select.management.options, function(item) {
					dojo.create("option", { innerHTML: item.name, value: item.value }, self.managementTypeSelect);
				});
				on(this.managementTypeSelect, "change", function() {
					var management = this.value;
					var hazard = self.hazardSelect.value;
					var damage = self.damageSelect.value;
					var climate = self._interface.region[self._region].controls.slider.climate.labels[self.climateSlider.get("value")];
					
					if (self.managementLayerCheckBox.checked) {
						var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.flatten(_.values(self._data.layers.management)));
						if (management != "") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.management[this.value]);
							domAttr.set(self.managementLayerCheckBox, "disabled", false);
						} else {
							domAttr.set(self.managementLayerCheckBox, "disabled", true);
						}
						self.updateMapLayers(visibleLayers, self.mapLayer);
					}
					
					if (self.hazardLayerCheckBox.checked) {
						var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.hazard["all-layer-index"][0], self._data.layers.hazard["all-layer-index"][1]+1));
						if (management != "" && hazard != "total") {
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
				
				var checkBoxDiv = domConstruct.create("label", { for: "management-layer-" + self._map.id, className:"styled-checkbox", style:"display:inline-block;margin-left: 20px;" }, managementTd);
				this.managementLayerCheckBox = domConstruct.create("input", { type:"checkbox", value:"management", name:"management-layer", id:"management-layer-" + self._map.id, disabled:true, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { innerHTML: '<span>view map layer</span>'}, checkBoxDiv);
				on(self.managementLayerCheckBox, "change", function(){
					var management = self.managementTypeSelect.value;
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers[this.value]["all-layer-index"][0], self._data.layers[this.value]["all-layer-index"][1]+1));
					if (this.checked) {
						if (management != "") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.management[management]);
						}
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
				});
				
				// hazard controls
				var hazardText = domConstruct.create("div", {style: "position:relative;margin-bottom:5px;", innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-hazard'></i>&nbsp;<b><span class='control-text'>Hazard</span>:</b>"}, hazardTd);
				
				var hazardSelectDiv = domConstruct.create("div", { className: "styled-select", style:"width:110px;display:inline-block;" }, hazardTd);
				this.hazardSelect = dojo.create("select", { name: "hazard", "disabled": false }, hazardSelectDiv);
				domConstruct.create("option", { innerHTML: " -- ", value: "total" }, this.hazardSelect);
				on(this.hazardSelect, "change", function() { 
					var management = self.managementTypeSelect.value;
					var hazard = this.value;
					var damage = self.damageSelect.value;
					var climate = self._interface.region[self._region].controls.slider.climate.labels[self.climateSlider.get("value")];
					
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
					self.updateLineChart2();
					self.updateExposureResults2();
					
				});
				
				var checkBoxDiv = domConstruct.create("label", { for: "hazard-layer-" + self._map.id, className:"styled-checkbox", style:"display:inline-block;" }, hazardTd);
				this.hazardLayerCheckBox = domConstruct.create("input", { type:"checkbox", value:"hazard", name:"hazard-layer", id:"hazard-layer-" + self._map.id, disabled:true, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { innerHTML: '<span>view map layer</span>'}, checkBoxDiv);
				on(self.hazardLayerCheckBox, "change", function(){
					var management = self.managementTypeSelect.value;
					var hazard = self.hazardSelect.value;
					var climate = self._interface.region[self._region].controls.slider.climate.labels[self.climateSlider.get("value")];
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers[this.value]["all-layer-index"][0], self._data.layers[this.value]["all-layer-index"][1]+1));
					if (this.checked) {
						if (management != "" && hazard != "total") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.hazard[management][hazard][climate]);
						}
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
				});
				
				// damage controls
				var damageEstimateText = domConstruct.create("div", {style: "position:relative;margin-bottom:5px;", innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-damage'></i>&nbsp;<b><span class='control-text'>Damage (Estimate)</span>:</b>"}, damageTd);
				
				var damageSelectDiv = domConstruct.create("div", { className: "styled-select", style:"width:130px;display:inline-block;" }, damageTd);
				this.damageSelect = dojo.create("select", { name: "damage"}, damageSelectDiv);
				domConstruct.create("option", { innerHTML: " -- ", value: "total" }, this.damageSelect);
				on(this.damageSelect, "change", function() { 
					var management = self.managementTypeSelect.value;
					var hazard = self.hazardSelect.value;
					var damage = this.value;
					var climate = self._interface.region[self._region].controls.slider.climate.labels[self.climateSlider.get("value")];
					
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
					var climate = self._interface.region[self._region].controls.slider.climate.labels[self.climateSlider.get("value")];
					
					var visibleLayers = _.difference(self.mapLayer.visibleLayers, _.range(self._data.layers.damage["all-layer-index"][0], self._data.layers.damage["all-layer-index"][1]+1));
					if (this.checked) {
						if (hazard != "total" && damage != "total") {
							var visibleLayers = _.union(visibleLayers, self._data.layers.damage[damage][management][hazard][climate]);
						}
					}
					self.updateMapLayers(visibleLayers, self.mapLayer);
				});
				
				//climate year slider
			    var climateSliderLabel = domConstruct.create("div", {innerHTML: "<i class='fa fa-question-circle enba-" + this._map.id + " exposure-climate'></i>&nbsp;<b>Climate Year: </b>", style:"position:relative; width:100px; top:-10px; display:inline-block; margin-left:6px;"});
				this.exposureInputsPane.containerNode.appendChild(climateSliderLabel);
				this.climateSlider = new HorizontalSlider({
			        name: "climateYearSlider",
			        value: this._interface.controls.slider.climate.length-1,
			        minimum: 0,
			        maximum: this._interface.controls.slider.climate.length-1,
			        discreteValues: this._interface.controls.slider.climate.length,
			        showButtons: false,
					disabled: true,
			        style: "width:340px; display:inline-block; margin:0px 0px 0px 10px; background:none;",
			        onChange: function(value){
						var management = self.managementTypeSelect.value;
						var hazard = self.hazardSelect.value;
						var damage = self.damageSelect.value;
						var climate = self._interface.controls.slider.climate[self.climateSlider.get("value")];
						
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
						self.updateLineChart2();
						self.updateExposureResults2();
			        }
			    });
			    this.exposureInputsPane.containerNode.appendChild(this.climateSlider.domNode);

			    this.climateSliderLabels = new HorizontalRuleLabels({
			    	container: 'bottomDecoration',
			    	count: 0,
			    	labels: this._interface.controls.slider.climate.labels,
			    	style: "margin-top: 5px;"
			    });
			    this.climateSlider.addChild(this.climateSliderLabels);
				
				var opacity = domConstruct.create("div", {
					className: "utility-control",
					innerHTML: '<span class="enba-' + this._map.id + '-opacity"><b>Opacity</b>&nbsp;<i class="fa fa-adjust"></i></span>'
				}, this.exposureInputsPane.containerNode);
				
				on(opacity,"click", function() {
					var status = domStyle.get(self.opacityContainer, "display");
					var display = (status == "none") ? "block" : "none";
					domStyle.set(self.opacityContainer, "display", display);
				})
				
				this.opacityContainer = domConstruct.create("div", {
					className: "utility"
				}, this.exposureInputsPane.containerNode);
				
				//opacity slider
				this.opacitySlider = new HorizontalSlider({
			        name: "opacitySlider",
			        value: 1,
			        minimum: 0,
			        maximum: 1,
			        intermediateChanges: true,
			        showButtons: false,
					disabled: true,
			        style: "width:75px; display:inline-block; margin:0px; background:none;",
			        onChange: function(value){
						self.mapLayer.setOpacity(Math.abs(value));
			        }
			    });
				this.opacityContainer.appendChild(this.opacitySlider.domNode);
				
			}
			
			this.createExposureChart = function(){
				this.exposureChartPane = new ContentPane({});
				this.cpExposure.domNode.appendChild(this.exposureChartPane.domNode);
				domStyle.set(this.exposureChartPane.containerNode, {
					"position": "relative",
					"overflow": "visible",
					"padding": "0px 8px 0px 8px",
					"display":"none"
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
				
				window.setTimeout(function() {
					self.createExposureResults();
					self.createLineChart2();
					
					if (self._region != "" || !self._plugin._firstLoad) {
						self.adjustLineForEcosystem2(self.chart._filter_value, true);
						self.updateExposureResults2();
					}
					
					self.createTooltips();
				}, 2000);
				
			}
			
			this.createExposureResults = function(){
				this.exposureMessagePane = new ContentPane();
				dojo.place(this.exposureMessagePane.domNode, this.cpExposure.domNode);
				domStyle.set(this.exposureMessagePane.containerNode, {
					"position": "relative",
					"padding": "0px 8px 0px 8px",
					"overflow": "visible",
					"margin-top": "15px",
					"display":"none"
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
				dojo.forEach(this._interface.controls.select.discount.options, function(item) {
					var selected = (item.value == self.chart._filter_value) ? true : false;
					dojo.create("option", { innerHTML: item.name, value: item.value, selected: "selected"  }, self.discountRateSelect);
				});
				on(this.discountRateSelect, "change", function() {
					self.updateLineChart2();
					self.updateExposureResults2();
				});
				
				var stormSelectDiv = domConstruct.create("div",{
					className: "styled-select results-select",
					style:"width: 80px;"
				}, dom.byId("results-storm-" + this._map.id));
				this.stormSelect = dojo.create("select", { name: "discount"}, stormSelectDiv);
				dojo.forEach(this._interface.controls.select.storm.options, function(item) {
					dojo.create("option", { innerHTML: item.name, value: item.value, selected: "selected" }, self.stormSelect);
				});
				on(this.stormSelect, "change", function() {
					self.updateCurrentStormValue2(this.value);
					self.chart._storm_value = this.value;
					self.updateExposureResults2();
				});
				
				this.chart._filter_value = this.discountRateSelect.value;
				this.chart._storm_value = this.stormSelect.value;
								
				var checkBoxDiv = domConstruct.create("label", { for: "ecosystem-" + self._map.id, className:"styled-checkbox ecosystem-checkbox", style:"max-width:400px;position:relative;margin:0px 0px 0px 55px;" }, this.exposureMessagePane.containerNode);
				this.ecosystemCheckBox = domConstruct.create("input", { type:"checkbox", value:"ecosystem", name:"ecosystem", id:"ecosystem-" + self._map.id, checked:true }, checkBoxDiv);
				var checkBoxLabel = domConstruct.create("div", { style:"max-width:400px;", innerHTML: '<span>include benefits from investment in ecosystem services</span>'}, checkBoxDiv);
				on(this.ecosystemCheckBox,"change", function(){
					var _filter_value = self.discountRateSelect.value;
					var checked = this.checked;
					self.adjustLineForEcosystem2(_filter_value, this.checked);
					self.updateExposureResults2();
				});
			}
			
			this.createLineChart = function() {
				var hazard = this.hazardSelect.value;
				var climate = this._interface.controls.slider.climate[this.climateSlider.get("value")];
				var _storm_value = this.chart._storm_value; 
				
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
						var message = self._interface["tooltips"]["chart"]["x-axis"];
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
						var message = self._interface["tooltips"]["chart"]["y-axis"];
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
				
				var legendText = {"NBA": "nature-based", "CCA": "armoring-based"};
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
						
			this.updateExposureResults = function() {
				var _storm_value = this.chart._storm_value; 
				var _filter_value = this.discountRateSelect.value;
				var hazard = this.hazardSelect.value;
				var ecosystem = this.ecosystemCheckBox.checked;
				var climate = this._interface.controls.slider.climate[this.climateSlider.get("value")];
				
				var _data = this.chart.cost_benefit.data.filter(function(d){ return d[self.chart._filter] == _filter_value && d.climate == climate && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				
				var _cca = _.first(array.filter(_nested[0].values, function(d) { return d.storm == self.chart._storm_value; }));
				var _nba = _.first(array.filter(_nested[1].values, function(d) { return d.storm == self.chart._storm_value; }));
				var diff = (ecosystem) ? _cca.net - (_nba.net + _nba.ecosystem) : _cca.net - _nba.net;
				
				var strategy_text = {"CCA": "armored", "NBA": "natural" }
				var strategy = (diff > 0) ? "CCA" : "NBA";
				var strategy_alternative = (strategy == "CCA") ? "NBA" : "CCA";
				
				_.first(query("#" + "plugin-enba-" + this._map.id + " .results-strategy")).innerHTML = strategy_text[strategy];
				_.first(query("#" + "plugin-enba-" + this._map.id + " .results-strategy-alternative")).innerHTML = strategy_text[strategy_alternative];
				this.netBenefits.innerHTML = d3.format("$,.1f")(Math.abs(diff)) + "M";
				
				var color = (diff > 0) ? "#923034" : "#30928D";
				query("#" + "plugin-enba-" + this._map.id + " .results-stat").style("color", color);
				
				this.updateCurrentStormValue(_storm_value, strategy);
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
				var climate = this._interface.controls.slider.climate[this.climateSlider.get("value")];
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
				var climate = this._interface.controls.slider.climate[this.climateSlider.get("value")];
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
			
			//updates to switch graph results to net benefits vs climate year from benefits vs storm frequency
			this.updateExposureResults2 = function() {
				var discount = this.discountRateSelect.value;
				var hazard = this.hazardSelect.value;
				var ecosystem = this.ecosystemCheckBox.checked;
				var climate = (this._region != "") ? this._interface.region[this._region].controls.slider.climate.labels[this.climateSlider.get("value")] : this._interface.controls.slider.climate.labels[this.climateSlider.get("value")];
				var storm = this.stormSelect.value;
				
				var r = (this.regionSelect.value == "") ? "default" : this.regionSelect.value;
				var _data = this.chart.cost_benefit.data[r].filter(function(d){ return d.discount == discount && d.storm == storm && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
							
				var _cca = _.first(array.filter(_nested[0].values, function(d) { return d.climate == climate; }));
				var _nba = _.first(array.filter(_nested[1].values, function(d) { return d.climate == climate; }));
				var diff = (ecosystem) ? _cca.net - (_nba.net + _nba.ecosystem) : _cca.net - _nba.net;
				
				var strategy_text = {"CCA": "armored", "NBA": "natural" }
				var strategy = (diff > 0) ? "CCA" : "NBA";
				var strategy_alternative = (strategy == "CCA") ? "NBA" : "CCA";
				
				_.first(query("#" + "plugin-enba-" + this._map.id + " .results-strategy")).innerHTML = strategy_text[strategy];
				_.first(query("#" + "plugin-enba-" + this._map.id + " .results-strategy-alternative")).innerHTML = strategy_text[strategy_alternative];
				
				var value = (Math.abs(diff) > 1000) ? d3.format("$,.2f")(Math.abs(diff/1000)) + "B" : d3.format("$,.1f")(Math.abs(diff)) + "M";
				this.netBenefits.innerHTML = value;
				
				var color = (diff > 0) ? "#923034" : "#30928D";
				query("#" + "plugin-enba-" + this._map.id + " .results-stat").style("color", color);
				
				var transition = false;
				if (query("circle.on").length > 0) {
					var prevClimate = _.first(_.last(domAttr.get(_.first(query("circle.on")), "class").baseVal.split("climate_")).split(" "));
					transition = (prevClimate == climate) ? true : false;
					
				} 
				this.updateCurrentClimateValue(climate, strategy, transition);
			}
			
			this.createLineChart2 = function() {
				var discount = this.discountRateSelect.value;
				var hazard = this.hazardSelect.value;
				var climate = (this._region != "") ? this._interface.region[this._region].controls.slider.climate.labels[this.climateSlider.get("value")] : this._interface.controls.slider.climate.labels[this.climateSlider.get("value")];
				var storm = this.stormSelect.value;
				
				var r = (this._region == "") ? "default" : this._region;
				var _data = this.chart.cost_benefit.data[r].filter(function(d){ return d.discount == discount && d.storm == storm && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				_data = _nested.reduce(function(a,b){ return a.concat(b.values); },[]);
				
				this.chart.x = d3.scale.ordinal()
					//.domain( d3.set(_data.map(function (d) { return d.climate; })).values() )
					.domain(self._interface.controls.slider.climate.labels)
					.rangePoints([0, self.chart.position.width], 0.05);
				
				var _axis_data = _.union(_data.map(function(d) { return d[self.chart._y_key]; }), _data.map(function(d) { return d["net_ecosystem"]; }))
				var minY = d3.min(_axis_data);
				var maxY = d3.max(_axis_data);
				var range = Math.abs(maxY-minY);
				this.chart.y = d3.scale.linear()
					.domain([minY-range*0.1, maxY+range*0.15])
					.range([self.chart.position.height, 0]);	
				//this.chart.ymin = minY-range*0.1;
					
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
					/* .append("text")
					  .attr("y", 25)
					  .attr("x", self.chart.position.width/2)
					  .style("text-anchor", "middle")
					  .text("Year"); */
				
				d3.selectAll(".plugin-enba .x g.tick")
					.attr("class", function(d) { return "tick climate_" + d; })
					.on("click", function(d) {
						self.climateSlider.set("value", _.indexOf(self._interface.region[self._region].controls.slider.climate.labels, d));
						self.updateExposureResults2();
					});
					
				d3.selectAll(".plugin-enba .x g.tick")	
					.filter(function(d) { return d == climate; })
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
						var message = self._interface["tooltips"]["chart"]["y-axis"].message;
						var orientation = self._interface["tooltips"]["chart"]["y-axis"].orientation;
						self.showMessageDialog(this, message, { t:70 }, orientation);
					  })
					  .on("mouseout", function(){
						self.hideMessageDialog();
					  });
				
				this.chart.line = d3.svg.line()
					.interpolate("linear")
					.x(function (d) { return self.chart.x(d["climate"]); })
					.y(function (d) { return self.chart.y(d[self.chart._y_key]); });
					
				this.chart.line_es = d3.svg.line()
					.interpolate("linear")
					.x(function (d) { return self.chart.x(d["climate"]); })
					.y(function (d) { return self.chart.y(d.net_ecosystem); });
					
				this.chart.area = d3.svg.area()
					.x(function (d) { return self.chart.x(d["climate"]); })
					.y0(function (d) { return self.chart.y(minY); })
					.y1(function (d) { return self.chart.y(d[self.chart._y_key]); });
					
				this.chart.area_es = d3.svg.area()
					.x(function (d) { return self.chart.x(d["climate"]); })
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
							{ "net": 0, "net_ecosystem": 0, "climate": "Current" },
							{ "net": 0, "net_ecosystem": 0, "climate": "2030" },
							{ "net": 0, "net_ecosystem": 0, "climate": "2060" },
							{ "net": 0, "net_ecosystem": 0, "climate": "2100" }
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
					.append("line")
					.attr("class", "line-highlight")
					.attr("x1",self.chart.x(2100)).attr("x2",self.chart.x(2100))
					.attr("y1", self.chart.y(-600)).attr("y2", self.chart.y(0));
					
				this.chart.plot.select('g.chart-area')
					.selectAll('circle.group')
						.data(_data)
						.enter()
						.append('circle')
						.attr("class", function (d) { return (d.climate == climate) ? "group " + d.type + " climate_" + d.climate + " on" : "group " + d.type + " climate_" + d.climate; })
						.attr("r", function (d) { return (d.climate == climate) ? 6 : 4; })
						.attr("cx", function(d) { return self.chart.x(d["climate"]) })
						.attr("cy",function(d) {  return self.chart.y(d[self.chart._y_key]) })
						.on('mousemove',function(d) {
							var checked = self.ecosystemCheckBox.checked;
							var format = function(n) {
								//var value = (Math.abs(n) > 1000) ? d3.format("$,.0f")(Math.abs(n/1000)) + "B" : d3.format("$,.0f")(Math.abs(n)) + "M";
								var num = d3.format("$,.0f")(Math.abs(n));
								num = (n > 0) ? num + "M": "(" + num + "M)";
								return num;
							}
							
							var netValue = (checked) ? format(d.net + d.ecosystem) : format(d.net);
							
							var message = netValue + " net";
							self.showMessageDialog(this, message);
						})
						.on('mouseout', function(d) {
							self.hideMessageDialog()
						})
						.on('click', function(d) {	
							self.climateSlider.set("value", _.indexOf(self._interface.region[self._region].controls.slider.climate.labels, d.climate));
							self.updateExposureResults2();
						});
				
				/* var legendText = {"NBA": "nature-based", "CCA": "armoring-based"};
				var groups = d3.set(_data.map(function (d) { return d.type; })).values();
 				var legend = this.chart.plot.append("g")
						.attr("class", "enba-legend-container");
				
				legend.append("rect")
					.attr("style", "fill:#ffffff;width:125px;height:40px;opacity:1.0;")
					.attr("x", self.chart.position.width - 110)
					.attr("y", self.chart.position.height - 40);
					//.attr("x", 5);
				
				legend.selectAll("enba-legend")
					.data(groups)
					.enter()
					.append("g")
						.attr("class", "enba-legend")
						.attr("transform", function(d, i) { return "translate(0," + ( (self.chart.position.height - 40) + (i * 20)) + ")"; })
				
				legend.selectAll("g.enba-legend")
					.data(groups)
					.append("rect")
						.attr("x", self.chart.position.width)
						.attr("class", function(d) { return d; })
						.attr("width", 10)
						.attr("height", 10)
				
				legend.selectAll("g.enba-legend")
					.data(groups)
					.append("text")
						.attr("x", self.chart.position.width - 10)
						.attr("y", 9)
						.attr("dy", 1)
						.style("text-anchor", "end")
						.text(function(d) { return legendText[d]; }); */
						
				var legendDiv = domConstruct.create("div", {
					class:"legend-div",
					style: ""
				}, this.chart.node);
				
				var cca = domConstruct.create("div", {
					class:"legend-item",
					style:"margin-right:20px;",
					innerHTML: "<div class='legend-icon CCA'></div><div class='legend-text'>armoring-based</div>"
				}, legendDiv);
				on(cca, "mouseover", function(){
					var message = self._interface["tooltips"]["chart"]["legend-cca"].message;
					var orientation = self._interface["tooltips"]["chart"]["legend-cca"].orientation;
					self.showMessageDialog(this, message, {}, orientation);
				  })
				on(cca, "mouseout", function(){
					self.hideMessageDialog();
				});
				
				var nba = domConstruct.create("div", {
					class:"legend-item",
					style:"",
					innerHTML: "<div class='legend-icon NBA'></div><div class='legend-text'>nature-based</div>"
				}, legendDiv);
				on(nba, "mouseover", function(){
					var message = self._interface["tooltips"]["chart"]["legend-nba"].message;
					var orientation = self._interface["tooltips"]["chart"]["legend-nba"].orientation;
					self.showMessageDialog(this, message, {}, orientation);
				  })
				on(nba, "mouseout", function(){
					self.hideMessageDialog();
				});
				
				this.chart.legendHighlight = domConstruct.create("div", {
					class:"legend-highlight-div",
					innerHTML: "2100"
				}, this.chart.node);
				
			}
			
			this.updateLineChart2 = function() {
				this.chart._filter_value = this.discountRateSelect.value;
				var checked = this.ecosystemCheckBox.checked;
				var hazard = this.hazardSelect.value;
				var labels = (this._region != "") ? this._interface.region[this._region].controls.slider.climate.labels : this._interface.controls.slider.climate.labels;
				var climate = labels[this.climateSlider.get("value")]
				var storm = this.stormSelect.value;
				
				var r = (this._region == "") ? "default" : this._region;
				var _data = this.chart.cost_benefit.data[r].filter(function(d){ return d[self.chart._filter] == self.chart._filter_value && d.storm == storm && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				_data = _nested.reduce(function(a,b){ return a.concat(b.values); },[]);
				
				this.chart.x = d3.scale.ordinal()
					.domain(labels)
					.rangePoints([0, self.chart.position.width], 0.05);
				
				var _axis_data = _.union(_data.map(function(d) { return d[self.chart._y_key]; }), _data.map(function(d) { return d["net_ecosystem"]; }))
				var minY = d3.min(_axis_data);
				var maxY = d3.max(_axis_data);
				var range = Math.abs(maxY-minY);
				var fraction = (hazard != "wave" && hazard != "total") ? 0.35 : 0.15;
				
				this.chart.y.domain([minY-range*0.1, maxY+range*fraction]);
				//this.chart.ymin = minY-range*0.1;
				
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
					.x(function (d) { return self.chart.x(d.climate); })
					.y0(function (d) { return self.chart.y(minY); })
					.y1(function (d) { return self.chart.y(d[self.chart._y_key]); });
						
				this.chart.area_es = d3.svg.area()
					.x(function (d) { return self.chart.x(d["climate"]); })
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
					.attr("cx", function(d) { return self.chart.x(d["climate"]) })
					.attr("cy",function(d) {
						if (checked) {
							return self.chart.y(d.net_ecosystem);
						} else {
							return self.chart.y(d[self.chart._y_key]);
						}
					});
			}
			
			this.adjustLineForEcosystem2 = function(_filter_value, checked) {
				var hazard = this.hazardSelect.value;
				var climate = (this._region != "") ? this._interface.region[this._region].controls.slider.climate.labels[this.climateSlider.get("value")] : this._interface.controls.slider.climate.labels[this.climateSlider.get("value")];
				var storm = this.stormSelect.value;
				
				var r = (this._region == "") ? "default" : this._region;
				var _data = this.chart.cost_benefit.data[r].filter(function(d){ return d[self.chart._filter] == self.chart._filter_value && d.storm == storm && d.hazard == hazard; });
				var _nested = d3.nest()
					.key(function(d) { return d.type; })
					.sortKeys(d3.ascending)
					.sortValues(function(a,b){ return a[self.chart._x_key] - b[self.chart._x_key]; })
					.entries(_data);
				_data = _nested.reduce(function(a,b){ return a.concat(b.values); },[]);
				
				_nested = _nested.filter(function(d){ return d.key == "NBA"; })
				_data = _data.filter(function(d){ return d.type == "NBA"; });
				
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
					.attr("cx", function(d) { return self.chart.x(d["climate"]) })
					.attr("cy",function(d) {  
						if (checked) {
							return self.chart.y(d.net_ecosystem);
						} else {
							return self.chart.y(d[self.chart._y_key]);
						}
					})
				this.updateExposureResults2();
			}
						
			this.updateCurrentStormValue2 = function(d, strategy) {
				self.updateLineChart2();
				self.updateExposureResults2();
			}
			
			this.updateCurrentClimateValue = function(d, strategy, transition = false) {
				var checked = this.ecosystemCheckBox.checked;
				
				this.chart.plot.selectAll('circle.group')
					.classed("on", false)
					//.transition()
					.attr("r", 4);
					
				d3.selectAll(".tick_on")
					.classed("tick_on", false);
					
				d3.selectAll("circle." + strategy + ".climate_" + d)
					.classed("on", true)
					//.transition()
					.attr("r", 6);	
					
				d3.select(".tick.climate_" + d)
					.select("text")
					.classed("tick_on", true);
				
				var x1 = d;
				var x2 = d;
				var y1 = _.first(self.chart.y.domain())
				var y2 = (checked) ? _.first(d3.selectAll("circle." + strategy + ".climate_" + d).data()).net_ecosystem : _.first(d3.selectAll("circle." + strategy + ".climate_" + d).data()).net;
				
				if (transition) {
					d3.select("line.line-highlight")
						.transition()
						//.delay(1)
						.duration(500)
						.attr("x1", self.chart.x(x1)).attr("x2", self.chart.x(x2))
						.attr("y1", self.chart.y(y1)).attr("y2", self.chart.y(y2)-6)
				} else {
					d3.select("line.line-highlight")
						.attr("x1", self.chart.x(x1)).attr("x2", self.chart.x(x2))
						.attr("y1", self.chart.y(y1)).attr("y2", self.chart.y(y2)-6)
				}
				
				//hard coded hack needed to get alignment correct
				var position = { "Current":39, "2030":177, "2060":308, "2100":439 }
				
				this.chart.legendHighlight.innerHTML = d;
				/* var tick = _.first(_.first(d3.select(".tick.climate_" + d)));
				var n = domGeom.position(tick);
				var left = n.x - 55; */
				var left = position[d];
				domStyle.set(this.chart.legendHighlight, "left", left + "px")
				
				domClass.remove(this.chart.legendHighlight,["hCCA","hNBA"]);
				domClass.add(this.chart.legendHighlight, "h" + strategy);
			}
			
			this.updateInterface = function(){
				//console.log("updateInterface");
				this._region = this.regionSelect.value;
				
				if (this._region != "" && _.has(this._interface.region[this._region].controls.slider.climate, "labels")) {
					var labels = (_.isArray(this._interface.region[this._region].controls.slider.climate.labels)) ? this._interface.region[this._region].controls.slider.climate.labels : this._interface.region[this._region].controls.slider.climate.labels[_.first(_.keys(this._interface.region[this._region].controls.slider.climate.labels))]
				} else {
					var labels = this._interface.controls.slider.climate.labels;
				}
				this.climateSlider.set("maximum", labels.length-1);
				this.climateSlider.set("discreteValues", labels.length);
				this.climateSlider.set("value", labels.length-1);
				this.climateSliderLabels.set("labels",labels);
				this.climateSliderLabels.set("count", labels.length);
				this.climateSliderLabels.buildRendering();
				
				domConstruct.empty(this.hazardSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "total" }, this.hazardSelect);
				domConstruct.empty(this.damageSelect);
				domConstruct.create("option", { innerHTML: " -- ", value: "total" }, this.damageSelect);
				
				this.managementLayerCheckBox.disabled = true;
				this.hazardLayerCheckBox.disabled = true;
				this.damageLayerCheckBox.disabled = true;
				
				if (this._region != "") {
					var visible = (this._interface.region[this._region].controls.check.management.show) ? "visible": "hidden";
					domStyle.set(this.managementLayerCheckBox.parentNode, "visibility", visible);
					
					array.forEach(this._interface.region[this._region].controls.select.hazard.options, function(item) {
						domConstruct.create("option", { innerHTML: item.name, value: item.value }, self.hazardSelect);
					});
					array.forEach(this._interface.region[this._region].controls.select.damage.options, function(item) {
						domConstruct.create("option", { innerHTML: item.name, value: item.value }, self.damageSelect);
					});
					
					if (_.has(this._interface.region[this._region].controls.select.damage, "label")) {
						_.first(query("i.fa-question-circle.enba-" + this._map.id + ".exposure-damage ~ b span.control-text")).innerHTML = this._interface.region[this._region].controls.select.damage.label;
					}
					
					this.climateSlider.set("disabled", false);
					this.discountRateSelect.value = this._interface.region[this._region].controls.select.discount.defaultValue;
					this.discountRateSelect.disabled = this._interface.region[this._region].controls.select.discount.disabled;
					this.stormSelect.value = this._interface.region[this._region].controls.select.storm.defaultValue;
					this.stormSelect.disabled = this._interface.region[this._region].controls.select.storm.disabled;
					
					domStyle.set(this.downloadReport, "background", "#2B2E3B");
					
					if (domStyle.get(this.exposureChartPane.containerNode, "display") == "none") {
						coreFx.chain([
							coreFx.wipeIn({ node: self.exposureChartPane.containerNode, duration: 300}),
							coreFx.wipeIn({ node: self.exposureMessagePane.containerNode, duration: 300})
						]).play();
					}
					
					this.ecosystemCheckBox.checked = this._interface.region[this._region].controls.check.ecosystem.checked;;
					var display = (this._interface.region[this._region].controls.check.ecosystem.show) ? "block": "none";
					query(".plugin-enba .ecosystem-checkbox").style("display", display);
					
					this.opacitySlider.set("disabled", false);
					
					this.updateLineChart2();
					this.adjustLineForEcosystem2(self.chart._filter_value, true);
					
					var extent = new Extent(this._interface.region[this._region].extent);
					
				} else {
					domStyle.set(this.managementLayerCheckBox.parentNode, "visibility", "visible");
					
					if (_.has(this._interface.controls.select.damage, "label")) {
						_.first(query("i.fa-question-circle.enba-" + this._map.id + ".exposure-damage ~ b span.control-text")).innerHTML = this._interface.controls.select.damage.label;
					}
					
					this.climateSlider.set("disabled", true);
					this.discountRateSelect.value = _.first(this._interface.controls.select.discount.options).value;
					this.discountRateSelect.disabled = true;
					this.stormSelect.value = _.first(this._interface.controls.select.storm.options).value;
					this.discountRateSelect.disabled = true;
					
					domStyle.set(this.downloadReport, "background", "#94959C");
					
					coreFx.chain([
						coreFx.wipeOut({ node: self.exposureMessagePane.containerNode, duration: 300}),
						coreFx.wipeOut({ node: self.exposureChartPane.containerNode, duration: 300})
					]).play();
					
					this.opacitySlider.set("disabled", true);
					
					var extent = new Extent(this._extent);
				}
				
				this.managementTypeSelect.value = "";
				this.hazardSelect.value = "total";
				this.damageSelect.value = "total";
				
				this._map.setExtent(extent, false);
				this.updateMapLayers([], this.mapLayer);
			}
			
			this.resetInterface = function(){
				/* if (this.mapLayer && this.mapLayer.loaded) {
					this.managementTypeSelect.value = _.first(this._interface.controls.management).value;
					this.hazardSelect.value = _.first(this._interface.controls.hazard).value;
					this.damageSelect.value = _.first(this._interface.controls.damage).value;
					this.discountRateSelect.value = 3;
					this.stormSelect.value = 100;
					this.climateSlider.set("value", this._interface.controls.slider.climate.length-1);
					this.managementLayerCheckBox.checked = true;
					this.managementLayerCheckBox.disabled = true;
					this.hazardLayerCheckBox.checked = true;
					this.hazardLayerCheckBox.disabled = true;
					this.damageLayerCheckBox.checked = true;
					this.damageLayerCheckBox.disabled = true;
					this.ecosystemCheckBox.checked = true;
					this.ecosystemCheckBox.disabled = false;
					
					this.chart._storm_value = this.stormSelect.value;
					this.updateLineChart2();
					this.updateExposureResults2();
				} */
			}
			
			this.createTooltips = function() {
				
				on(query("i.fa-question-circle.enba-" + this._map.id), "mousemove", function(evt) {
					var cssClass = _.last(domAttr.get(this, "class").split(" "));
					var tab = _.first(cssClass.split("-"));
					var control = _.last(cssClass.split("-"));
					var message = self._interface["tooltips"]["info-circle"][control].message;
					var orientation = self._interface["tooltips"]["info-circle"][control].orientation;
					self.showMessageDialog(this, message, null, orientation);
				});
				
				on(query("i.fa-question-circle.enba-" + this._map.id), "mouseout", function() {
					self.hideMessageDialog();
				});
				
				dojo.forEach(_.keys(this._interface["tooltips"]["controls"]["select"]), function(control) {
					on(query("#results-" + control + "-" + self._map.id + " div"), "mouseover", function(){
						var message = self._interface["tooltips"]["controls"]["select"][control].message;
						var orientation = self._interface["tooltips"]["controls"]["select"][control].orientation;
						self.showMessageDialog(this, message, { t: (domGeom.position(this).h/2) - 5 }, orientation);
					});
					
					on(query("#results-" + control + "-" + self._map.id + " div"), "mouseout", function(){
						self.hideMessageDialog();
					});
				});
				
				dojo.forEach(_.keys(this._interface["tooltips"]["controls"]["checkbox"]), function(control) {
					on(query("#" + control + "-" + self._map.id + " ~ div"), "mouseover", function(){
						var message = self._interface["tooltips"]["controls"]["checkbox"][control].message;
						var orientation = self._interface["tooltips"]["controls"]["checkbox"][control].orientation;
						self.showMessageDialog(this, message, { t:2 }, orientation);
					});
					
					on(query("#" + control + "-" + self._map.id + " ~ div"), "mouseout", function(){
						self.hideMessageDialog();
					});
				});
				
				dojo.forEach(_.keys(this._interface["tooltips"]["results"]), function(item) {
					on(query("#results-" + item + "-" + self._map.id), "mouseover", function(){
						var message = self._interface["tooltips"]["results"][item].message;
						var orientation = self._interface["tooltips"]["results"][item].orientation;
						self.showMessageDialog(this, message, { t:5 }, orientation);
					});
					
					on(query("#results-" + item + "-" + self._map.id), "mouseout", function(){
						self.hideMessageDialog();
					});
				});
				
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
					
			}
			
			this.formatter = function(value,n) {
				return Math.round(value/n);
			}
			
			this.getTemplate = function(name) {
                var template = _.template($.trim(this._$templates.find('#' + name).html()));
                return template;
            }

			this.showMessageDialog = function(node, message, position, orientation = "top") {
				self.tip.innerHTML = message;
				domStyle.set(self.tip, { "display": "block" });
				var offset = 3;
				
				var p = domGeom.position(win.body());
				var np = domGeom.position(node);
				var nm = domGeom.getMarginBox(node);
				var t = domGeom.getMarginBox(self.tip);
				var n = { "x": np.x, "y": np.y, "w": np.w, "h": (np.h == nm.h) ? np.h - 4 : np.h }
				
				switch (orientation) {
					case "top":
						var left = n.x - p.x - t.w/2 + n.w/2;
						var top = n.y - p.y - t.h - n.h + offset;
						left = (position && position.l) ? n.x - p.x - t.w/2 + position.l : left;
						top = (position && position.t) ? n.y - p.y - t.h - position.t : top;
						break;
						
					case "right":
						var left = n.x - p.x + 1.5*n.w + offset;
						var top = n.y - p.y - t.h/2 + n.h/2;
						left = (position && position.l) ? n.x - p.x + position.l : left;
						top = (position && position.t) ? n.y - p.y - t.h/2 + position.t : top;
						break;
						
					case "bottom":
						var left = n.x - p.x - t.w/2 + n.w/2;
						var top = n.y - p.y + 2*n.h + offset;
						left = (position && position.l) ? n.x - p.x - t.w/2 + position.l : left;
						top = (position && position.t) ? n.y - p.y + position.t : top;
						break;
					
					case "left":
						var left = n.x - p.x - t.w - n.w/2 - offset;
						var top = n.y - p.y - t.h/2 + n.h/2;
						left = (position && position.l) ? n.x - p.x - t.w - position.l : left;
						top = (position && position.t) ? n.y - p.y - t.h/2 + position.t : top;
						break;
				}
				domClass.remove(self.tip, ["tooltip-top","tooltip-left","tooltip-bottom","tooltip-right"]);
				domClass.add(self.tip, "tooltip-" + orientation);
				domStyle.set(self.tip, {
					"left": left + "px",
					"top": top + "px"
				});
				
				self.tip.focus();
            }

            this.hideMessageDialog = function() {
        		domStyle.set(self.tip, { "display": "none" });
			}


		};// End enbaTool

		
		return enbaTool;	
		
	} //end anonymous function

); //End define
