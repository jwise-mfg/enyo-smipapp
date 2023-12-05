iphone = true;
enyo.kind({
	name: "SmipApp",
	kind: enyo.VFlexBox,
	results: [],
	parentId: null,
	primitives: ["int", "float", "string"],
	machineTypes: [],
	chartName: null,
	chartWindowHours: 2,
	chartWindowSamples: 10,
	lastAttribId: false,
	lastAttribType: null,
	lastChartName: "",
	lastChartSamples: [],
	lastChartLabels: [],
	components: [
		{kind: "ApplicationEvents", onLoad: "connectToSmip" },
		{ kind: "PageHeader", components: [
			{ kind: "Image", name: "titleIcon", src: "icon.png", flex:1, style:"width:24px; margin-right: 8px" },
			{ name: "titleText", content: "Hello", style:"margin-top:1px;", flex:1 },
			{ kind: "Spinner"},
			{ kind: "Button", caption: "Start Over", align:"right", onclick: "btnStartOver",  }
		]},
		{name: "slidingPane", kind: "SlidingPane", flex: 1, multiView: true, multiViewMinWidth: 500, onSlideComplete: "refreshPane", components: [
			{name: "paneEquipment", minWidth:"400px", components: [
				{kind: "Scroller", name:"equipmentList", flex: 1, components: [
					{name: "list", kind: "VirtualRepeater", onSetupRow: "getListItem",
						components: [
							{kind: "Item", layoutKind: "VFlexLayout", tapHighlight:true, onclick: "listItemClick", components: [
								{name: "title", kind: "Divider"},
								{name: "description"}
							]}
						]
					}
				]},
				{kind: "VFlexBox", className:"enyo-toolbar-light", style:"height:52px", components: [
					{ flex: 1 },
					{ kind: "HFlexBox", components: [
						{ flex: 1 },
						{ kind: "Button", caption: "Go Back", name:"btnBack", onclick: "btnBack", disabled: true },
						{ flex: 1 },
					]},
					{ flex: 1 },
				]}
			]},
			{name: "paneChart", flex: 1, minWidth: "400px", components: [
				{ kind: "HtmlContent", flex:1, style: "padding-left:20px; padding-right: 30px", srcId: "myChartDiv"},
				{ className:"enyo-toolbar-light", components: [
					{ name: "Grabber", className:"enyo-retrofit-grabbutton" },
					{ name: "Filler", flex: 1 }
				]}
			]}
		]},
		{ kind: "ModalDialog", name: "modalLogin", className: "enyo-toolbar-light", components: [
			{ name: "loginTitle", content: "Sign In", style: "text-align:center; font-weight: bold;" },
			{ kind: "VFlexBox", align: "left", components: [
				{ kind: "Input", name: "instanceGraphQLEndpoint", spellcheck: false, autoWordComplete: false, autoCapitalize: "lowercase", hint: "https://yourserver/graphql" },
				{ kind: "Input", name: "clientId", disabled: false, spellcheck: false, autoWordComplete: false, autoCapitalize: "lowercase", hint: "Authenticator" },
				{ kind: "Input", name: "userName", disabled: false, spellcheck: false, autoWordComplete: false, autoCapitalize: "lowercase", hint: "User Name" },
				{ kind: "PasswordInput", name: "clientSecret", disabled: false, spellcheck: false, autoWordComplete: false, autoCapitalize: "lowercase", hint: "Password" },
				{ kind: "Input", name: "role", disabled: false, spellcheck: false, autoWordComplete: false, autoCapitalize: "lowercase", hint: "yourserver_ro_group" },
				{ kind: "Input", name: "parentId", disabled: false, spellcheck: false, autoWordComplete: false, autoCapitalize: "lowercase", hint: "Parent Node Id" },
				{ kind: "HFlexBox", style:"margin-top:10px", components: [
					{ name:"chkRemember", content: "<input type='checkbox' id='chkRemember' value='remember' class='enyo-checkbox'>" },
					{content: "<label for='chkRemember'>Remember Me</label>", style: "margin: 5px 0px 0px 5px; font-size: 90%"}
				]}
			]},
			{ kind: "HFlexBox", align: "middle", style:"margin-top:10px", components: [
				{ kind: "Button", flex: 1, caption: "OK", onclick: "btnSaveLogin" },
				{ kind: "Button", flex: 1, caption: "Cancel", onclick: "btnCancelLogin" }
			]}
		 ]},
		 { kind: "ModalDialog", name: "modalError", onOpen: "errorDialogOpen", components: [
			{ name: "errorTitle", style: "text-align:center; margin-bottom: 10px; font-weight: bold;" },
			{ name: "errorMessage", kind: "HtmlContent" },
			{ kind: "HFlexBox", align: "middle", style:"margin-top:10px", components: [
				{ kind: "Button", flex: 1, caption: "OK", onclick: "btnErrorClose" },
			]}
		 ]},
	],
	create: function() {
		this.inherited(arguments);
		this.results = [];
		Smip.logHelper = enyo.log;
		appInfo = enyo.fetchAppInfo()
		this.$.titleText.setContent(appInfo.title);
		this.$.titleIcon.setSrc(appInfo.icon);
		Smip.instanceGraphQLEndpoint = appInfo.smip.instanceGraphQLEndpoint;
		Smip.clientId = appInfo.smip.clientId;
		Smip.userName = appInfo.smip.userName;
		if (appInfo.smip.clientSecret && appInfo.smip.clientSecret) {
			Smip.clientSecret = appInfo.smip.clientSecret;
			enyo.warn("User secret found in app definition. This is a security risk!");
		}
		Smip.role = appInfo.smip.role;
		this.parentId = appInfo.smip.parentId;
		this.machineType = appInfo.smip.machineType;
		enyo.log("Configured to filter on equipment of type: " + (this.machineType || "all"));
		this.chartWindowHours = appInfo.smip.sampleWindowHours;
		this.chartWindowSamples = appInfo.smip.sampleWindowCount;
		enyo.log("Configured to render " + this.chartWindowSamples + " samples over " + this.chartWindowHours + " hours");
	},
	connectToSmip: function() {
		if (!Prefs.getCookie("remember", false))
			this.showLoginDialog();
		else {
			Smip.instanceGraphQLEndpoint = Prefs.getCookie("instanceGraphQLEndpoint", Smip.instanceGraphQLEndpoint);
			Smip.clientId = Prefs.getCookie("clientId", Smip.clientId);
			Smip.userName = Prefs.getCookie("userName", Smip.userName);
			Smip.clientSecret = Prefs.getCookie("clientSecret", Smip.clientSecret);
			Smip.role = Prefs.getCookie("role", Smip.role);
			this.parentId = Prefs.getCookie("parentId", Smip.parentId);
			this.getEquipmentList();
		}
	},
	showLoginDialog: function() {
		Smip.retries = 0;
		this.$.modalLogin.openAtCenter();
		this.$.instanceGraphQLEndpoint.setValue(Prefs.getCookie("instanceGraphQLEndpoint", Smip.instanceGraphQLEndpoint));
		this.$.clientId.setValue(Prefs.getCookie("clientId", Smip.clientId));
		this.$.userName.setValue(Prefs.getCookie("userName", Smip.userName));
		this.$.clientSecret.setValue(Prefs.getCookie("clientSecret", Smip.clientSecret));
		this.$.role.setValue(Prefs.getCookie("role", Smip.role));
		this.$.parentId.setValue(Prefs.getCookie("parentId", this.parentId));
		document.getElementById("chkRemember").checked = Prefs.getCookie("remember", false);
	},
	btnSaveLogin: function() {
		if (this.$.instanceGraphQLEndpoint.getValue()) {
			Smip.instanceGraphQLEndpoint = this.$.instanceGraphQLEndpoint.getValue();
			Prefs.setCookie("instanceGraphQLEndpoint", Smip.instanceGraphQLEndpoint);
		}
		if (this.$.clientId.getValue()) {
			Smip.clientId = this.$.clientId.getValue();
			Prefs.setCookie("clientId", Smip.clientId);
		}
		if (this.$.userName.getValue()) {
			Smip.userName = this.$.userName.getValue();
			Prefs.setCookie("userName", Smip.userName);
		}
		if (this.$.clientSecret.getValue()) {
			Smip.clientSecret = this.$.clientSecret.getValue();
			Prefs.setCookie("clientSecret", Smip.clientSecret);
		}
		if (this.$.role.getValue()) {
			Smip.role = this.$.role.getValue();
			Prefs.setCookie("role", Smip.role);
		}
		Prefs.setCookie("parentId", this.$.parentId.getValue());
		if (this.$.parentId.getValue())
			this.parentId = this.$.parentId.getValue();
		if (document.getElementById("chkRemember").checked) {
			Prefs.setCookie("remember", true);
		} else {
			Prefs.setCookie("remember", null);
		}
		this.$.modalLogin.close();
		this.getEquipmentList();
	},
	btnStartOver: function(inSender, inEvent) {
		this.showLoginDialog();
	},
	btnCancelLogin: function(inSender, inEvent) {
		this.$.modalLogin.close();
	},
	showError: function(title, message) {
		this.$.modalError.openAtCenter();
		this.$.errorTitle.setContent(title);
		this.$.errorMessage.setContent(message);
	},
	btnErrorClose: function(inSender, inEvent) {
		this.$.modalError.close();
	},
	btnBack: function(inSender, inEvent) {
		this.$.btnBack.setDisabled(true);
		this.getEquipmentList();
	},
	getListItem: function(inSender, inIndex) {
		var r = this.results[inIndex];
		if (r) {
			this.$.title.setCaption("ID: " + r.id);
			this.$.description.setContent(r.displayName + " (" + (r.dataValue || r.typeName || r.dataType) + ")");
			return true;
		}
	},
	listItemClick: function(inSender, inEvent) {
		var item = this.results[inEvent.rowIndex];
		this.handleItemSelect(item);
	},
	handleItemSelect: function(item) {
		this.$.btnBack.setDisabled(false);
		enyo.log("Clicked row item: " + JSON.stringify(item));
		var itemType = (item.typeName || item.dataType);
		if (this.primitives.indexOf(itemType.toLowerCase()) != -1) {
			this.lastAttribId = item.id;
			this.lastAttribType = itemType;
			this.chartName = item.displayName;
			this.getSamples(item.id, itemType);
		}
		else {
			this.lastAttribId = false;
			this.lastAttribType = false;
			this.getAttributes(item.id);
		}
	},
	refreshPane: function() {
		if (this.$.slidingPane.getViewName() == "paneChart" && this.lastAttribId) {
			this.renderChart(this.lastChartName, this.lastChartSamples, this.lastChartLabels, true);
		}
	},
	getEquipmentList: function() {
		this.$.spinner.show();
		enyo.log("Requesting Equipment List from CESMII Smart Manufacturing Platform...");
		if (this.machineType && this.machineType != "")
			smpResponse = Smip.performGraphQLRequest(Smip.Queries.getEquipmentOfType(this.machineType, this.parentId), this.processSmipObjects.bind(this));
		else
			smpResponse = Smip.performGraphQLRequest(Smip.Queries.getEquipment(this.parentId), this.processSmipObjects.bind(this));
	},
	getAttributes: function(id) {
		enyo.log("Requesting Attributes List for Equipment ID " + id + " from CESMII Smart Manufacturing Platform...");
		smpResponse = Smip.performGraphQLRequest(Smip.Queries.getAttributesForEquipmentById(id), this.processSmipObjects.bind(this));
	},
	processSmipObjects: function(smpResponse) {
		enyo.log("Processing SMIP Response: " + smpResponse);
		var smpResponse = JSON.parse(smpResponse);
		//Get the first thing in data (since the type is unknown)
		this.results = smpResponse.data[Object.keys(smpResponse.data)[0]];
		this.$.list.render();
		if (this.results.length == 1) {
			enyo.warn("Only one equipment object matched the configuration, so it has been automatically selected.")
			this.handleItemSelect(this.results[0]);
		}
		this.$.spinner.hide();
	},
	getSamples: function(id, dataType) {
		this.$.spinner.show();
		var endtime = new Date(Date.now());
		var useTicks = this.chartWindowHours * 60 * 60 * 1000;
		var starttime = new Date(endtime - useTicks);
		smpResponse = Smip.performGraphQLRequest(Smip.Queries.getHistoricalData(id, starttime.toISOString(), endtime.toISOString(), dataType), this.processSmipSamples.bind(this));
	},
	processSmipSamples: function(smpResponse) {
		//enyo.log("history result: " + smpResponse);
		var smpResponse = JSON.parse(smpResponse);
		var historyValues = smpResponse.data.getRawHistoryDataWithSampling;
		var newChartName;

		//Get the most recent value to put in the list
		var lastSample = historyValues[historyValues.length-1];
		var updateId = lastSample.id;
		var updateValue = "0";
		if (lastSample.floatvalue) {
			updateValue = lastSample.floatvalue;
		} else if (lastSample.intvalue) {
			updateValue = lastSample.intvalue;
		} else if (lastSample.stringvalue) {
			updateValue = lastSample.stringvalue;
		}
		//Find the item in the list to update
		for (var i=0;i<this.results.length;i++) {
			var checkRow = this.results[i];
			if (checkRow.id == updateId) {
				if (checkRow.measurementUnit) {
					updateValue = updateValue + " " + checkRow.measurementUnit.displayName;
				}
				this.results[i].dataValue = (updateValue || "0");
				newChartName = this.chartName + ": " + this.results[i].dataValue;
			}
		}
		this.$.list.render();

		//Find the 10 most recent values to put in the chart
		var samples = [];
		var labels = [];
		var sampleCount=0;
		for (var i=historyValues.length-1;i>0;i--) {
			sampleCount++;
			var thisSample = historyValues[i];
			var sampleValue = 0;
			if (thisSample.floatvalue) {
				sampleValue = thisSample.floatvalue;
			} else if (thisSample.intvalue) {
				sampleValue = thisSample.intvalue;
			} else if (thisSample.stringvalue) {
				sampleValue = thisSample.stringvalue;
			}
			samples.push(sampleValue);
			var ts = new Date(thisSample.ts);
			labels.push(ts.toLocaleTimeString('en-US'));
			if (sampleCount >= this.chartWindowSamples)
				i=0;
		}
		this.lastChartName = newChartName;
		this.lastChartSamples = samples.reverse();
		this.lastChartLabels = labels.reverse();
		if(document.documentElement.clientWidth <= 500) {
            this.$.slidingPane.selectViewByName("paneChart");
        } else {
            this.renderChart(this.lastChartName, this.lastChartSamples, this.lastChartLabels, false);
        }
		this.$.spinner.hide();
	},
	renderChart: function(displayName, samples, labels, disableAnimations) {
		var ctx = document.getElementById("myChart").getContext('2d');
		var options = {
			scales: {
				yAxes: [{
					ticks: {
						beginAtZero:true
					}
				}]
			},
			maintainAspectRatio: false
		};
		if (disableAnimations) {
			options.animation = { duration: 0 };
			options.responsiveAnimationDuration = 0;
		}
		var myChart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: labels,
				datasets: [{
					label: displayName,
					data: samples,
					borderColor: "#4084ef",
					borderWidth: 2
				}]
			},
			options: options
		});
	},
});
