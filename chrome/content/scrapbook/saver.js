
var sbContentSaver = {
    option: {},
    documentName: "",
    item: null,
    favicon: null,
    contentDir: null,
    refURLObj: null,
    isMainFrame: true,
    selection: null,
    treeRes: null,
    presetData: null,
    httpTask: {},
    downloadRewriteFiles: {},
    downloadRewriteMap: {},
    file2URL: {},
    file2Doc: {},
    linkURLs: [],
    frames: [],
    canvases: [],
    cachedDownLinkFilter: null,
    cachedDownLinkFilterSource: null,

    init: function(aPresetData) {
        this.option = {
            "isPartial": false,
            "images": sbCommonUtils.getPref("capture.default.images", true),
            "media": sbCommonUtils.getPref("capture.default.media", true),
            "fonts": sbCommonUtils.getPref("capture.default.fonts", true),
            "frames": sbCommonUtils.getPref("capture.default.frames", true),
            "styles": sbCommonUtils.getPref("capture.default.styles", true),
            "script": sbCommonUtils.getPref("capture.default.script", false),
            "asHtml": sbCommonUtils.getPref("capture.default.asHtml", false),
            "forceUtf8": sbCommonUtils.getPref("capture.default.forceUtf8", true),
            "rewriteStyles": sbCommonUtils.getPref("capture.default.rewriteStyles", true),
            "keepLink": sbCommonUtils.getPref("capture.default.keepLink", false),
            "saveDataURI": sbCommonUtils.getPref("capture.default.saveDataURI", false),
            "downLinkMethod": 0, // active only if explicitly set in detail dialog
            "downLinkFilter": "",
            "inDepth": 0, // active only if explicitly set in detail dialog
            "inDepthTimeout": 0,
            "inDepthCharset": "UTF-8",
            "internalize": false,
        };
        this.documentName = "index";
        this.item = sbCommonUtils.newItem(sbCommonUtils.getTimeStamp());
        this.item.id = sbDataSource.identify(this.item.id);
        this.favicon = null;
        this.isMainFrame = true;

        this.file2URL = {
            "index.dat": true,
            "index.png": true,
            "index.rdf": true,
            "sitemap.xml": true,
            "sitemap.xsl": true,
            "sb-file2url.txt": true,
            "sb-url2name.txt": true,
        };
        this.file2Doc = {};
        this.linkURLs = [];
        this.frames = [];
        this.canvases = [];
        this.presetData = aPresetData;
        if ( aPresetData ) {
            if ( aPresetData[0] ) this.item.id = aPresetData[0];
            if ( aPresetData[1] ) this.documentName = aPresetData[1];
            if ( aPresetData[2] ) this.option = sbCommonUtils.extendObject(this.option, aPresetData[2]);
            if ( aPresetData[3] ) this.file2URL = aPresetData[3];
            if ( aPresetData[4] >= this.option["inDepth"] ) this.option["inDepth"] = 0;
        }
        this.httpTask[this.item.id] = 0;
        this.downloadRewriteFiles[this.item.id] = [];
        this.downloadRewriteMap[this.item.id] = {};
    },

    // aRootWindow: window to be captured
    // aIsPartial: (bool) this is a partial capture (only capture selection area)
    // aShowDetail: 
    // aResName: the folder item which is the parent of this captured item
    // aResIndex: the position index where this captured item will be in the parent folder
    //            (1 is the first; 0 is last or first depending on pref "tree.unshift")
    //            (currently it is always 0)
    // aPresetData: data comes from a capture.js, cold be: 
    //              link, indepth, capture-again, capture-again-deep
    captureWindow: function(aRootWindow, aIsPartial, aShowDetail, aResName, aResIndex, aPresetData, aContext, aTitle) {
        this.init(aPresetData);
        this.option["isPartial"] = aIsPartial;
        this.item.chars = this.option["forceUtf8"] ? "UTF-8" : aRootWindow.document.characterSet;
        this.item.source = aRootWindow.location.href;
        //Favicon der angezeigten Seite bestimmen (Unterscheidung zwischen FF2 und FF3 notwendig!)
        if ( "gBrowser" in window && aRootWindow == gBrowser.contentWindow ) {
            this.item.icon = gBrowser.mCurrentBrowser.mIconURL;
        }
        var titles = aRootWindow.document.title ? [aRootWindow.document.title] : [decodeURI(this.item.source)];
        if ( aTitle ) titles[0] = aTitle;
        if ( aIsPartial ) {
            this.selection = aRootWindow.getSelection();
            var lines = this.selection.toString().split("\n");
            for ( var i = 0; i < lines.length; i++ ) {
                lines[i] = lines[i].replace(/\r|\n|\t/g, "");
                if ( lines[i].length > 0 ) titles.push(sbCommonUtils.crop(sbCommonUtils.crop(lines[i], 180, true), 150));
                if ( titles.length > 4 ) break;
            }
            this.item.title = ( titles.length > 0 ) ? titles[1] : titles[0];
        } else {
            this.selection = null;
            this.item.title = titles[0];
        }
        if ( document.getElementById("ScrapBookToolbox") && !document.getElementById("ScrapBookToolbox").hidden ) {
            var modTitle = document.getElementById("ScrapBookEditTitle").value;
            if ( titles.indexOf(modTitle) < 0 ) {
                titles.splice(1, 0, modTitle);
                this.item.title = modTitle;
            }
            this.item.comment = sbCommonUtils.escapeComment(sbPageEditor.COMMENT.value);
        }
        if ( aShowDetail ) {
            var ret = this.showDetailDialog(titles, aResName, aContext);
            if ( ret.result == 0 ) { return null; }
            if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
        }
        this.contentDir = sbCommonUtils.getContentDir(this.item.id);
        var newName = this.saveDocumentInternal(aRootWindow.document, this.documentName);
        if ( this.item.icon && this.item.type != "image" && this.item.type != "file" ) {
            var iconFileName = this.download(this.item.icon);
            this.favicon = iconFileName;
        }
        if ( this.httpTask[this.item.id] == 0 ) {
            setTimeout(function(){ sbCaptureObserverCallback.onAllDownloadsComplete(sbContentSaver.item); }, 100);
        }
        this.addResource(aResName, aResIndex);
        return [sbCommonUtils.splitFileName(newName)[0], this.file2URL, this.item.title];
    },

    captureFile: function(aSourceURL, aReferURL, aType, aShowDetail, aResName, aResIndex, aPresetData, aContext) {
        this.init(aPresetData);
        this.item.title = sbCommonUtils.getFileName(aSourceURL);
        this.item.icon = "moz-icon://" + sbCommonUtils.escapeFileName(this.item.title) + "?size=16";
        this.item.source = aSourceURL;
        this.item.type = aType;
        if ( aShowDetail ) {
            var ret = this.showDetailDialog(null, aResName, aContext);
            if ( ret.result == 0 ) { return null; }
            if ( ret.result == 2 ) { aResName = ret.resURI; aResIndex = 0; }
        }
        this.contentDir = sbCommonUtils.getContentDir(this.item.id);
        this.refURLObj = sbCommonUtils.convertURLToObject(aReferURL);
        var newName = this.saveFileInternal(aSourceURL, this.documentName, aType);
        this.addResource(aResName, aResIndex);
        return [sbCommonUtils.splitFileName(newName)[0], this.file2URL, this.item.title];
    },

    showDetailDialog: function(aTitles, aResURI, aContext) {
        var ret = {
            item: this.item,
            option: this.option,
            titles: aTitles || [this.item.title],
            resURI: aResURI,
            result: 1,
            context: aContext || "capture"
        };
        window.openDialog("chrome://scrapbook/content/detail.xul", "", "chrome,modal,centerscreen,resizable", ret);
        return ret;
    },

    saveDocumentInternal: function(aDocument, aFileKey) {
        var captureType = "";
        var charset = this.option["forceUtf8"] ? "UTF-8" : aDocument.characterSet;
        var contentType = aDocument.contentType;
        if ( ["text/html", "application/xhtml+xml"].indexOf(contentType) < 0 ) {
            if ( !(aDocument.documentElement.nodeName.toUpperCase() == "HTML" && this.option["asHtml"]) ) {
                captureType = "file";
            }
        }
        if ( captureType ) {
            var newLeafName = this.saveFileInternal(aDocument.location.href, aFileKey, captureType, charset);
            return newLeafName;
        }

        // HTML document: save the current DOM

        // frames could have ridiculous malformed location.href, such as "javascript:foo.bar"
        // in this case catch the error and this.refURLObj should remain original (the parent frame)
        try {
            this.refURLObj = sbCommonUtils.convertURLToObject(aDocument.location.href);
        } catch(ex) {
        }

        if ( !this.option["internalize"] ) {
            var useXHTML = (contentType == "application/xhtml+xml") && (!this.option["asHtml"]);
            var [myHTMLFileName, myHTMLFileDone] = this.getUniqueFileName(aFileKey + (useXHTML?".xhtml":".html"), this.refURLObj.spec, aDocument);
            if (myHTMLFileDone) return myHTMLFileName;
            // create a meta refresh for each *.xhtml
            if (useXHTML) {
                var myHTML = '<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;URL=./' + myHTMLFileName + '"></head><body></body></html>';
                var myHTMLFile = this.contentDir.clone();
                myHTMLFile.append(aFileKey + ".html");
                sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
            }
        }

        if ( this.option["rewriteStyles"] ) {
            var [myCSSFileName] = this.getUniqueFileName(aFileKey + ".css", this.refURLObj.spec, aDocument);
        }

        var htmlNode = aDocument.documentElement;
        // cloned frames has contentDocument = null
        // give all frames an unique id for later retrieving
        var frames = htmlNode.getElementsByTagName("frame");
        for (var i=0, len=frames.length; i<len; i++) {
            var frame = frames[i];
            var idx = this.frames.length;
            this.frames[idx] = frame;
            frame.setAttribute("data-sb-frame-id", idx);
        }
        var frames = htmlNode.getElementsByTagName("iframe");
        for (var i=0, len=frames.length; i<len; i++) {
            var frame = frames[i];
            var idx = this.frames.length;
            this.frames[idx] = frame;
            frame.setAttribute("data-sb-frame-id", idx);
        }
        // cloned canvas has no image data
        // give all frames an unique id for later retrieving
        var canvases = htmlNode.getElementsByTagName("canvas");
        for (var i=0, len=canvases.length; i<len; i++) {
            var canvas = canvases[i];
            var idx = this.canvases.length;
            this.canvases[idx] = canvas;
            canvas.setAttribute("data-sb-canvas-id", idx);
        }
        // construct the node list
        var rootNode;
        var headNode;
        if ( this.selection ) {
            var selNodeTree = []; // Is not enough to preserve order of sparsely selected table cells
            for ( var iRange = 0; iRange < this.selection.rangeCount; ++iRange ) {
                var myRange = this.selection.getRangeAt(iRange);
                var curNode = myRange.commonAncestorContainer;
                if ( curNode.nodeName.toUpperCase() == "HTML" ) {
                    // in some case (e.g. view image) the selection is the html node
                    // and will cause subsequent errors.
                    // in this case we just process as if there's no selection
                    this.selection = null;
                    break;
                }

                if ( iRange === 0 ) {
                    rootNode = htmlNode.cloneNode(false);
                    headNode = this.getHeadNode(htmlNode);
                    headNode = headNode ? headNode.cloneNode(true) : aDocument.createElement("head");
                    rootNode.appendChild(headNode);
                    rootNode.appendChild(aDocument.createTextNode("\n"));
                }

                if ( curNode.nodeName == "#text" ) curNode = curNode.parentNode;

                var tmpNodeList = [];
                do {
                    tmpNodeList.unshift(curNode);
                    curNode = curNode.parentNode;
                } while ( curNode.nodeName.toUpperCase() != "HTML" );

                var parentNode = rootNode;
                var branchList = selNodeTree;
                var matchedDepth = -2;
                for( var iDepth = 0; iDepth < tmpNodeList.length; ++iDepth ) {
                    for ( var iBranch = 0; iBranch < branchList.length; ++iBranch ) {
                        if (tmpNodeList[iDepth] === branchList[iBranch].origNode ) {
                            matchedDepth = iDepth;
                            break;
                        }
                    }

                    if (iBranch === branchList.length) {
                        var clonedNode = tmpNodeList[iDepth].cloneNode(false);
                        parentNode.appendChild(clonedNode);
                        branchList.push({
                            origNode: tmpNodeList[iDepth],
                            clonedNode: clonedNode,
                            children: []
                        });
                    }
                    parentNode = branchList[iBranch].clonedNode;
                    branchList = branchList[iBranch].children;
                }
                if ( matchedDepth === tmpNodeList.length - 1 ) {
                    // Perhaps a similar splitter should be added for any node type
                    // but some tags e.g. <td> require special care
                    if (myRange.commonAncestorContainer.nodeName === "#text") {
                        parentNode.appendChild(aDocument.createComment("DOCUMENT_FRAGMENT_SPLITTER"));
                        parentNode.appendChild(aDocument.createTextNode(" … "));
                        parentNode.appendChild(aDocument.createComment("/DOCUMENT_FRAGMENT_SPLITTER"));
                    }
                }
                parentNode.appendChild(aDocument.createComment("DOCUMENT_FRAGMENT"));
                parentNode.appendChild(myRange.cloneContents());
                parentNode.appendChild(aDocument.createComment("/DOCUMENT_FRAGMENT"));
            }
        }
        if ( !this.selection ) {
            rootNode = htmlNode.cloneNode(true);
            headNode = this.getHeadNode(rootNode);
            if (!headNode) {
                headNode = aDocument.createElement("head");
                rootNode.insertBefore(headNode, rootNode.firstChild);
                rootNode.insertBefore(aDocument.createTextNode("\n"), headNode.nextSibling);
            }
        }
        // remove the temporary mapping key
        for (var i=0, len=this.frames.length; i<len; i++) {
            if (!sbCommonUtils.isDeadObject(this.frames[i])) {
                this.frames[i].removeAttribute("data-sb-frame-id");
            }
        }
        for (var i=0, len=this.canvases.length; i<len; i++) {
            if (!sbCommonUtils.isDeadObject(this.canvases[i])) {
                this.canvases[i].removeAttribute("data-sb-canvas-id");
            }
        }
        // process HTML DOM
        this.processDOMRecursively(rootNode, rootNode);

        // process all inline and link CSS, will merge them into index.css later
        var myCSS = "";
        if ( (this.option["styles"] || this.option["keepLink"]) && this.option["rewriteStyles"] ) {
            var myStyleSheets = aDocument.styleSheets;
            for ( var i=0; i<myStyleSheets.length; i++ ) {
                myCSS += this.processCSSRecursively(myStyleSheets[i], aDocument);
            }
            if ( myCSS ) {
                var newLinkNode = aDocument.createElement("link");
                newLinkNode.setAttribute("media", "all");
                newLinkNode.setAttribute("href", myCSSFileName);
                newLinkNode.setAttribute("type", "text/css");
                newLinkNode.setAttribute("rel", "stylesheet");
                headNode.appendChild(aDocument.createTextNode("\n"));
                headNode.appendChild(newLinkNode);
                headNode.appendChild(aDocument.createTextNode("\n"));
            }
        }

        // change the charset to UTF-8
        // also change the meta tag; generate one if none found
        if ( this.option["forceUtf8"] ) {
            var metas = rootNode.getElementsByTagName("meta"), meta, hasmeta = false;
            for (var i=0, len=metas.length; i<len; ++i) {
                meta = metas[i];
                if (meta.hasAttribute("http-equiv") && meta.hasAttribute("content") &&
                    meta.getAttribute("http-equiv").toLowerCase() == "content-type" && 
                    meta.getAttribute("content").match(/^[^;]*;\s*charset=(.*)$/i) ) {
                    hasmeta = true;
                    meta.setAttribute("content", "text/html; charset=UTF-8");
                } else if ( meta.hasAttribute("charset") ) {
                    hasmeta = true;
                    meta.setAttribute("charset", "UTF-8");
                }
            }
            if (!hasmeta) {
                var metaNode = aDocument.createElement("meta");
                metaNode.setAttribute("charset", "UTF-8");
                headNode.insertBefore(aDocument.createTextNode("\n"), headNode.firstChild);
                headNode.insertBefore(metaNode, headNode.firstChild);
                headNode.insertBefore(aDocument.createTextNode("\n"), headNode.firstChild);
            }
        }

        // generate the HTML and CSS file and save
        var myHTML = this.doctypeToString(aDocument.doctype) + sbCommonUtils.surroundByTags(rootNode, rootNode.innerHTML + "\n");
        if ( this.option["internalize"] ) {
            var myHTMLFile = this.option["internalize"];
        } else {
            var myHTMLFile = this.contentDir.clone();
            myHTMLFile.append(myHTMLFileName);
        }
        sbCommonUtils.writeFile(myHTMLFile, myHTML, charset);
        this.downloadRewriteFiles[this.item.id].push([myHTMLFile, charset]);
        if ( myCSS ) {
            var myCSSFile = this.contentDir.clone();
            myCSSFile.append(myCSSFileName);
            sbCommonUtils.writeFile(myCSSFile, myCSS, charset);
            this.downloadRewriteFiles[this.item.id].push([myCSSFile, charset]);
        }
        return myHTMLFile.leafName;
    },

    saveFileInternal: function(aFileURL, aFileKey, aCaptureType, aCharset) {
        if ( !aFileKey ) aFileKey = "file" + Math.random().toString();
        var urlObj = sbCommonUtils.convertURLToObject(aFileURL);
        if ( !this.refURLObj ) {
            this.refURLObj = urlObj;
        }
        var newFileName = this.download(aFileURL);
        if (newFileName) {
            if ( aCaptureType == "image" ) {
                var myHTML = '<html><head><meta charset="UTF-8"></head><body><img src="' + sbCommonUtils.escapeHTML(sbCommonUtils.escapeFileName(newFileName)) + '"></body></html>';
            } else {
                var myHTML = '<html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;URL=./' + sbCommonUtils.escapeHTML(sbCommonUtils.escapeFileName(newFileName)) + '"></head><body></body></html>';
            }
            if ( this.isMainFrame ) {
                this.item.icon = "moz-icon://" + sbCommonUtils.escapeFileName(newFileName) + "?size=16";
                this.item.type = aCaptureType;
                this.item.chars = aCharset || "";
            }
        } else {
            var myHTML = "";
        }
        var myHTMLFile = this.contentDir.clone();
        myHTMLFile.append(aFileKey + ".html");
        sbCommonUtils.writeFile(myHTMLFile, myHTML, "UTF-8");
        this.downloadRewriteFiles[this.item.id].push([myHTMLFile, "UTF-8"]);
        return myHTMLFile.leafName;
    },

    // aResName is null if it's not the main document of an indepth capture
    // set treeRes to the created resource or null if aResName is not defined
    addResource: function(aResName, aResIndex) {
        this.treeRes = null;
        if ( !aResName ) return;
        // We are during a capture process, temporarily set marked and no icon
        var [_type, _icon] = [this.item.type, this.item.icon];
        [this.item.type, this.item.icon] = ["marked", ""];
        this.treeRes = sbDataSource.addItem(this.item, aResName, aResIndex);
        [this.item.type, this.item.icon] = [_type, _icon];
        sbCommonUtils.rebuildGlobal();
        if ( "sbBrowserOverlay" in window ) sbBrowserOverlay.updateFolderPref(aResName);
    },


    removeNodeFromParent: function(aNode) {
        var newNode = aNode.ownerDocument.createTextNode("");
        aNode.parentNode.replaceChild(newNode, aNode);
        aNode = newNode;
        return aNode;
    },

    doctypeToString: function(aDoctype) {
        if ( !aDoctype ) return "";
        var ret = "<!DOCTYPE " + aDoctype.name;
        if ( aDoctype.publicId ) ret += ' PUBLIC "' + aDoctype.publicId + '"';
        if ( aDoctype.systemId ) ret += ' "'        + aDoctype.systemId + '"';
        ret += ">\n";
        return ret;
    },

    getHeadNode: function(aNode) {
        var headNode = aNode.getElementsByTagName("head")[0];
        if (!headNode) {
            var elems = aNode.childNodes;
            for (var i=0, I=elems.length; i<I; i++) {
                if (elems[i].nodeType == 1) {
                    if (elems[i].nodeName.toUpperCase() == "HEAD") {
                        headNode = elems[i];
                    } else {
                        break;
                    }
                }
            }
        }
        return headNode;
    },


    processDOMRecursively: function(startNode, rootNode) {
        for ( var curNode = startNode.firstChild; curNode != null; curNode = curNode.nextSibling ) {
            if ( curNode.nodeName == "#text" || curNode.nodeName == "#comment" ) continue;
            curNode = this.inspectNode(curNode, rootNode);
            this.processDOMRecursively(curNode, rootNode);
        }
    },

    inspectNode: function(aNode, rootNode) {
        switch ( aNode.nodeName.toLowerCase() ) {
            case "img": 
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("src")) ) break;
                    if ( this.option["images"] ) {
                        var aFileName = this.download(aNode.src);
                        if (aFileName) aNode.setAttribute("src", sbCommonUtils.escapeFileName(aFileName));
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("src", aNode.src);
                    } else {
                        aNode.setAttribute("src", "about:blank");
                    }
                }
                if ( aNode.hasAttribute("srcset") ) {
                    var that = this;
                    aNode.setAttribute("srcset", (function(srcset){
                        return srcset.replace(/(\s*)([^ ,][^ ]*[^ ,])(\s*(?: [^ ,]+)?\s*(?:,|$))/g, function(m, m1, m2, m3){
                            if ( that.option["internalize"] && this.isInternalized(m2) ) return m;
                            var url = sbCommonUtils.resolveURL(that.refURLObj.spec, m2);
                            if ( that.option["images"] ) {
                                var aFileName = that.download(url);
                                if (aFileName) return m1 + sbCommonUtils.escapeFileName(aFileName) + m3;
                            } else if ( that.option["keepLink"] ) {
                                return m1 + url + m3;
                            } else {
                                return m1 + "about:blank" + m3;
                            }
                            return m;
                        });
                    })(aNode.getAttribute("srcset")));
                }
                break;
            case "embed": 
            case "audio":
            case "video":
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] && aNode.getAttribute("src").indexOf("://") == -1 ) break;
                    if ( this.option["media"] ) {
                        var aFileName = this.download(aNode.src);
                        if (aFileName) aNode.setAttribute("src", sbCommonUtils.escapeFileName(aFileName));
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("src", aNode.src);
                    } else {
                        aNode.setAttribute("src", "about:blank");
                    }
                }
                break;
            case "source":  // in <picture>, <audio> and <video>
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] && aNode.getAttribute("src").indexOf("://") == -1 ) break;
                    if ( this.option["media"] ) {
                        var aFileName = this.download(aNode.src);
                        if (aFileName) aNode.setAttribute("src", sbCommonUtils.escapeFileName(aFileName));
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("src", aNode.src);
                    } else {
                        aNode.setAttribute("src", "about:blank");
                    }
                }
                if ( aNode.hasAttribute("srcset") ) {
                    var that = this;
                    aNode.setAttribute("srcset", (function(srcset){
                        return srcset.replace(/(\s*)([^ ,][^ ]*[^ ,])(\s*(?: [^ ,]+)?\s*(?:,|$))/g, function(m, m1, m2, m3){
                            if ( that.option["internalize"] && this.isInternalized(m2) ) return m;
                            var url = sbCommonUtils.resolveURL(that.refURLObj.spec, m2);
                            if ( that.option["media"] ) {
                                var aFileName = that.download(url);
                                if (aFileName) return m1 + sbCommonUtils.escapeFileName(aFileName) + m3;
                            } else if ( that.option["keepLink"] ) {
                                return m1 + url + m3;
                            } else {
                                return m1 + "about:blank" + m3;
                            }
                            return m;
                        });
                    })(aNode.getAttribute("srcset")));
                }
                break;
            case "object": 
                if ( aNode.hasAttribute("data") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("data")) ) break;
                    if ( this.option["media"] ) {
                        var aFileName = this.download(aNode.data);
                        if (aFileName) aNode.setAttribute("data", sbCommonUtils.escapeFileName(aFileName));
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("data", aNode.src);
                    } else {
                        aNode.setAttribute("data", "about:blank");
                    }
                }
                break;
            case "applet": 
                if ( aNode.hasAttribute("archive") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("archive")) ) break;
                    var url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("archive"));
                    if ( this.option["media"] ) {
                        var aFileName = this.download(url);
                        if (aFileName) aNode.setAttribute("archive", sbCommonUtils.escapeFileName(aFileName));
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("archive", url);
                    } else {
                        aNode.setAttribute("archive", "about:blank");
                    }
                }
                break;
            case "canvas":
                if ( this.option["media"] && !this.option["script"] ) {
                    var canvasOrig = this.canvases[aNode.getAttribute("data-sb-canvas-id")];
                    var canvasScript = aNode.ownerDocument.createElement("script");
                    canvasScript.textContent = "(" + this.inspectNodeSetCanvasData.toString().replace(/\s+/g, " ") + ")('" + canvasOrig.toDataURL() + "')";
                    aNode.parentNode.insertBefore(canvasScript, aNode.nextSibling);
                }
                aNode.removeAttribute("data-sb-canvas-id");
                break;
            case "track":  // in <audio> and <video>
                if ( aNode.hasAttribute("src") ) {
                    if ( this.option["internalize"] ) break;
                    aNode.setAttribute("src", aNode.src);
                }
                break;
            case "body": 
            case "table": 
            case "tr": 
            case "th": 
            case "td": 
                // handle "background" attribute (HTML5 deprecated)
                if ( aNode.hasAttribute("background") ) {
                    if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("background")) ) break;
                    var url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("background"));
                    if ( this.option["images"] ) {
                        var aFileName = this.download(url);
                        if (aFileName) aNode.setAttribute("background", sbCommonUtils.escapeFileName(aFileName));
                    } else if ( this.option["keepLink"] ) {
                        aNode.setAttribute("background", url);
                    } else {
                        aNode.setAttribute("background", "about:blank");
                    }
                }
                break;
            case "input": 
                switch (aNode.type.toLowerCase()) {
                    case "image": 
                        if ( aNode.hasAttribute("src") ) {
                            if ( this.option["internalize"] && this.isInternalized(aNode.getAttribute("src")) ) break;
                            if ( this.option["images"] ) {
                                var aFileName = this.download(aNode.src);
                                if (aFileName) aNode.setAttribute("src", sbCommonUtils.escapeFileName(aFileName));
                            } else if ( this.option["keepLink"] ) {
                                aNode.setAttribute("src", aNode.src);
                            } else {
                                aNode.setAttribute("src", "about:blank");
                            }
                        }
                        break;
                }
                break;
            case "link": 
                // gets "" if rel attribute not defined
                switch ( aNode.rel.toLowerCase() ) {
                    case "stylesheet":
                        if ( this.option["internalize"] ) break;
                        if ( aNode.hasAttribute("href") ) {
                            if ( sbCommonUtils.getSbObjectType(aNode) == "stylesheet" ) {
                                // a special stylesheet used by scrapbook, keep it intact
                                // (it should use an absolute link or a chrome link, which don't break after capture)
                            } else if ( aNode.href.indexOf("chrome://") == 0 ) {
                                // a special stylesheet used by scrapbook or other addons/programs, keep it intact
                            } else if ( this.option["styles"] && this.option["rewriteStyles"] ) {
                                // capturing styles with rewrite, the style should be already processed
                                // in saveDocumentInternal => processCSSRecursively
                                // remove it here with safety
                                return this.removeNodeFromParent(aNode);
                            } else if ( this.option["styles"] && !this.option["rewriteStyles"] ) {
                                // capturing styles with no rewrite, download it and rewrite the link
                                var aFileName = this.download(aNode.href);
                                if (aFileName) aNode.setAttribute("href", sbCommonUtils.escapeFileName(aFileName));
                            } else if ( !this.option["styles"] && this.option["keepLink"] ) {
                                // link to the source css file
                                aNode.setAttribute("href", aNode.href);
                            } else if ( !this.option["styles"] && !this.option["keepLink"] ) {
                                // not capturing styles, set it blank
                                aNode.setAttribute("href", "about:blank");
                            }
                        }
                        break;
                    case "shortcut icon":
                    case "icon":
                        if ( aNode.hasAttribute("href") ) {
                            if ( this.option["internalize"] ) break;
                            var aFileName = this.download(aNode.href);
                            if (aFileName) {
                                aNode.setAttribute("href", sbCommonUtils.escapeFileName(aFileName));
                                if ( this.isMainFrame && !this.favicon ) this.favicon = aFileName;
                            }
                        }
                        break;
                    default:
                        if ( aNode.hasAttribute("href") ) {
                            if ( this.option["internalize"] ) break;
                            aNode.setAttribute("href", aNode.href);
                        }
                        break;
                }
                break;
            case "base": 
                if ( aNode.hasAttribute("href") ) {
                    if ( this.option["internalize"] ) break;
                    aNode.setAttribute("href", "");
                }
                break;
            case "style": 
                if ( sbCommonUtils.getSbObjectType(aNode) == "stylesheet" ) {
                    // a special stylesheet used by scrapbook, keep it intact
                } else if ( !this.option["styles"] && !this.option["keepLink"] ) {
                    // not capturing styles, remove it
                    return this.removeNodeFromParent(aNode);
                } else if ( this.option["rewriteStyles"] ) {
                    // capturing styles with rewrite, the styles should be already processed
                    // in saveDocumentInternal => processCSSRecursively
                    // remove it here with safety
                    return this.removeNodeFromParent(aNode);
                }
                break;
            case "script": 
            case "noscript": 
                if ( this.option["script"] ) {
                    if ( aNode.hasAttribute("src") ) {
                        if ( this.option["internalize"] ) break;
                        var aFileName = this.download(aNode.src);
                        if (aFileName) aNode.setAttribute("src", sbCommonUtils.escapeFileName(aFileName));
                    }
                } else {
                    return this.removeNodeFromParent(aNode);
                }
                break;
            case "a": 
            case "area": 
                if ( this.option["internalize"] ) break;
                if ( !aNode.href ) {
                    break;
                } else if ( aNode.href.match(/^javascript:/i) && !this.option["script"] ) {
                    aNode.removeAttribute("href");
                    break;
                }
                // adjustment for hash links targeting the current page
                var urlParts = sbCommonUtils.splitURLByAnchor(aNode.href);
                if ( urlParts[0] === sbCommonUtils.splitURLByAnchor(aNode.ownerDocument.location.href)[0] ) {
                    // This link targets the current page.
                    if ( urlParts[1] === '' || urlParts[1] === '#' ) {
                        // link to the current page as a whole
                        aNode.setAttribute('href', '#');
                        break;
                    }
                    // For full capture (no selection), relink to the captured page.
                    // For partial capture, the captured page could be incomplete,
                    // relink to the captured page only when the target node is included in the selected fragment.
                    var hasLocalTarget = !this.selection;
                    if ( !hasLocalTarget && rootNode.querySelector ) {
                        // Element.querySelector() is available only for Firefox >= 3.5
                        // For those with no support, simply skip the relink check.
                        var targetId = decodeURIComponent(urlParts[1].substr(1)).replace(/\W/g, '\\$&');
                        if ( rootNode.querySelector('[id="' + targetId + '"], a[name="' + targetId + '"]') ) {
                            hasLocalTarget = true;
                        }
                    }
                    if ( hasLocalTarget ) {
                        // if the original link is already a pure hash, 
                        // skip the rewrite to prevent a potential encoding change
                        if (aNode.getAttribute('href').charAt(0) != "#") {
                            aNode.setAttribute('href', urlParts[1]);
                        }
                        break;
                    }
                }
                // determine whether to download (copy) the link target file
                switch (sbContentSaver.option["downLinkMethod"]) {
                    case 2: // check url and header filename
                        var aFileName = this.download(aNode.href, true);
                        if (aFileName) aNode.setAttribute("href", sbCommonUtils.escapeFileName(aFileName));
                        break;
                    case 1: // check url filename
                        var [,ext] = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aNode.href));
                        if (this.downLinkFilter(ext)) {
                            var aFileName = this.download(aNode.href);
                            if (aFileName) aNode.setAttribute("href", sbCommonUtils.escapeFileName(aFileName));
                            break;
                        }
                    case 0: // no check
                    default:
                        if ( sbContentSaver.option["inDepth"] > 0 ) {
                            // do not copy, but add to the link list if it's a work of deep capture
                            sbContentSaver.linkURLs.push(aNode.href);
                        }
                        aNode.setAttribute("href", aNode.href);
                        break;
                }
                break;
            case "form": 
                if ( aNode.hasAttribute("action") ) {
                    if ( this.option["internalize"] ) break;
                    aNode.setAttribute("action", aNode.action);
                }
                break;
            case "meta": 
                if ( !aNode.hasAttribute("content") ) break;
                if ( aNode.hasAttribute("property") ) {
                    if ( this.option["internalize"] ) break;
                    switch ( aNode.getAttribute("property").toLowerCase() ) {
                        case "og:image":
                        case "og:image:url":
                        case "og:image:secure_url":
                        case "og:audio":
                        case "og:audio:url":
                        case "og:audio:secure_url":
                        case "og:video":
                        case "og:video:url":
                        case "og:video:secure_url":
                        case "og:url":
                            var url = sbCommonUtils.resolveURL(this.refURLObj.spec, aNode.getAttribute("content"));
                            aNode.setAttribute("content", url);
                            break;
                    }
                }
                if ( aNode.hasAttribute("http-equiv") ) {
                    switch ( aNode.getAttribute("http-equiv").toLowerCase() ) {
                        case "refresh":
                            if ( aNode.getAttribute("content").match(/^(\d+;\s*url=)(.*)$/i) ) {
                                var url = sbCommonUtils.resolveURL(this.refURLObj.spec, RegExp.$2);
                                aNode.setAttribute("content", RegExp.$1 + url);
                                // add to the link list if it's a work of deep capture
                                if ( this.option["inDepth"] > 0 ) this.linkURLs.push(url);
                            }
                            break;
                    }
                }
                break;
            case "frame": 
            case "iframe": 
                if ( this.option["internalize"] ) break;
                if ( this.option["frames"] ) {
                    this.isMainFrame = false;
                    if ( this.selection ) this.selection = null;
                    var tmpRefURL = this.refURLObj;
                    // retrieve contentDocument from the corresponding real frame
                    var idx = aNode.getAttribute("data-sb-frame-id");
                    var newFileName = this.saveDocumentInternal(this.frames[idx].contentDocument, this.documentName + "_" + (parseInt(idx)+1));
                    aNode.setAttribute("src", sbCommonUtils.escapeFileName(newFileName));
                    this.refURLObj = tmpRefURL;
                } else if ( this.option["keepLink"] ) {
                    aNode.setAttribute("src", aNode.src);
                } else {
                    aNode.setAttribute("src", "about:blank");
                }
                aNode.removeAttribute("data-sb-frame-id");
                break;
        }
        if ( aNode.style && aNode.style.cssText ) {
            var newCSStext = this.inspectCSSText(aNode.style.cssText, this.refURLObj.spec, "image");
            if ( newCSStext ) aNode.setAttribute("style", newCSStext);
        }
        if ( !this.option["script"] ) {
            // general: remove on* attributes
            var attrs = aNode.attributes;
            for (var i = 0; i < attrs.length; i++) {
                if (attrs[i].name.toLowerCase().indexOf("on") == 0) {
                    aNode.removeAttribute(attrs[i].name);
                    i--;  // removing an attribute shrinks the list
                }
            }
            // other specific
            aNode.removeAttribute("contextmenu");
        }
        if (canvasScript) {
            // special handle: shift to the script node so that it won't get removed on next process
            return canvasScript;
        }
        return aNode;
    },

    inspectNodeSetCanvasData: function (data) {
      var scripts = document.getElementsByTagName("script");
      var script = scripts[scripts.length-1], canvas = script.previousSibling;
      var img = new Image();
      img.onload = function(){ canvas.getContext('2d').drawImage(img, 0, 0); };
      img.src = data;
      script.parentNode.removeChild(script);
    },

    processCSSRecursively: function(aCSS, aDocument, isImport) {
        // aCSS is invalid or disabled, skip it
        if (!aCSS || aCSS.disabled) return "";
        // a special stylesheet used by scrapbook, skip parsing it
        if (aCSS.ownerNode && sbCommonUtils.getSbObjectType(aCSS.ownerNode) == "stylesheet") return "";
        // a special stylesheet used by scrapbook or other addons/programs, skip parsing it
        if (aCSS.href && aCSS.href.indexOf("chrome://") == 0) return "";
        var content = "";
        // sometimes <link> cannot access remote css
        // and aCSS.cssRules fires an error (instead of returning undefined)...
        // we need this try block to catch that
        var skip = false;
        try {
            if (!aCSS.cssRules) skip = true;
        } catch(ex) {
            sbCommonUtils.warn(sbCommonUtils.lang("ERR_FAIL_GET_CSS", aCSS.href, aDocument.location.href, ex));
                content += "/* ERROR: Unable to access this CSS */\n\n";
            skip = true;
        }
        if (!skip) content += this.processCSSRules(aCSS, aDocument, "");
        var media = aCSS.media.mediaText;
        if (media) {
            // omit "all" since it's defined in the link tag
            if (media !== "all") {
                content = "@media " + media + " {\n" + content + "}\n";
            }
            media = " (@media " + media + ")";
        }
        if (aCSS.href) {
            if (!isImport) {
                content = "/* ::::: " + aCSS.href + media + " ::::: */\n\n" + content;
            } else {
                content = "/* ::::: " + "(import) " + aCSS.href + media + " ::::: */\n" + content + "/* ::::: " + "(end import)" + " ::::: */\n";
            }
        } else {
            content = "/* ::::: " + "[internal]" + media + " ::::: */\n\n" + content;
        }
        return content;
    },

    processCSSRules: function(aCSS, aDocument, indent) {
        var content = "";
        Array.forEach(aCSS.cssRules, function(cssRule) {
            switch (cssRule.type) {
                case Components.interfaces.nsIDOMCSSRule.IMPORT_RULE: 
                    content += this.processCSSRecursively(cssRule.styleSheet, aDocument, true);
                    break;
                case Components.interfaces.nsIDOMCSSRule.FONT_FACE_RULE: 
                    var cssText = indent + this.inspectCSSText(cssRule.cssText, aCSS.href, "font");
                    if (cssText) content += cssText + "\n";
                    break;
                case Components.interfaces.nsIDOMCSSRule.MEDIA_RULE: 
                    cssText = indent + "@media " + cssRule.conditionText + " {\n"
                        + this.processCSSRules(cssRule, aDocument, indent + "  ")
                        + indent + "}";
                    if (cssText) content += cssText + "\n";
                    break;
                case Components.interfaces.nsIDOMCSSRule.STYLE_RULE: 
                    // if script is used, preserve all css in case it's used by a dynamic generated DOM
                    if (this.option["script"] || verifySelector(aDocument, cssRule.selectorText)) {
                        var cssText = indent + this.inspectCSSText(cssRule.cssText, aCSS.href, "image");
                        if (cssText) content += cssText + "\n";
                    }
                    break;
                default: 
                    var cssText = indent + this.inspectCSSText(cssRule.cssText, aCSS.href, "image");
                    if (cssText) content += cssText + "\n";
                    break;
            }
        }, this);
        return content;

        function verifySelector(doc, selectorText) {
            // Firefox < 3.5: older Firefox versions don't support querySelector, simply return true
            if (!doc.querySelector) return true;
            try {
                if (doc.querySelector(selectorText)) return true;
                // querySelector of selectors like a:hover or so always return null
                // preserve pseudo-class and pseudo-elements if their non-pseudo versions exist
                var hasPseudo = false;
                var startPseudo = false;
                var depseudoSelectors = [""];
                selectorText.replace(
                    /(,\s+)|(\s+)|((?:[\-0-9A-Za-z_\u00A0-\uFFFF]|\\[0-9A-Fa-f]{1,6} ?|\\.)+)|(\[(?:"(?:\\.|[^"])*"|\\.|[^\]])*\])|(.)/g,
                    function(){
                        if (arguments[1]) {
                            depseudoSelectors.push("");
                            startPseudo = false;
                        } else if (arguments[5] == ":") {
                            hasPseudo = true;
                            startPseudo = true;
                        } else if (startPseudo && (arguments[3] || arguments[5])) {
                        } else if (startPseudo) {
                            startPseudo = false;
                            depseudoSelectors[depseudoSelectors.length - 1] += arguments[0];
                        } else {
                            depseudoSelectors[depseudoSelectors.length - 1] += arguments[0];
                        }
                        return arguments[0];
                    }
                );
                if (hasPseudo) {
                    for (var i=0, I=depseudoSelectors.length; i<I; ++i) {
                        if (depseudoSelectors[i] === "" || doc.querySelector(depseudoSelectors[i])) return true;
                    };
                }
            } catch(ex) {
            }
            return false;
        }
    },

    inspectCSSText: function(aCSSText, aCSSHref, type) {
        if (!aCSSHref) aCSSHref = this.refURLObj.spec;
        // CSS get by .cssText is always url("something-with-\"double-quote\"-escaped")
        // or url(something) (e.g. background-image in Firefox < 3.6)
        // and no CSS comment is in, so we can parse it safely with this RegExp.
        var regex = / url\(\"((?:\\.|[^"])+)\"\)| url\(((?:\\.|[^)])+)\)/g;
        aCSSText = aCSSText.replace(regex, function() {
            var dataURL = arguments[1] || arguments[2];
            if (dataURL.indexOf("data:") === 0 && !sbContentSaver.option["saveDataURI"]) return ' url("' + dataURL + '")';
            if ( sbContentSaver.option["internalize"] && sbContentSaver.isInternalized(dataURL) ) return ' url("' + dataURL + '")';
            dataURL = sbCommonUtils.resolveURL(aCSSHref, dataURL);
            switch (type) {
                case "image":
                    if (sbContentSaver.option["images"]) {
                        var dataFile = sbContentSaver.download(dataURL);
                        if (dataFile) dataURL = sbCommonUtils.escapeHTML(sbCommonUtils.escapeFileName(dataFile));
                    } else if (!sbContentSaver.option["keepLink"]) {
                        dataURL = "about:blank";
                    }
                    break;
                case "font":
                    if (sbContentSaver.option["fonts"]) {
                        var dataFile = sbContentSaver.download(dataURL);
                        if (dataFile) dataURL = sbCommonUtils.escapeHTML(sbCommonUtils.escapeFileName(dataFile));
                    } else if (!sbContentSaver.option["keepLink"]) {
                        dataURL = "about:blank";
                    }
                    break;
            }
            return ' url("' + dataURL + '")';
        });
        return aCSSText;
    },

    // aURLSpec is an absolute URL
    //
    // Converting a data URI to nsIURL will throw an NS_ERROR_MALFORMED_URI error
    // if the data URI is large (e.g. 5 MiB), so we manipulate the URL string instead
    // of converting the URI to nsIURI initially.
    //
    // aIsLinkFilter is specific for download link filter
    download: function(aURLSpec, aIsLinkFilter) {
        if ( !aURLSpec ) return "";
        var sourceURL = aURLSpec;

        try {
            if (sourceURL.indexOf("chrome:") === 0) {
                // never download "chrome://" resources
                return "";
            } else if ( sourceURL.indexOf("http:") === 0 || sourceURL.indexOf("https:") === 0 || sourceURL.indexOf("ftp:") === 0 ) {
                var targetDir = this.option["internalize"] ? this.option["internalize"].parent : this.contentDir.clone();
                var hashKey = sbCommonUtils.getUUID();
                var fileName, isDuplicate;
                try {
                    var channel = sbCommonUtils.IO.newChannel(sourceURL, null, null);
                    channel.asyncOpen({
                        _stream: null,
                        _file: null,
                        _skipped: false,
                        onStartRequest: function (aRequest, aContext) {
                            // if header Content-Disposition is defined, use it
                            try {
                                fileName = aRequest.contentDispositionFilename;
                                var [, ext] = sbCommonUtils.splitFileName(fileName);
                            } catch (ex) {}
                            // if no ext defined, try header Content-Type
                            if (!fileName) {
                                var [base, ext] = sbCommonUtils.splitFileName(sbCommonUtils.getFileName(aRequest.name));
                                if (!ext) {
                                    ext = sbCommonUtils.getMimePrimaryExtension(aRequest.contentType, ext) || "dat";
                                }
                                fileName = base + "." + ext;
                            }
                            // apply the filter
                            if (aIsLinkFilter) {
                                var toDownload = sbContentSaver.downLinkFilter(ext);
                                if (!toDownload) {
                                    if ( sbContentSaver.option["inDepth"] > 0 ) {
                                        // do not copy, but add to the link list if it's a work of deep capture
                                        sbContentSaver.linkURLs.push(sourceURL);
                                    }
                                    sbContentSaver.downloadRewriteMap[sbContentSaver.item.id][hashKey] = sourceURL;
                                    this._skipped = true;
                                    channel.cancel(Components.results.NS_BINDING_ABORTED);
                                    return;
                                }
                            }
                            // determine the filename and check for duplicate
                            [fileName, isDuplicate] = sbContentSaver.getUniqueFileName(fileName, sourceURL);
                            sbContentSaver.downloadRewriteMap[sbContentSaver.item.id][hashKey] = fileName;
                            if (isDuplicate) {
                                this._skipped = true;
                                channel.cancel(Components.results.NS_BINDING_ABORTED);
                            }
                        },
                        onStopRequest: function (aRequest, aContext, aStatusCode) {
                            if (!!this._stream) {
                                this._stream.close();
                            }
                            if (!this._skipped && aStatusCode != Components.results.NS_OK) {
                                // download failed, remove the file and use the original URL
                                this._file.remove(true);
                                sbContentSaver.downloadRewriteMap[sbContentSaver.item.id][hashKey] = sourceURL;
                                // crop to prevent large dataURI masking the exception info, especially dataURIs
                                sourceURL = sbCommonUtils.crop(sourceURL, 1024);
                                sbCommonUtils.error(sbCommonUtils.lang("ERR_FAIL_DOWNLOAD_FILE", sourceURL, "download channel fail"));
                            }
                            sbCaptureObserverCallback.onDownloadComplete(sbContentSaver.item);
                        },
                        onDataAvailable: function (aRequest, aContext, aInputStream, aOffset, aCount) {
                            if (!this._stream) {
                                this._file = targetDir.clone(); this._file.append(fileName);
                                var ostream = Components.classes['@mozilla.org/network/file-output-stream;1']
                                        .createInstance(Components.interfaces.nsIFileOutputStream);
                                ostream.init(this._file, -1, 0666, 0);
                                var bostream = Components.classes['@mozilla.org/network/buffered-output-stream;1']
                                        .createInstance(Components.interfaces.nsIBufferedOutputStream);
                                bostream.init(ostream, 1024 * 1024);
                                this._stream = bostream;
                            }
                            this._stream.writeFrom(aInputStream, aCount);
                            this._stream.flush();
                            sbCaptureObserverCallback.onDownloadProgress(sbContentSaver.item, fileName, aOffset);
                        }
                    }, null);
                } catch (ex) {
                    sbContentSaver.httpTask[sbContentSaver.item.id]--;
                    throw ex;
                }
                sbContentSaver.httpTask[sbContentSaver.item.id]++;
                return "scrapbook://" + hashKey;
            } else if ( sourceURL.indexOf("file:") === 0 ) {
                // if sourceURL is not targeting a file, fail out
                var sourceFile = sbCommonUtils.convertURLToFile(sourceURL);
                if ( !(sourceFile.exists() && sourceFile.isFile()) ) return "";
                // apply the filter
                // Download all non-HTML local files.
                // This is primarily to enable the combine wizard to capture all "file:" data.
                if (aIsLinkFilter) {
                    var mime = sbCommonUtils.getFileMime(sourceFile);
                    if ( ["text/html", "application/xhtml+xml"].indexOf(mime) >= 0 ) {
                        if ( this.option["inDepth"] > 0 ) {
                            // do not copy, but add to the link list if it's a work of deep capture
                            this.linkURLs.push(sourceURL);
                        }
                        return "";
                    }
                }
                // determine the filename
                var targetDir = this.option["internalize"] ? this.option["internalize"].parent : this.contentDir.clone();
                var fileName, isDuplicate;
                fileName = sbCommonUtils.getFileName(sourceURL);
                // if the target file exists and has same content as the source file, skip copy
                // This kind of duplicate is probably a result of Firefox making a relative link absolute
                // during a copy/cut.
                fileName = sbCommonUtils.validateFileName(fileName);
                var targetFile = targetDir.clone(); targetFile.append(fileName);
                if (sbCommonUtils.compareFiles(sourceFile, targetFile)) {
                    return fileName;
                }
                // check for duplicate
                [fileName, isDuplicate] = sbContentSaver.getUniqueFileName(fileName, sourceURL);
                if (isDuplicate) return fileName;
                // set task
                this.httpTask[this.item.id]++;
                var item = this.item;
                setTimeout(function(){ sbCaptureObserverCallback.onDownloadComplete(item); }, 0);
                // do the copy
                sourceFile.copyTo(targetDir, fileName);
                return fileName;
            } else if ( sourceURL.indexOf("data:") === 0 ) {
                // download "data:" only if option on
                if (!this.option["saveDataURI"]) {
                    return "";
                }
                var { mime, charset, base64, data } = sbCommonUtils.parseDataURI(sourceURL);
                var dataURIBytes = base64 ? atob(data) : decodeURIComponent(data); // in bytes
                // use sha1sum as the filename
                var dataURIFileName = sbCommonUtils.sha1(dataURIBytes, "BYTES") + "." + (sbCommonUtils.getMimePrimaryExtension(mime, null) || "dat");
                var targetDir = this.option["internalize"] ? this.option["internalize"].parent : this.contentDir.clone();
                var fileName, isDuplicate;
                // if the target file exists and has same content as the dataURI, skip copy
                fileName = dataURIFileName;
                var targetFile = targetDir.clone(); targetFile.append(fileName);
                if (targetFile.exists() && targetFile.isFile()) {
                    if (sbCommonUtils.readFile(targetFile) === dataURIBytes) {
                        return fileName;
                    }
                }
                // determine the filename and check for duplicate
                [fileName, isDuplicate] = sbContentSaver.getUniqueFileName(fileName, sourceURL);
                if (isDuplicate) return fileName;
                // set task
                this.httpTask[this.item.id]++;
                var item = this.item;
                setTimeout(function(){ sbCaptureObserverCallback.onDownloadComplete(item); }, 0);
                // do the save
                var targetFile = targetDir.clone(); targetFile.append(fileName);
                sbCommonUtils.writeFileBytes(targetFile, dataURIBytes);
                return fileName;
            }
        } catch (ex) {
            // crop to prevent large dataURI masking the exception info, especially dataURIs
            sourceURL = sbCommonUtils.crop(sourceURL, 1024);
            if (sourceURL.indexOf("file:") === 0) {
                var msgType = "ERR_FAIL_COPY_FILE";
            } else if (sourceURL.indexOf("data:") === 0) {
                var msgType = "ERR_FAIL_WRITE_FILE";
            } else {
                var msgType = "ERR_FAIL_DOWNLOAD_FILE";
            }
            sbCommonUtils.error(sbCommonUtils.lang(msgType, sourceURL, ex));
        }
        return "";
    },

    downLinkFilter: function(aFileExt) {
        var that = this;
        // use cache if there is the filter is not changed
        if (that.cachedDownLinkFilterSource !== that.option["downLinkFilter"]) {
            that.cachedDownLinkFilterSource = that.option["downLinkFilter"];
            that.cachedDownLinkFilter = (function () {
                var ret = [];
                that.option["downLinkFilter"].split(/[\r\n]/).forEach(function (line) {
                    if (line.charAt(0) === "#") return;
                    try {
                        var regex = new RegExp("^(?:" + line + ")$", "i");
                        ret.push(regex);
                    } catch (ex) {}
                });
                return ret;
            })();
        }
        var toDownload = that.cachedDownLinkFilter.some(function (filter) {
            return filter.test(aFileExt);
        });
        return toDownload;
    },

    /**
     * @return  [(string) newFileName, (bool) isDuplicated]
     */
    getUniqueFileName: function(aSuggestFileName, aSourceURL, aSourceDoc) {
        var newFileName = sbCommonUtils.validateFileName(aSuggestFileName || "untitled");
        var [newFileBase, newFileExt] = sbCommonUtils.splitFileName(newFileName);
        newFileBase = sbCommonUtils.crop(sbCommonUtils.crop(newFileBase, 240, true), 128);
        newFileExt = newFileExt || "dat";
        var sourceURL = sbCommonUtils.splitURLByAnchor(aSourceURL)[0];
        var sourceDoc = aSourceDoc;

        // CI means case insensitive
        var seq = 0;
        newFileName = newFileBase + "." + newFileExt;
        var newFileNameCI = newFileName.toLowerCase();
        while (this.file2URL[newFileNameCI] !== undefined) {
            if (this.file2URL[newFileNameCI] === sourceURL) {
                if (this.file2Doc[newFileNameCI] === sourceDoc || !sourceDoc) {
                    // case 1. this.file2Doc[newFileNameCI] === sourceDoc === undefined
                    // Has been used by a non-HTML-doc file, e.g. <img src="http://some.url/someFile.png">
                    // And now used by a non-HTML-doc file, e.g. <link rel="icon" href="http://some.url/someFile.png">
                    // Action: mark as duplicate and do not download.
                    //
                    // case 2. this.file2Doc[newFileNameCI] === sourceDoc !== undefined
                    // This case is impossible since any two nodes having HTML-doc are never identical.
                    //
                    // case 3. this.file2Doc[newFileNameCI] !== sourceDoc === undefined (bad use case)
                    // Has been used by an HTML doc, e.g. an <iframe src="http://some.url/index_1.html"> saving to index_1.html
                    // And now used as a non-HTML-doc file, e.g. <img src="http://some.url/index_1.html">
                    // Action: mark as duplicate and do not download.
                    return [newFileName, true];
                } else if (!this.file2Doc[newFileNameCI]) {
                    // case 4. undefined === this.file2Doc[newFileNameCI] !== sourceDoc (bad use case)
                    // Has been used by an HTML-doc which had been downloaded as a non-HTML-doc file, e.g. <img src="http://some.url/index_1.html">
                    // And now used by an HTML-doc, e.g. an <iframe src="http://some.url/index_1.html"> saving to index_1.html
                    // Action: mark as non-duplicate and capture the parsed doc,
                    //         and record the sourceDoc so that further usage of sourceURL becomes case 3 or 6.
                    this.file2Doc[newFileNameCI] = sourceDoc;
                    return [newFileName, false];
                }
            }
            // case 5. undefined !== this.file2URL[newFileNameCI] !== sourceURL
            // Action: suggest another name to download.
            //
            // case 6. undefined !== this.file2Doc[newFileNameCI] !== sourceDoc !== undefined
            // Has been used by an HTML-doc, e.g. an <iframe src="http://some.url/index_1.html"> saving to index_1.html
            // And now used by another HTML doc with same sourceURL, e.g. a (indepth) main page http://some.url/index.html saving to index_1.html
            // Action: suggest another name to download the doc.
            newFileName = newFileBase + "_" + sbCommonUtils.pad(++seq, 3) + "." + newFileExt;
            newFileNameCI = newFileName.toLowerCase();
        }
        // case 7. undefined === this.file2URL[newFileNameCI] !== sourceURL
        //         or as a post-renaming-result of case 5 or 6.
        this.file2URL[newFileNameCI] = sourceURL;
        this.file2Doc[newFileNameCI] = sourceDoc;
        return [newFileName, false];
    },

    isInternalized: function (aURI) {
        return aURI.indexOf("://") === -1 && !(aURI.indexOf("data:") === 0);
    },

    restoreFileNameFromHash: function (hash) {
        return hash.replace(/scrapbook:\/\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})/g, function (match, key) {
            var url = sbContentSaver.downloadRewriteMap[sbContentSaver.item.id][key];
            // error handling
            if (!url) return key;
            // if the url contains ":", it is the source absolute url (meaning download fail),
            // and we should not escape it
            if (url.indexOf(":") === -1) {
                url = sbCommonUtils.escapeFileName(url);
            }
            return url;
        });
    },
};


