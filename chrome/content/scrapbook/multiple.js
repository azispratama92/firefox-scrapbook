
var sbMultipleService = {

<<<<<<< HEAD
	get FILTER()  { return document.getElementById("sbFilter"); },
	get STATUS()  { return document.getElementById("sbStatus"); },
	get TEXTBOX() { return document.getElementById("ScrapBookTextbox"); },

	vorhLinks : [],
	allURLs : [],
	allTitles : [],
	selURLs : [],
	selTitles : [],
	currentID : null,
	lastID : null,

	init : function()
	{
		document.documentElement.buttons = "accept,cancel,extra2";
		document.documentElement.getButton("accept").label = document.getElementById("sbMainString").getString("CAPTURE_OK_BUTTON");
=======
	get STATUS()  { return document.getElementById("sbStatus"); },
	get TEXTBOX() { return document.getElementById("ScrapBookTextbox"); },

	init : function()
	{
		document.documentElement.buttons = "accept,cancel,extra2";
		document.documentElement.getButton("accept").label = ScrapBookUtils.getLocaleString("SAVE_OK_BUTTON");
>>>>>>> release-1.6.0.a1
		document.documentElement.getButton("accept").accesskey = "C";
		this.TEXTBOX.focus();
		sbFolderSelector2.init();
		setTimeout(function(){ sbMultipleService.pasteClipboardURL(); }, 0);
	},

	done : function()
	{
<<<<<<< HEAD
		var allURLs = [];
		var urlList = [];
		var namList = [];
=======
		var urlList = [];
>>>>>>> release-1.6.0.a1
		var urlHash = {};
		var lines = this.TEXTBOX.value.split("\n");
		for ( var i = 0; i < lines.length; i++ )
		{
			if ( lines[i].length > 5 ) urlHash[lines[i]] = true;
		}
<<<<<<< HEAD
		for ( var url in urlHash ) { allURLs.push(url); }
		if ( allURLs.length < 1 ) return;
		//Verbliebene Links trennen
		for ( var i = 0; i < allURLs.length; i++ )
		{
			lines = allURLs[i].split(";");
			urlList[i] = lines[0];
			if ( lines.length == 2 )
			{
				namList[i] = lines[1];
			} else
			{
				namList[i] = "";
			}
		}
		if (document.getElementById("sbLinktitle").value == "ScrapBook")
		{
			window.openDialog(
				"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
				urlList, "", false, sbFolderSelector2.resURI, 0, null, null, null, null, "SB", document.getElementById("sbCharset").value, document.getElementById("sbTimeout").value
				);
		} else
		{
			window.openDialog(
				"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
				urlList, "", false, sbFolderSelector2.resURI, 0, null, null, null, null, "SB", document.getElementById("sbCharset").value, document.getElementById("sbTimeout").value, namList
				);
		}
	},

	addURL : function(auAllHash, auExclude)
	{
		var auAll = "";
		var auSelected = 0;
		var auCount = 0;
		var auFilter = this.FILTER.value;
		if ( auExclude == null )
		{
			auExclude = document.getElementById("sbpExcludeExistingAddresses").checked;
		}
		for ( var auURL in auAllHash )
		{
			auCount++;
			this.allURLs.push(auURL);
			this.allTitles.push(auAllHash[auURL]);
		}
		if ( auCount > 0 )
		{
			//Vergleichen mit Ausschlußliste und Co
			this.currentID = sbFolderSelector2.resURI;
			if ( this.currentID != this.lastID ) this.detectExistingLinks();
			for ( var auI=0; auI<this.allURLs.length; auI++ )
			{
				if ( this.allURLs[auI].match(auFilter) )
				{
					//Abgleich mit Ausschlussliste
					var auDoppelt = 0;
					if ( auExclude )
					{
						for ( var auJ = 0; auJ < this.vorhLinks.length; auJ++)
						{
							if ( this.vorhLinks[auJ] == this.allURLs[auI] )
							{
								auDoppelt = 1;
								auJ = this.vorhLinks.length;
							}
						}
					}
					if ( auDoppelt == 0 )
					{
						auSelected++;
						this.selURLs.push(this.allURLs[auI]);
						this.selTitles.push(this.allTitles[auI]);
						auAll += this.allURLs[auI]+";"+this.allTitles[auI]+"\n";
					}
				}
			}
			document.getElementById("sbpCounter").setAttribute("value", auSelected+" \/ "+auCount);
		} else
		{
			document.getElementById("sbpCounter").setAttribute("value", "");
		}
		this.TEXTBOX.value = auAll;
=======
		for ( var url in urlHash ) { urlList.push(url); }
		if ( urlList.length < 1 ) return;
		window.openDialog(
			"chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,resizable,dialog=no",
			urlList, "", false, sbFolderSelector2.resURI, 0, null, null ,null
		);
	},

	addURL : function(aURL)
	{
		if ( !aURL.match(/^(http|https|ftp|file):\/\//) ) return;
		this.TEXTBOX.value += aURL + "\n";
>>>>>>> release-1.6.0.a1
	},

	clear : function()
	{
		this.TEXTBOX.value = "";
	},

	pasteClipboardURL : function()
	{
<<<<<<< HEAD
		var pcuAllHash = {};
		var pcuLines = [];
		this.allURLs = [];
		this.allTitles = [];
		try
		{
			var clip  = Components.classes['@mozilla.org/widget/clipboard;1'].createInstance(Components.interfaces.nsIClipboard);
			if ( !clip ) return false;
			var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
			if ( !trans ) return false;
			if ( 'init' in trans ) trans.init(null);
=======
		try {
			var clip  = Cc['@mozilla.org/widget/clipboard;1'].createInstance(Ci.nsIClipboard);
			var trans = Cc["@mozilla.org/widget/transferable;1"].createInstance(Ci.nsITransferable);
>>>>>>> release-1.6.0.a1
			trans.addDataFlavor("text/unicode");
			clip.getData(trans, clip.kGlobalClipboard);
			var str = new Object();
			var len = new Object();
			trans.getTransferData("text/unicode", str, len);
<<<<<<< HEAD
			if ( str )
			{
				str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
				pcuLines = str.toString().split("\n");
				for ( var i = 0; i < pcuLines.length; i++ )
				{
					if ( pcuLines[i].match(/^(http|https|ftp|file):\/\//) )
					{
						var pcuGetrennt = pcuLines[i].split("\;");
						if ( pcuGetrennt.length > 1 )
						{
							pcuAllHash[pcuGetrennt[0]] = pcuGetrennt[1];
						} else
						{
							pcuAllHash[pcuGetrennt[0]] = "";
						}
					}
				}
				this.addURL(pcuAllHash);
=======
			if ( str ) {
				str = str.value.QueryInterface(Ci.nsISupportsString);
				this.addURL(str.toString());
>>>>>>> release-1.6.0.a1
			}
		} catch(ex) {
		}
	},

	detectURLsOfTabs : function()
	{
		this.clear();
<<<<<<< HEAD
		var duotURL = "";
		var duotAllHash = {};
		var nodes = window.opener.gBrowser.mTabContainer.childNodes;
		this.allURLs = [];
		this.allTitles = [];
		for ( var i = 0; i < nodes.length; i++ )
		{
			duotURL = window.opener.gBrowser.getBrowserForTab(nodes[i]).contentDocument.location.href;
			if ( duotURL.match(/^(http|https|ftp|file):\/\//) )
			{
				duotAllHash[duotURL] = "";
			}
		}
		this.addURL(duotAllHash);
=======
		var nodes = window.opener.gBrowser.mTabContainer.childNodes;
		for ( var i = 0; i < nodes.length; i++ )
		{
			this.addURL(window.opener.gBrowser.getBrowserForTab(nodes[i]).contentDocument.location.href);
		}
>>>>>>> release-1.6.0.a1
	},

	detectURLsInPage : function()
	{
		this.clear();
<<<<<<< HEAD
		var duipURL = "";
		var duipAllHash = {};
		var node = window.opener.top.content.document.body;
		this.allURLs = [];
		this.allTitles = [];
=======
		var node = window.opener.top.content.document.body;
>>>>>>> release-1.6.0.a1
		traceTree : while ( true )
		{
			if ( node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement )
			{
<<<<<<< HEAD
				duipURL = node.href;
				if ( duipURL.match(/^(http|https|ftp|file):\/\//) )
				{
					duipAllHash[duipURL] = node.text.replace(/^\s+/, '').replace(/\s+$/, '').replace(/\n/, ' ');
				}
=======
				this.addURL(node.href);
>>>>>>> release-1.6.0.a1
			}
			if ( node.hasChildNodes() ) node = node.firstChild;
			else
			{
				while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
				node = node.nextSibling;
			}
		}
<<<<<<< HEAD
		this.addURL(duipAllHash);
=======
>>>>>>> release-1.6.0.a1
	},

	detectURLsInSelection : function()
	{
		this.clear();
<<<<<<< HEAD
		var duisURL = "";
		var duisAllHash = {};
		var sel = window.opener.top.sbPageEditor.getSelection();
		if ( !sel )
		{
			document.getElementById("sbpCounter").setAttribute("value", "");
			return;
		}
=======
		var sel = window.opener.top.sbPageEditor.getSelection();
		if ( !sel ) return;
>>>>>>> release-1.6.0.a1
		var selRange  = sel.getRangeAt(0);
		var node = selRange.startContainer;
		if ( node.nodeName == "#text" ) node = node.parentNode;
		var nodeRange = window.opener.top.content.document.createRange();
<<<<<<< HEAD
		this.allURLs = [];
=======
>>>>>>> release-1.6.0.a1
		traceTree : while ( true )
		{
			nodeRange.selectNode(node);
			if ( nodeRange.compareBoundaryPoints(Range.START_TO_END, selRange) > -1 )
			{
				if ( nodeRange.compareBoundaryPoints(Range.END_TO_START, selRange) > 0 ) break;
				else if ( node instanceof HTMLAnchorElement || node instanceof HTMLAreaElement )
				{
<<<<<<< HEAD
					duisURL = node.href;
					if ( duisURL.match(/^(http|https|ftp|file):\/\//) )
					{
						duisAllHash[duisURL] = node.text.replace(/^\s+/, '').replace(/\s+$/, '').replace(/\n/, ' ');
					}
=======
					this.addURL(node.href);
>>>>>>> release-1.6.0.a1
				}
			}
			if ( node.hasChildNodes() ) node = node.firstChild;
			else
			{
				while ( !node.nextSibling ) { node = node.parentNode; if ( !node ) break traceTree; }
				node = node.nextSibling;
			}
		}
<<<<<<< HEAD
		this.addURL(duisAllHash);
	},

	detectExistingLinks : function()
	{
		//Funktion ermittelt die Links der vorhandenen Einträge im aktuell gewählten Zielverzeichnis
		var delResource = null;
		var delRDFCont = null;
		var delResEnum = [];
		this.vorhLinks = [];
		this.lastID = this.currentID;
		if ( !sbDataSource.data ) sbDataSource.init();
		delResource = sbCommonUtils.RDF.GetResource(this.currentID);
		delRDFCont = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);
		delRDFCont.Init(sbDataSource.data, delResource);
		delResEnum = delRDFCont.GetElements();
		while ( delResEnum.hasMoreElements() )
		{
			var delRes = delResEnum.getNext().QueryInterface(Components.interfaces.nsIRDFResource);
			if ( !sbDataSource.isContainer(delRes) )
			{
				this.vorhLinks.push(sbDataSource.getProperty(delRes, "source"));
			}
		}
	},

	updateSelection : function(usEvent)
	{
		//Funktion aktualisiert den Inhalt der aktuellen Auswahl
		var usCount = this.allURLs.length;
		var usAllHash = {};
		var usExclude = true;
		usExclude = document.getElementById("sbpExcludeExistingAddresses").checked;
		if ( usEvent )
		{
			if ( usEvent.button == 0 )
			{
				if ( usExclude )
				{
					usExclude = false;
				} else
				{
					usExclude = true;
				}
			}
		}
		for ( var i=0; i<usCount; i++ )
		{
			usAllHash[this.allURLs[i]] = this.allTitles[i];
		}
		this.allURLs = [];
		this.allTitles = [];
		this.addURL(usAllHash, usExclude);
	},

	toggleMethod : function()
	{
		//Funktion aktiviert bzw. deaktiviert die Zeichensatzauswahl
		var tmMethod = document.getElementById("sbMethod").value;
		if ( tmMethod == "SB" )
		{
			document.getElementById("sbCharset").disabled = false;
		} else
		{
			document.getElementById("sbCharset").disabled = true;
		}
=======
>>>>>>> release-1.6.0.a1
	},

};




var sbURLDetector1 = {

	index : 0,

	run : function()
	{
		this.index = 0;
<<<<<<< HEAD
		var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
=======
		var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
>>>>>>> release-1.6.0.a1
		FP.init(window, "", FP.modeGetFolder);
		var answer = FP.show();
		if ( answer == FP.returnOK )
		{
			sbMultipleService.clear();
			this.inspectDirectory(FP.file, 0);
		}
	},

	inspectDirectory : function(aDir, curIdx)
	{
<<<<<<< HEAD
		sbMultipleService.STATUS.value = document.getElementById("sbMainString").getString("SCANNING") + " (" + curIdx + "/" + this.index + ")... " + aDir.path;
		var entries = aDir.directoryEntries;
		while ( entries.hasMoreElements() )
		{
			var entry = entries.getNext().QueryInterface(Components.interfaces.nsILocalFile);
			if ( entry.isDirectory() ) {
				this.inspectDirectoryWithDelay(entry, ++this.index);
			} else {
				if ( entry.leafName.match(/\.(html|htm)$/i) ) sbMultipleService.addURL(sbCommonUtils.convertFilePathToURL(entry.path));
=======
		sbMultipleService.STATUS.value = ScrapBookUtils.getLocaleString("SCANNING") + 
		                                 " (" + curIdx + "/" + this.index + ")... " + aDir.path;
		var entries = aDir.directoryEntries;
		while ( entries.hasMoreElements() )
		{
			var entry = entries.getNext().QueryInterface(Ci.nsILocalFile);
			if ( entry.isDirectory() ) {
				this.inspectDirectoryWithDelay(entry, ++this.index);
			} else {
				if ( entry.leafName.match(/\.(html|htm)$/i) ) sbMultipleService.addURL(ScrapBookUtils.convertFilePathToURL(entry.path));
>>>>>>> release-1.6.0.a1
			}
		}
		if ( curIdx == this.index ) sbMultipleService.STATUS.value = "";
	},

	inspectDirectoryWithDelay : function(aDir, aIndex)
	{
		setTimeout(function(){ sbURLDetector1.inspectDirectory(aDir, aIndex); }, 200 * aIndex);
	},

};


var sbURLDetector2 = {

	type   : "",
	index  : 0,
	lines  : [],
	result : "",
	weboxBaseURL : "",

	run : function(aType)
	{
		this.type = aType;
		this.index = 0;
		this.lines = [];
		this.result = "";
		this.weboxBaseURL = "";
		var theFile ;
		if ( this.type == "W" ) {
<<<<<<< HEAD
			var FP = Components.classes['@mozilla.org/filepicker;1'].createInstance(Components.interfaces.nsIFilePicker);
=======
			var FP = Cc['@mozilla.org/filepicker;1'].createInstance(Ci.nsIFilePicker);
>>>>>>> release-1.6.0.a1
			FP.init(window, "Select default.html of WeBoX.", FP.modeOpen);
			FP.appendFilters(FP.filterHTML);
			var answer = FP.show();
			if ( answer == FP.returnOK ) theFile = FP.file;
			else return;
			this.weboxBaseURL = theFile.parent.path + '\\Data\\';
		} else {
<<<<<<< HEAD
			theFile = sbCommonUtils.DIR.get("ProfD", Components.interfaces.nsIFile);
=======
			theFile = ScrapBookUtils.DIR.get("ProfD", Ci.nsIFile);
>>>>>>> release-1.6.0.a1
			theFile.append("bookmarks.html");
			if ( !theFile.exists() ) return;
		}
		sbMultipleService.clear();
<<<<<<< HEAD
		this.lines = sbCommonUtils.readFile(theFile).split("\n");
=======
		this.lines = ScrapBookUtils.readFile(theFile).split("\n");
>>>>>>> release-1.6.0.a1
		this.inspect();
	},

	inspect : function()
	{
<<<<<<< HEAD
		sbMultipleService.STATUS.value = document.getElementById("sbMainString").getString("SCANNING") + "... (" + this.index + "/" + (this.lines.length-1) + ")";
		this.result += "\n";
		if ( this.type == "W" ) {
			if ( this.lines[this.index].match(/ LOCALFILE\=\"([^\"]+)\" /) )
				this.result += sbCommonUtils.convertFilePathToURL(this.weboxBaseURL + RegExp.$1);
=======
		sbMultipleService.STATUS.value = ScrapBookUtils.getLocaleString("SCANNING")
		                               + "... (" + this.index + "/" + (this.lines.length-1) + ")";
		this.result += "\n";
		if ( this.type == "W" ) {
			if ( this.lines[this.index].match(/ LOCALFILE\=\"([^\"]+)\" /) )
				this.result += ScrapBookUtils.convertFilePathToURL(this.weboxBaseURL + RegExp.$1);
>>>>>>> release-1.6.0.a1
		} else {
			if ( this.lines[this.index].match(/ HREF\=\"([^\"]+)\" /) )
				this.result += RegExp.$1;
		}
		if ( ++this.index < this.lines.length ) {
			setTimeout(function(){ sbURLDetector2.inspect(); }, 0);
		} else {
			this.result = this.result.replace(/\n\n+/g, "\n\n");
			this.result = this.result.replace(/^\n+/, "");
			sbMultipleService.TEXTBOX.value = this.result;
			sbMultipleService.STATUS.value = "";
		}
	},

<<<<<<< HEAD
};
=======
};


>>>>>>> release-1.6.0.a1