var sbCaptureObserverCallback = {

    trace: function(aText, aMillisec) {
        var status = top.window.document.getElementById("statusbar-display");
        if ( !status ) return;
        status.label = aText;
        if ( aMillisec>0 ) {
            var callback = function() {
                if ( status.label == aText) status.label = "";
            };
            window.setTimeout(callback, aMillisec);
        }
    },

    onDownloadComplete: function(aItem) {
        if ( --sbContentSaver.httpTask[aItem.id] == 0 ) {
            this.onAllDownloadsComplete(aItem);
            return;
        }
        this.trace(sbCommonUtils.lang("CAPTURE", sbContentSaver.httpTask[aItem.id], aItem.title), 0);
    },

    onAllDownloadsComplete: function(aItem) {
        // restore downloaded file names
        sbContentSaver.downloadRewriteFiles[aItem.id].forEach(function (data) {
            var [file, charset] = data;
            var content = sbCommonUtils.convertToUnicode(sbCommonUtils.readFile(file), charset);
            content = sbContentSaver.restoreFileNameFromHash(content);
            sbCommonUtils.writeFile(file, content, charset);
        });

        // fix resource settings after capture complete
        // If it's an indepth capture, sbContentSaver.treeRes will be null for non-main documents,
        // and thus we don't have to update the resource for many times.
        var res = sbContentSaver.treeRes;
        if (res && sbDataSource.exists(res)) {
            sbDataSource.setProperty(res, "type", aItem.type);
            if ( sbContentSaver.favicon ) {
                sbContentSaver.favicon = sbContentSaver.restoreFileNameFromHash(sbContentSaver.favicon);
                aItem.icon = sbCommonUtils.escapeFileName(sbContentSaver.favicon);
            }
            // We replace the "scrapbook://" and skip adding "resource://" to prevent an issue
            // for URLs containing ":", such as "moz-icon://".
            if (aItem.icon) {
                aItem.icon = sbContentSaver.restoreFileNameFromHash(aItem.icon);
                if (aItem.icon.indexOf(":") >= 0) {
                    var iconURL = aItem.icon;
                } else {
                    var iconURL = "resource://scrapbook/data/" + aItem.id + "/" + aItem.icon;
                }
                sbDataSource.setProperty(res, "icon", iconURL);
            }
            sbCommonUtils.rebuildGlobal();
            sbCommonUtils.writeIndexDat(aItem);

            if ( sbContentSaver.option["inDepth"] > 0 && sbContentSaver.linkURLs.length > 0 ) {
                // inDepth capture for "capture-again-deep" is pre-disallowed by hiding the options
                // and should never occur here
                if ( !sbContentSaver.presetData || aContext == "capture-again" ) {
                    sbContentSaver.item.type = "marked";
                    var data = {
                        urls: sbContentSaver.linkURLs,
                        refUrl: sbContentSaver.refURLObj.spec,
                        showDetail: false,
                        resName: null,
                        resIdx: 0,
                        referItem: sbContentSaver.item,
                        option: sbContentSaver.option,
                        file2Url: sbContentSaver.file2URL,
                        preset: null,
                        titles: null,
                        context: "indepth",
                    };
                    window.openDialog("chrome://scrapbook/content/capture.xul", "", "chrome,centerscreen,all,dialog=no", data);
                } else {
                    for ( var i = 0; i < sbContentSaver.linkURLs.length; i++ ) {
                        sbCaptureTask.add(sbContentSaver.linkURLs[i], sbContentSaver.presetData[4] + 1);
                    }
                }
            }
        }

        this.trace(sbCommonUtils.lang("CAPTURE_COMPLETE", aItem.title), 5000);
        this.onCaptureComplete(aItem);
    },

    onDownloadProgress: function(aItem, aFileName, aProgress) {
        this.trace(sbCommonUtils.lang("DOWNLOAD_DATA", aFileName, sbCommonUtils.formatFileSize(aProgress)), 0);
    },

    onCaptureComplete: function(aItem) {
        // aItem is the last item that is captured
        // in a multiple capture it could be null 
        if (aItem) {
            if ( sbDataSource.getProperty(sbCommonUtils.RDF.GetResource("urn:scrapbook:item" + aItem.id), "type") == "marked" ) return;
            if ( sbCommonUtils.getPref("notifyOnComplete", true) ) {
                var icon = aItem.icon ? "resource://scrapbook/data/" + aItem.id + "/" + aItem.icon : sbCommonUtils.getDefaultIcon();
                var title = "ScrapBook: " + sbCommonUtils.lang("CAPTURE_COMPLETE");
                var text = sbCommonUtils.crop(aItem.title, 100, true);
                var listener = {
                    observe: function(subject, topic, data) {
                        if (topic == "alertclickcallback")
                            sbCommonUtils.loadURL("chrome://scrapbook/content/view.xul?id=" + data, true);
                    }
                };
                var alertsSvc = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
                alertsSvc.showAlertNotification(icon, title, text, true, aItem.id, listener);
            }
            if ( aItem.id in sbContentSaver.httpTask ) delete sbContentSaver.httpTask[aItem.id];
        } else {
            var icon = sbCommonUtils.getDefaultIcon();
            var title = "ScrapBook: " + sbCommonUtils.lang("CAPTURE_COMPLETE");
            var alertsSvc = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
            alertsSvc.showAlertNotification(icon, title, null);
        }
    },

};


