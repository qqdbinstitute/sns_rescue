/*!
 * TilesSquare Maps on jQuery v0.3.6
 * http://tilessquare.org/
 *
 * Copyright 2013-2018 NAGAI Kenshin
 * Released under the MIT license
 *
 * Date: 2018-05-24
 */

// 引数なしを弾く機能付きの引数マージ
function tsAWithB(self, defs, options) {
    if(!defs && !options) {
        return true;
    }

    self.options = $.extend(defs, options);

    return false;
}

// スーパークラスの関数を上書きしないための退避用
function tsPushSuperFunc(obj, name) {
    var key = name + "_SUPS";
    obj[key] = (obj[key] ? obj[key] : []);
    obj[key].push(obj[name]);
}

// tsPushSuperFuncで退避した関数を順に呼び出し
function tsExecSuperFuncs(obj, name, args) {
    var funcs = obj[name + "_SUPS"],
        res = true;
    for(var idx = funcs.length - 1; idx >= 0 && res !== false && res !== null; idx--) {
        res = funcs[idx].apply(obj, args);
    }
    return res;
}

function tsGetGetVars() {
    var vars = [], hash,
        hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function TSCache(options) {
    if(tsAWithB(this, {
        }, options)) return;

    this.status = this.NONE = 0;
    this.WAITING = 1;
    this.LOADED = 2;

    this.updateATime = function() {
        this.atime = (new Date()).getTime();
    };
    this.updateATime();
};

function TSImageCache(options) {
    if(tsAWithB(this, {
            fadeInSpan: 200,
            uri: ""
        }, options)) return;
    TSCache.call(this, this.options);

    var cache = this;
    cache.status = cache.WAITING;
    this.img = new Image();
    this.img.src = this.options.uri;
    this.img.size = 0;
    this.img.onload = function() {
        cache.status = cache.LOADED;
        cache.fadeInStart = (new Date()).getTime();
        cache.fadeInEnd = cache.fadeInStart + cache.options.fadeInSpan;
        cache.size = cache.img.width * cache.img.height;
    };
};
TSImageCache.prototype = new TSCache;

function TSProjection(options) {
    if(tsAWithB(this, {
            lon: 0,
            lat: 0,
            zoom: 0
        }, options)) return;

    this.hasLonLat = (options && options.lon != undefined && options.lat != undefined);
};

function TSMercatorProjection(options) {
    if(tsAWithB(this, {
            x: 0,
            y: 0
        }, options)) return;
    TSProjection.call(this, this.options);

    this.hasXY = (options && options.x != undefined && options.y != undefined);

    this.trimXY = function() {
        var p2 = Math.pow(2, this.options.zoom);
        while(this.options.x < 0) this.options.x += p2;
        while(this.options.x >= p2) this.options.x -= p2;
        while(this.options.y < 0) this.options.y += p2;
        while(this.options.y >= p2) this.options.y -= p2;
    };

    this.trimLonLat = function() {
        while(this.options.lon <= -180) this.options.lon += 360;
        while(this.options.lon > 180) this.options.lon -= 360;
        while(this.options.lat <= -90) this.options.lat += 180;
        while(this.options.lat > 90) this.options.lat -= 180;
    };

    this.makeKey = function() {
        if(this.hasXY) {
            this.trimXY();
        } else {
            this.trimLonLat();
            this.computeXY();
        }
        return this.options.zoom + "/" + ~~this.options.x + "/" + ~~this.options.y;
    };

    this.computeXY = function() {
        this.options.x = (this.options.lon + 180) / 360 * Math.pow(2, this.options.zoom);
        this.options.y = (1 - Math.log(Math.tan(this.options.lat * Math.PI / 180) + 1 / Math.cos(this.options.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, this.options.zoom);
        this.hasXY = true;
    };

    this.getXY = function() {
        if(this.hasXY) {
            this.trimXY();
        } else {
            this.trimLonLat();
            this.computeXY();
        }
        return { x: this.options.x, y: this.options.y };
    };

    this.computeLonLat = function() {
        var p2 = Math.pow(2, this.options.zoom),
            n = Math.PI - 2 * Math.PI * this.options.y / p2;
        this.options.lon = this.options.x / p2 * 360 - 180;
        this.options.lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        this.hasLonLat = true;
    };

    this.getLonLat = function() {
        if(this.hasLonLat) {
            this.trimLonLat();
        } else {
            this.trimXY();
            this.computeLonLat();
        }
        return { lon: this.options.lon, lat: this.options.lat };
    };
};
TSMercatorProjection.prototype = new TSProjection;

function TSOSMProjection(options) {
    if(tsAWithB(this, {
        }, options)) return;
    TSMercatorProjection.call(this, this.options);
};
TSOSMProjection.prototype = new TSMercatorProjection;

function TSDownloader(options) {
    if(tsAWithB(this, {
        }, options)) return;
};

function TSOSMDownloader(options) {
    if(tsAWithB(this, {
            subDomain: "a"
        }, options)) return;
    TSDownloader.call(this, this.options);

    this.getTileCache = function(prj) {
        var xy = prj.getXY();
        return new TSImageCache({
            uri: "https://" + this.options.subDomain + ".tile.openstreetmap.org/" + ~~prj.options.zoom + "/"
                + ~~xy.x + "/" + ~~xy.y + ".png"
        });
    };
};
TSOSMDownloader.prototype = new TSDownloader;

function TSGSIGoJpStdDownloader(options) {
    if(tsAWithB(this, {
        }, options)) return;
    TSDownloader.call(this, this.options);

    this.getTileCache = function(prj) {
        var xy = prj.getXY();
        return new TSImageCache({
            uri: "https://cyberjapandata.gsi.go.jp/xyz/std/" + ~~prj.options.zoom + "/"
                + ~~xy.x + "/" + ~~xy.y + ".png"
        });
    };
};
TSGSIGoJpStdDownloader.prototype = new TSDownloader;

function TSLocalDownloader(options) {
    if(tsAWithB(this, {
            bpath: ""
        }, options)) return;
    TSDownloader.call(this, this.options);

    this.getTileCache = function(prj) {
        return new TSImageCache({
            uri: this.options.bpath + ~~prj.options.zoom + "/" + ~~prj.options.x + "/" + ~~prj.options.y + ".png"
        });
    };
};
TSLocalDownloader.prototype = new TSDownloader;

function TilesSquare(options) {
    if(tsAWithB(this, {
            interval: 50, // TODO: undefinedになっている？
            moveSpan: 700,
            zoomSpan: 400,
            id: "default",
            dldrs: [],
            minZoom: 0,
            maxZoom: 18,
            zoom: 12,
            lon: 139.6916667,
            lat: 35.6894444
        }, options)) return;

    this.initialized = false;
    this.caches = {};
    this.activated = false;
    this.dldrIdx = 0;

    // 最初に呼び出す処理
    // 主な処理はactivateでやるのであまりやることはない？
    this.init = function(options) {
        this.initialized = true;
        this.isIOS = options.isIOS;
        this.isAndroid = options.isAndroid;
        this.isWindowsPhone = options.isWindowsPhone;
        this.options.interval = options.interval;
        this.cvsid = options.cvsid;
        this.cdtid = options.cdtid;
        this.hasArrows = options.hasArrows;
        this.arwids = options.arwids;
        this.hasSlider = options.hasSlider;
        this.sldid = options.sldid;
        this.hasPlsMns = options.hasPlsMns;
        this.pmids = options.pmids;
        this.hasScale = options.hasScale;
        this.sclids = options.sclids;
        this.ovlsid = options.ovlsid;
        this.popsid = options.popsid;
        this.onActivate = options.onActivate;
        this.onDeactivate = options.onDeactivate;
        this.beforeDrag = options.beforeDrag;
        this.afterDrag = options.afterDrag;
        this.beforeMove = options.beforeMove;
        this.inMoving = options.inMoving;
        this.afterMove = options.afterMove;
        this.beforeZoom = options.beforeZoom;
        this.inZooming = options.inZooming;
        this.afterZoom = options.afterZoom;
        this.beforeResize = options.beforeResize;
        this.afterResize = options.afterResize;
        this.onDraw = options.onDraw;
        this.onLoaded = options.onLoaded;
    };

    this.destroy = function() {};

    // このTilesSquareを表示するために選択したときの処理
    this.activate = function(options) {
        this.activated = true;
        this.resize(options);
        this.setCenter(options);

        if(this.hasSlider) {
            var slider = $("#" + this.sldid);
            slider.slider("option", "min", this.options.minZoom);
            slider.slider("option", "max", this.options.maxZoom);
            slider.slider("option", "value", this.options.zoom);
        }

        this.retrieve();
        if(this.onActivate) this.onActivate(this);
        $("#" + this.ovlsid).tsoverlays("activate", this);
        $("#" + this.popsid).tspopups("activate", this);
        this.draw();
    };

    this.deactivate = function() {
        this.activated = false;
        if(this.onDeactivate) this.onDeactivate(this);
        $("#" + this.ovlsid).tsoverlays("deactivate", this);
        $("#" + this.popsid).tspopups("deactivate", this);
    };

    this.resize = function(options) {
        this.width = options.width;
        this.height = options.height;
    };

    this.updateScaleSub = function(start, r) {
        var s = 0, sc = 0,
            hs = [ 1, 2, 3, 5 ],
            max = 99;
        for(var st = start; st >= 1 && s == 0; st /= 10) {
            if(st * r > max * 100) continue;
            for(var hi = hs.length - 1; hi >= 0; hi--) {
                sc = hs[hi] * st;
                if(sc * r < max) {
                    s = sc * r;
                    break;
                }
            }
        }

        return { s: s, sc: sc };
    }

    this.updateScale = function(options) {
        // 経度1度あたりm
        // 理科年表 潮汐変形
        var rad = options.scale2 / 180 * Math.PI,
            l = Math.PI / 180 * 6378137 * Math.cos(rad) / Math.sqrt(1 - 0.00669447 * Math.pow(Math.sin(rad), 2)),

        // 1mあたりpx
            r = options.scale1 / l,

        // kmの表示を決定
            res = this.updateScaleSub(10000000, r),

            kmw = ~~res.s,
            left = 6;
        if(res.s > 0) {
            var kmLine = $("#" + this.sclids["kmLine"]),
                kmLabel = $("#" + this.sclids["kmLabel"]);
            kmLine.css("left", (kmw + left) + "px");
            kmLabel.text(res.sc > 1000 ? (res.sc / 1000) + " km" : res.sc + " m");
        }

        // マイルの表示を決定
        r *= 1609.344;
        var unit = " mi";
        res = this.updateScaleSub(10000, r);

        if(res.s == 0) {
            r /= 1760 * 3;
            unit = " ft";
            res = this.updateScaleSub(1000, r);
        }

        var miw = ~~res.s;
        if(res.s > 0) {
            var miLine = $("#" + this.sclids["miLine"]);
            miLine.css("left", (miw + left) + "px");
            var miLabel = $("#" + this.sclids["miLabel"]);
            miLabel.text(res.sc + unit);
        }

        // 横棒の長さを大きいほうに合わせる
        var horizon = $("#" + this.sclids["horizon"]);
        horizon.css("width", (kmw > miw ? kmw : miw) + 2);
    };

    this.sync = function() {
        if(this.hasSlider) {
            var slider = $("#" + this.sldid);
            slider.slider("option", "value", this.options.zoom);
        }

        if(this.hasScale) {
            var lonlat = this.deltaElem2LonLat({
                deltaElemX: 100,
                deltaElemY: this.height - 20 - (this.height >> 1)
            });
            while(lonlat.lon < this.options.lon) lonlat.lon += 360;

            this.updateScale({
                scale1: 100 / (lonlat.lon - this.options.lon), // 経度1度あたりのピクセル数
                scale2: lonlat.lat // 縮尺の位置の緯度
            });
        }
    };

    this.setCenter = function(options) {
        this.options.zoom = (options.zoom === undefined ? this.options.zoom : options.zoom);
        this.options.lon = (options.lon === undefined ? this.options.lon : options.lon);
        this.options.lat = (options.lat === undefined ? this.options.lat : options.lat);

        this.sync();
    };

    this.deltaElem2LonLat = function(options) {
        var prj1 = this.getProjection({
            zoom: this.options.zoom,
            lon: this.options.lon,
            lat: this.options.lat
        }),

        prj2 = this.deltaProjection({
            prj: prj1,
            deltaZ: (options.deltaZ === undefined ? 0 : options.deltaZ),
            deltaElemX: options.deltaElemX,
            deltaElemY: options.deltaElemY,
            preserve: (options.preserve === undefined ? options.deltaZ !== undefined : options.preserve)
        });

        return prj2.getLonLat();
    };

    this.lonLat2DeltaElem = function(options) {
        var prj1 = this.getProjection({
            zoom: this.options.zoom,
            lon: this.options.lon,
            lat: this.options.lat
        }),

        prj2 = this.getProjection({
            zoom: options.zoom ? options.zoom : this.options.zoom,
            lon: options.lon,
            lat: options.lat
        });

        return this.getDeltaElem(prj1, prj2);
    };

    this.dragTimer = null;
    this.deltaElemX = 0;
    this.deltaElemY = 0;
    this.dragPhase = 0; // 0: None, 1: TBC, 2: Last

    this.onDrag = function(options) {
        if(this.dragTimer === null) {
            var self = this;
            this.dragTimer = setTimeout(function() { self.doDrag(); }, this.options.interval);
        }

        this.deltaElemX += options.deltaElemX ? options.deltaElemX : 0;
        this.deltaElemY += options.deltaElemY ? options.deltaElemY : 0;
        this.dragPhase = options.phase ? options.phase : 0;
    };

    this.doDrag = function() {
        this.dragTimer = null;

        var options = {
            deltaElemX: this.deltaElemX,
            deltaElemY: this.deltaElemY,
            phase: this.dragPhase
        };
        this.deltaElemX = 0;
        this.deltaElemY = 0;
        if(options.phase != 1) this.dragPhase = 0;
        if(options.deltaElemX || options.deltaElemY) {
            if(options.phase < 2 && Math.abs(options.deltaElemX) < 1 && Math.abs(options.deltaElemY) < 1) {
                return;
            }

            var lonlat = this.deltaElem2LonLat(options);
            this.setCenter({
                lon: lonlat.lon,
                lat: lonlat.lat
            });
        }

        this.retrieve();
        if(this.beforeDrag) this.beforeDrag(this, options);
        var overlays = $("#" + this.ovlsid).tsoverlays("beforeDrag", this, options),
            popups = $("#" + this.popsid).tspopups("beforeDrag", this, options);
        this.draw();
        overlays.tsoverlays("afterDrag", this, options);
        popups.tspopups("afterDrag", this, options);
        if(this.afterDrag) this.afterDrag(this, options);
    };

    this.onMove = function(options) {
        var now = (new Date()).getTime();
        this.moveReq = {
            zoom: this.options.zoom,
            elemX: options.elemX, // ムーブ終点のエレメント座標
            elemY: options.elemY, // ムーブ終点のエレメント座標
            moveStart: now,
            moveEnd: now + this.options.moveSpan
        };

        // タイル読み込みのため、新しい中心を先に計算
        var lonlat = this.deltaElem2LonLat({
            deltaElemX: options.elemX - (this.width >> 1),
            deltaElemY: options.elemY - (this.height >> 1)
        });
        this.setCenter({
            lon: lonlat.lon,
            lat: lonlat.lat
        });

        this.retrieve();
        if(this.beforeMove) this.beforeMove(this, this.moveReq);
        $("#" + this.ovlsid).tsoverlays("beforeMove", this, this.moveReq);
        $("#" + this.popsid).tspopups("beforeMove", this, this.moveReq);
        this.draw();
    };

    this.zoomTimer = null;
    this.deltaZ = 0;
    this.elemX = 0;
    this.elemY = 0;

    this.onZoom = function(options) {
        var canvas = document.getElementById(this.cvsid);
        this.elemX = (options.elemX === undefined ? $(canvas).width() >> 1 : options.elemX);
        this.elemY = (options.elemY === undefined ? $(canvas).height() >> 1 : options.elemY);

        if(options.zoom === undefined) {
            // ためてズーム
            if(this.zoomTimer === null) {
                var self = this;
                this.zoomTimer = setTimeout(function() { self.doZoom(true); }, this.options.interval);
            }

            this.deltaZ += options.deltaZ;
        } else {
            // 即時ズーム
            if(this.zoomTimer !== null) {
                clearTimeout(this.zoomTimer);
                this.zoomTimer = null;
            }

            this.deltaZ = options.zoom - this.options.zoom;
            this.doZoom(false);
        }
    };

    // preserveがtrueならズーム後、中心とelemXYの位置関係が維持される。
    this.doZoom = function(preserve) {
        this.zoomTimer = null;

        var deltaZ = 0;
        if(this.deltaZ > 0.9) {
            deltaZ = Math.ceil(this.deltaZ);
            this.deltaZ = 0;
        } else if(this.deltaZ < -0.9) {
            deltaZ = Math.floor(this.deltaZ);
            this.deltaZ = 0;
        }
        var elemX = this.elemX,
            elemY = this.elemY;
        this.elemX = 0;
        this.elemY = 0;

        var zoom = this.options.zoom + deltaZ;
        if(zoom < this.options.minZoom) {
            zoom = this.options.minZoom;
        } else if(zoom > this.options.maxZoom) {
            zoom = this.options.maxZoom;
        }
        if(zoom == this.options.zoom) {
            return;
        }
//        if(this.drawTimer) {
//        	return;
//        }

        var now = (new Date()).getTime();
        this.zoomReq = {
            zoom: this.options.zoom,
            preserve: preserve,
            elemX: elemX,
            elemY: elemY,
            zoomStart: now,
            zoomEnd: now + this.options.zoomSpan
        };

        // タイル読み込みのため、新しい中心を先に計算
        var lonlat = this.deltaElem2LonLat({
            deltaZ: (preserve ? deltaZ : 0),
            deltaElemX: elemX - (this.width >> 1),
            deltaElemY: elemY - (this.height >> 1),
            preserve: preserve
        });
        this.setCenter({
            zoom: zoom,
            lon: lonlat.lon,
            lat: lonlat.lat
        });

        this.retrieve();
        if(this.beforeZoom) this.beforeZoom(this, this.zoomReq);
        $("#" + this.ovlsid).tsoverlays("beforeZoom", this, this.zoomReq);
        $("#" + this.popsid).tspopups("beforeZoom", this, this.zoomReq);
        this.draw();
    };

    this.retrieve = function() {};

    this.draw = function() {};

    this.onResize = function(options) {
        var resizeReq = {
            width: this.width,
            height: this.height
        };
        this.resize(options);

        this.retrieve();
        if(this.beforeResize) this.beforeResize(this, resizeReq);
        var overlays = $("#" + this.ovlsid).tsoverlays("beforeResize", this, resizeReq),
            popups = $("#" + this.popsid).tspopups("beforeResize", this, resizeReq);
        this.draw();
        overlays.tsoverlays("afterResize", this, resizeReq);
        popups.tspopups("afterResize", this, resizeReq);
        if(this.afterResize) this.afterResize(this, resizeReq);
    };

    this.wheel2deltaZ = function(wheel) {
    	if(wheel < -4) return -Math.log(-wheel) / Math.LN2;
    	else if(wheel > 4) return Math.log(wheel) / Math.LN2;
    	else if(-2 < wheel && wheel < 0) return -1;
    	else if(0 <= wheel && wheel < 2) return 1;
        return wheel / 2;
    };

    this.pinch2deltaZ = function(pinch) {
        return Math.log(pinch) / Math.LN2 * 2;
    };
};

function OSMTilesSquare(options) {
    if(tsAWithB(this, {
            tsize: 256,
            credit: "© <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors",
            dldrs: [
//                new TSLocalDownloader({
//                    bpath: "tiles/"
//                })
                new TSOSMDownloader({
                    subDomain: "a"
                }),
                new TSOSMDownloader({
                    subDomain: "b"
                }),
                new TSOSMDownloader({
                    subDomain: "c"
                })
            ]
        }, options)) return;
    TilesSquare.call(this, this.options);

    this.destroy = function() {
    };

    tsPushSuperFunc(this, "activate");
    this.activate = function(options) {
        tsExecSuperFuncs(this, "activate", arguments);

        var credit = document.getElementById(this.cdtid);
        $(credit).html(this.options.credit);
    };

    this.cacheMax = 50;

    tsPushSuperFunc(this, "resize");
    this.resize = function(options) {
        tsExecSuperFuncs(this, "resize", arguments);

        // 中心から上下左右のピクセル数 / タイルのピクセル数
        this.lhalf = (this.width >> 1) / this.options.tsize;
        this.rhalf = ((this.width >> 1) - 1) / (this.options.tsize - 1);
        this.thalf = (this.height >> 1) / this.options.tsize;
        this.bhalf = ((this.height >> 1) - 1) / (this.options.tsize - 1);

        this.cacheMax = this.width / this.options.tsize * this.height / this.options.tsize * 8;
    };

    this.getProjection = function(options) {
        return new TSOSMProjection(options);
    };

    this.deltaProjection = function(options) {
        var xy = options.prj.getXY(),
            prm = 1;
        if(options.deltaZ && options.preserve) {
            var zd2 = Math.pow(2, options.deltaZ);
            prm = 1 - 1 / zd2;
        }

        return this.getProjection({
            zoom: this.options.zoom,
            x: xy.x + options.deltaElemX * prm / this.options.tsize,
            y: xy.y + options.deltaElemY * prm / this.options.tsize
        });
        // ムーブとズームは式が似ているので共用している
    };

    this.getDeltaElem = function(prj1, prj2) {
        var xy1 = prj1.getXY(),
            xy2 = prj2.getXY();

        return {
            deltaElemX: (xy2.x - xy1.x) * this.options.tsize,
            deltaElemY: (xy2.y - xy1.y) * this.options.tsize
        };
    };

    this.retrieve = function() {
        // 中央を計算
        var zoom = this.options.zoom,
            cPrj = this.getProjection({
                zoom: zoom,
                lon: this.options.lon,
                lat: this.options.lat
            }),
            cxy = cPrj.getXY(),

        // タイル読み込み始点・終点を計算
            pgrsvs = [ 0.01, 1, 1.1 ],  // 中央から読み込み、さらに先読み
            dldrs = this.options.dldrs;
        for(var idx = 0; idx < pgrsvs.length; idx++) {
            var xno1 = Math.floor(cxy.x - this.lhalf * pgrsvs[idx]),
                xno2 = Math.floor(cxy.x + this.rhalf * pgrsvs[idx]),
                yno1 = Math.floor(cxy.y - this.thalf * pgrsvs[idx]),
                yno2 = Math.floor(cxy.y + this.bhalf * pgrsvs[idx]);

            for(var xno = xno1; xno <= xno2; xno++) {
                for(var yno = yno1; yno <= yno2; yno++) {
                    var prj = this.getProjection({
                        zoom: zoom,
                        x: xno,
                        y: yno
                    }),
                    ckey = prj.makeKey();

                    if(!this.caches[ckey]) {
                        var dldr = dldrs[this.dldrIdx++];
                        if(this.dldrIdx >= dldrs.length) {
                            this.dldrIdx = 0;
                        }

                        this.caches[ckey] = dldr.getTileCache(prj);
                    }
                }
            }
        }
    };

    this.drawTimer = null;
    this.drawNow = -1;

    this.draw = function() {
        if(!this.activated) {
            return;
        }

        if(this.drawTimer !== null) {
            clearTimeout(this.drawTimer);
            this.drawTimer = null;
            this.drawNow = -1;
        }

        var tsize = this.options.tsize,
            now = (new Date()).getTime(),
            canvas = document.getElementById(this.cvsid);
        this.drawNow = now;
        if(!canvas.getContext) {
            return;
        }
        var ctxt = canvas.getContext("2d"),
            isDirty = false,
            moveReq = null,
            zoomReq = null,

            mvs = [
                {
                    zoom: this.options.zoom,
                    scale: 1,
                    alpha: 1
                }
            ],
            lon = this.options.lon,
            lat = this.options.lat;
        if(this.moveReq) {
            var mreq = this.moveReq;
            if(now < mreq.moveEnd) {
                // ムーブアニメ中
                var p = (now - mreq.moveStart) / (mreq.moveEnd - mreq.moveStart),
                    q = 1 - p,

                    lonlat = this.deltaElem2LonLat({
                        deltaElemX: -(mreq.elemX - (this.width >> 1)),
                        deltaElemY: -(mreq.elemY - (this.height >> 1))
                    });

                if(lonlat.lon < -90 && 90 <= lon) {
                    // 経度±180をまたいで西へ
                    lon = lon * p + (lonlat.lon + 360) * q;
                    if(lon >= 180) lon -= 360;
                } else if(90 < lonlat.lon && lon < -90) {
                    // 経度±180をまたいで東へ
                    lon = (lon + 360) * p + lonlat.lon * q;
                    if(lon >= 180) lon -= 360;
                } else {
                    lon = lon * p + lonlat.lon * q;
                }
                lat = lat * p + lonlat.lat * q;

                isDirty = true;
            } else {
                // ムーブアニメ終了

                moveReq = this.moveReq;
                this.moveReq = undefined;
                this.dragPhase = 0;
            }
        } else if(this.zoomReq) {
            var zreq = this.zoomReq;
            if(now < zreq.zoomEnd) {
                // ズームアニメ中
                var p = (now - zreq.zoomStart) / (zreq.zoomEnd - zreq.zoomStart),
                    q = 1 - p,

                    dz = this.options.zoom - zreq.zoom,
                    prm = zreq.preserve ? 1 : -Math.pow(2, dz),
                    lonlat = this.deltaElem2LonLat({
                        deltaZ: (zreq.preserve ? -dz * q : 0),
                        deltaElemX: prm * (zreq.elemX - (this.width >> 1)),
                        deltaElemY: prm * (zreq.elemY - (this.height >> 1)),
                        preserve: zreq.preserve
                    });

                if(zreq.preserve) {
					lon = lonlat.lon;
					lat = lonlat.lat;
				} else {
					if(dz < 0) {
						var p2 = Math.pow(p, 2 * -dz),
							q2 = 1 - p2;
						lon = lon * p2 + lonlat.lon * q2;
						lat = lat * p2 + lonlat.lat * q2;
					} else {
						var q2 = Math.pow(q, 2 * dz),
							p2 = 1 - q2;
						lon = lon * p2 + lonlat.lon * q2;
						lat = lat * p2 + lonlat.lat * q2;
					}
                }

                var scale = Math.pow(2, dz * p);
                mvs[0].scale = scale / Math.pow(2, dz);
                mvs[0].alpha = p;
                mvs.unshift({
                    zoom: zreq.zoom,
                    scale: scale,
                    alpha: 1 - Math.pow(p, 4)
                });

                isDirty = true;
            } else {
                // ズームアニメ終了

                zoomReq = this.zoomReq;
                this.zoomReq = undefined;
                this.dragPhase = 0;
            }
        }

        for(var idx = 0; idx < mvs.length; idx++) {
            var mv = mvs[idx],
                tsize = ~~(this.options.tsize * mv.scale + 0.5),

            // 中央を計算
                cPrj = this.getProjection({
                    zoom: mv.zoom,
                    lon: lon,
                    lat: lat
                }),
                cxy = cPrj.getXY(),

            // タイル表示始点・終点を計算
                scale = (mv.scale < 0.5 ? 0.5 : mv.scale),
                xno1 = Math.floor(cxy.x - this.lhalf / scale),
                xno2 = Math.floor(cxy.x + this.rhalf / scale),
                yno1 = Math.floor(cxy.y - this.thalf / scale),
                yno2 = Math.floor(cxy.y + this.bhalf / scale),

                xofs = cxy.x - this.lhalf / mv.scale,
                yofs = cxy.y - this.thalf / mv.scale;
            for(var xno = xno1; xno <= xno2; xno++) {
                for(var yno = yno1; yno <= yno2; yno++) {
                    var prj = this.getProjection({
                        zoom: mv.zoom,
                        x: xno,
                        y: yno
                    });

                    var cache = this.caches[prj.makeKey()],
                        x = Math.round((xno - xofs) * tsize),
                        y = Math.round((yno - yofs) * tsize),
                        w = Math.round((xno + 1 - xofs) * tsize) - x,
                        h = Math.round((yno + 1 - yofs) * tsize) - y;
                    if(cache) {
                        cache.updateATime();
                        if(cache.status == cache.LOADED) {
                            if(now < cache.fadeInEnd) {
                                // タイルのフェードイン処理
                                isDirty = true;
                                if(idx == 0) {
                                    this.drawBlankTile(x, y, w, h, 1, ctxt);
                                }
                                ctxt.globalAlpha = (now - cache.fadeInStart) / (cache.fadeInEnd - cache.fadeInStart) * mv.alpha;
                            } else {
                                if(idx == 0 && mv.alpha < 0.99999) {
                                    this.drawBlankTile(x, y, w, h, 1, ctxt);
                                }
                                ctxt.globalAlpha = mv.alpha;
                            }
                            ctxt.drawImage(cache.img, x, y, w, h);
                        } else {
                            isDirty = true;
                            this.drawBlankTile(x, y, w, h, idx == 0 ? 1 : mv.alpha, ctxt);
                        }
                    } else {
                        this.drawBlankTile(x, y, w, h, idx == 0 ? 1 : mv.alpha, ctxt);
                    }
                }
            }
        }
        if(this.onDraw) this.onDraw(this);

        if(this.dragTimer === null) {
            // dragTimerがセットされているとまたすぐdrawが呼ばれる
            if(isDirty) {
                var self = this;
                this.drawTimer = setTimeout(function() { self.draw(); }, this.options.interval);
            } else {
                this.dispose();
				if(this.onLoaded) this.onLoaded(this);
            }
        }

        var dexy = this.lonLat2DeltaElem({
            lon: lon,
            lat: lat
        });

        if(this.moveReq) {
            // ムーブアニメ中
            if(this.inMoving) this.inMoving(this, this.moveReq, dexy);
            $("#" + this.ovlsid).tsoverlays("inMoving", this, this.moveReq, dexy);
            $("#" + this.popsid).tspopups("inMoving", this, this.moveReq, dexy);
        } else if(this.zoomReq) {
            // ズームアニメ中
            if(this.inZooming) this.inZooming(this, this.zoomReq, dexy);
            $("#" + this.ovlsid).tsoverlays("inZooming", this, this.zoomReq, dexy);
            $("#" + this.popsid).tspopups("inZooming", this, this.zoomReq, dexy);
        } else if(moveReq) {
            // ムーブ終了
            $("#" + this.ovlsid).tsoverlays("afterMove", this, moveReq, dexy);
            $("#" + this.popsid).tspopups("afterMove", this, moveReq, dexy);
            if(this.afterMove) this.afterMove(this, moveReq, dexy);
        } else if(zoomReq) {
            // ズーム終了
            $("#" + this.ovlsid).tsoverlays("afterZoom", this, zoomReq, dexy);
            $("#" + this.popsid).tspopups("afterZoom", this, zoomReq, dexy);
            if(this.afterZoom) this.afterZoom(this, zoomReq, dexy);
        }
    };

    this.drawBlankTile = function(x, y, w, h, alpha, ctxt) {
        ctxt.globalAlpha = alpha;
        ctxt.fillStyle = "#e0e0e0";
        ctxt.fillRect(x, y, w, h);
    };

    this.dispose = function() {
        var caches = this.caches,
            keys = [];
        for(var key in caches) {
            keys.push(key);
        }

        keys.sort(function(a, b) {
            var atime = caches[a].atime,
                btime = caches[b].atime;
            if(atime < btime) return -1;
            if(atime > btime) return 1;
            return 0;
        });

        // キャッシュを単純時刻順で削除
        var deleteNum = (keys.length <= this.cacheMax ? 0 : keys.length - this.cacheMax);
        for(var idx = 0; idx < deleteNum; idx++) {
            delete caches[keys[idx]];
        }
    };
};
OSMTilesSquare.prototype = new TilesSquare;

function GSIGoJpStdTilesSquare(options) {
    if(tsAWithB(this, {
            maxZoom: 18,
            credit: "<a href=\"http://maps.gsi.go.jp/development/ichiran.html\">地理院タイル（標準地図）</a>",
            dldrs: [
                new TSGSIGoJpStdDownloader({})
            ]
        }, options)) return;
    OSMTilesSquare.call(this, this.options);
};
GSIGoJpStdTilesSquare.prototype = new OSMTilesSquare;

function TSPointerHandler(options) {
    if(tsAWithB(this, {
        }, options)) return;
};

function TSMouseHandler(options) {
    if(tsAWithB(this, {
        }, options)) return;
    TSPointerHandler.call(this, this.options);

    this.init = function(options) {
        var map = options.map;
        map.isMouseDown = false;
        map.isMouseMove = false;
        map.pageX = 0;
        map.pageY = 0;
        map.singleTimer = null;
        map.lastWheel = 0;
    };

    this.onMouseDown = function(ev) {
        this.isMouseDown = true;
        this.isMouseMove = false;
        this.pageX = ev.pageX;
        this.pageY = ev.pageY;
    };

    this.onMouseUp = function(ev) {
    	if(this.isMouseMove) {
            this.onDrag({
//                deltaElemX: this.pageX - ev.pageX,
//                deltaElemY: this.pageY - ev.pageY
				phase: 2
            });
            this.pageX = ev.pageX;
            this.pageY = ev.pageY;
        } else {
    		if(this.options.onPointerSingle) {
				if(this.singleTimer !== null) {
					clearTimeout(this.singleTimer);
				}
    			var self = this,
    				elem = $(ev.target),
    				ts = this.options.active,
    				offset = elem.offset(),
    				exy = {
						elemX: ev.pageX - offset.left,
						elemY: ev.pageY - offset.top
					},
					dexy = {
						deltaElemX: exy.elemX - (ts.width >> 1),
						deltaElemY: exy.elemY - (ts.height >> 1)
					},
					lonlat = ts.deltaElem2LonLat(dexy);
				this.singleTimer = setTimeout(function() {
					self.options.onPointerSingle(ts, exy, lonlat);
				}, 300);
    		}
    	}
        this.isMouseDown = false;
        this.isMouseMove = false;
        var canvas = document.getElementById(this.options.cvsid);
        $(canvas).css("cursor", "default");
    };

    this.onMouseMove = function(ev) {
        this.isMouseMove = true;
        if(this.isMouseDown) {
            if(Math.abs(this.pageX - ev.pageX) > 0 || Math.abs(this.pageY - ev.pageY) > 0) {
                var canvas = document.getElementById(this.options.cvsid);
                $(canvas).css("cursor", "all-scroll");
                this.onDrag({
                    deltaElemX: this.pageX - ev.pageX,
                    deltaElemY: this.pageY - ev.pageY,
                    phase: 1
                });
                this.pageX = ev.pageX;
                this.pageY = ev.pageY;
            }
        }
    };

    this.onMouseOut = function(ev) {
        if(this.isMouseMove) { // TODO: 試験追加
            if(this.dragPhase == 1) {
                this.onDrag({
                    phase: 2
                });
                this.pageX = ev.pageX;
                this.pageY = ev.pageY;
            }
        }
        this.isMouseMove = false;

        var canvas = document.getElementById(this.options.cvsid);
        $(canvas).css("cursor", "default");
    };

    this.onDoubleClick = function(ev) {
		if(this.singleTimer !== null) {
			clearTimeout(this.singleTimer);
			this.singleTimer = null;
		}
        var elem = $(ev.target),
            offset = elem.offset();
        this.onZoom({
            deltaZ: 1,
            elemX: ev.pageX - offset.left,
            elemY: ev.pageY - offset.top
        });
    };

    this.onMouseWheel = function(ev, delta) {
        ev.preventDefault();
        if(delta === undefined) {
            return;
        }
//        if(this.lastWheel > ev.timeStamp - 50) {
//        if(this.lastWheel > ev.timeStamp - 200) {
        if(this.lastWheel > ev.timeStamp - this.options.active.options.zoomSpan) {
        	return;
        }
        this.lastWheel = ev.timeStamp;

        var elem = $(ev.target),
            offset = elem.offset();
        this.onZoom({
            deltaZ: this.wheel2deltaZ(delta),
            elemX: ev.pageX - offset.left,
            elemY: ev.pageY - offset.top
        });
    };

    this.getAdapter = function() {
        var adapter = {
            mousedown: this.onMouseDown,
            mouseup: this.onMouseUp,
            mousemove: this.onMouseMove,
            mouseout: this.onMouseOut,
            dblclick: this.onDoubleClick,
            mousewheel: this.onMouseWheel,
            DOMMouseScroll: this.onMouseWheel,

            selectstart: function() { return false; },
            dragstart: function() { return false; }
        }
        return adapter;
    };
};
TSMouseHandler.prototype = new TSPointerHandler;

function TSTouchHandler(options) {
    if(tsAWithB(this, {
        }, options)) return;
    TSPointerHandler.call(this, this.options);

    this.init = function(options) {
        var map = options.map;
        map.touches = [];
        map.pushTouches = this.pushTouches;
        map.touchEnds = [ (new Date()).getTime() ]; // 初期値はシングルタップ判定のため
        map.pushTouchEnds = this.pushTouchEnds;
        map.singleTimer = null;
    };

    this.pushTouches = function(ev) {
        // 古すぎるタッチデータを削除
        var ttcs = this.touches,
            old = (new Date()).getTime() - 250;
        while(ttcs.length > 0 && ttcs[0].ts < old) {
            ttcs.shift();
        }

        var elem = $(ev.target),
            offset = elem.offset(),
            otcs = ev.originalEvent.touches,
            tc = [];
        for(var idx = 0; idx < otcs.length; idx++) {
            tc.push({
                elemX: otcs[idx].pageX - offset.left,
                elemY: otcs[idx].pageY - offset.top
            });
        }

        if(tc.length > 0) {
            ttcs.push({
//               ts: ev.timeStamp,
               ts: (new Date()).getTime(),
               tc: tc
            });
            if(ttcs.length == 3) {
                ttcs.shift();
            }
        }
    };

    this.pushTouchEnds = function(ev) {
        var ttes = this.touchEnds;
//        ttes.push(ev.timeStamp);
        ttes.push((new Date()).getTime());
        if(ttes.length == 3) {
            ttes.shift();
        }
    };

    this.onTouchStart = function(ev) {
        ev.preventDefault();
        this.pushTouches(ev);
    };

    this.onTouchMove = function(ev) {
        ev.preventDefault();
        this.pushTouches(ev);
        this.touchEnds = [];

        var ttcs = this.touches;
        if(ttcs.length < 2) {
            // 履歴がなければ判定不可
            return;
        }

        var tc1 = ttcs[0].tc,
            tc2 = ttcs[1].tc;
        if(tc1.length != tc2.length) {
            // 指の本数が違うときは判断しない
            return;
        }

        if(tc1.length == 1) {
            // ドラッグ
            this.onDrag({
                deltaElemX: tc1[0].elemX - tc2[0].elemX,
                deltaElemY: tc1[0].elemY - tc2[0].elemY,
                phase: 1
            });
        } else if(tc1.length == 2) {
            // ピンチ
            var a2 = Math.pow(tc1[0].elemX - tc1[1].elemX, 2) + Math.pow(tc1[0].elemY - tc1[1].elemY, 2),
                b2 = Math.pow(tc2[0].elemX - tc2[1].elemX, 2) + Math.pow(tc2[0].elemY - tc2[1].elemY, 2),
                mag = Math.sqrt(b2) / Math.sqrt(a2);

            this.onZoom({
                deltaZ: this.pinch2deltaZ(mag),
                elemX: (tc1[0].elemX + tc1[1].elemX) >> 1,
                elemY: (tc1[0].elemY + tc1[1].elemY) >> 1
            });
        }
    };

    this.onTouchEnd = function(ev) {
        ev.preventDefault();
        this.pushTouchEnds(ev);

        // ダブルタップ判定
        var ttes = this.touchEnds;
        if(ttes.length < 2) {
            var ttcs = this.touches;
            if(ttcs.length < 2) {
                return;
            }

            var tc1 = ttcs[0].tc,
                tc2 = ttcs[1].tc;
            if(tc1.length != 1 || tc2.length != 1) {
                return;
            }

            this.onDrag({
//                deltaElemX: tc1[0].elemX - tc2[0].elemX,
//                deltaElemY: tc1[0].elemY - tc2[0].elemY,
                phase: 2
            });

            return;
        }

        if(this.singleTimer !== null) {
            clearTimeout(this.singleTimer);
            this.singleTimer = null;
        }

		if(ttes[1] - ttes[0] > 300) {
			var self = this,
				elem = $(ev.target),
				ts = this.options.active,
				offset = elem.offset(),
				exy = {
					elemX: ev.originalEvent.changedTouches[0].pageX - offset.left,
					elemY: ev.originalEvent.changedTouches[0].pageY - offset.top
				},
				dexy = {
					deltaElemX: exy.elemX - (ts.width >> 1),
					deltaElemY: exy.elemY - (ts.height >> 1)
				},
				lonlat = ts.deltaElem2LonLat(dexy);
			this.singleTimer = setTimeout(function() {
				self.options.onPointerSingle(ts, exy, lonlat);
			}, 300);
            return;
        }

        var ttcs = this.touches;
        if(ttcs.length < 2) {
            return;
        }

        var tc1 = ttcs[0].tc,
            tc2 = ttcs[1].tc;
        if(tc1.length != 1 || tc2.length != 1) {
            return;
        }

        var d2 = Math.pow(tc2[0].elemX - tc1[0].elemX, 2) + Math.pow(tc2[0].elemY - tc1[0].elemY, 2);
        if(d2 > 2500) {
            // タップの距離が離れすぎている
            return;
        }

        this.onZoom({
            deltaZ: 1,
            elemX: tc2[0].elemX,
            elemY: tc2[0].elemY
        });
    };

    this.getAdapter = function() {
        var adapter = {
            touchstart: this.onTouchStart,
            touchmove: this.onTouchMove,
            touchend: this.onTouchEnd
        }

        return adapter;
    };
};
TSTouchHandler.prototype = new TSPointerHandler;

(function($) {
    var tsVersion = "0.3.5",
        agent = navigator.userAgent,
        isIOS = (agent.search(/iPhone/) != -1 || agent.search(/iPad/) != -1 || agent.search(/iPod/) != -1),
        isAndroid = (agent.search(/Android/) != -1),
        isWindowsPhone = (agent.search(/Windows Phone/) != -1);

    // 今のところ継承禁止 ポリモーフィズム対応待ち
    $.widget("tlsq.tsoverlays", {
        options: {
        	version: tsVersion,
            left: 0,
            top: 0,
            ovls: {},
            mapid: undefined,
            popsid: undefined,
            ucnt: 0
        },

        _create: function() {
            this.element
                .css("width", "1px")
                .css("height", "1px")
                .css("margin", "0px")
                .css("padding", "0px")
                .css("position", "absolute")
                .css("left", "0px")
                .css("top", "0px");
        },

        _setOption: function(key, value) {
            switch(key) {
            case "clear":
                // handle changes to clear option
                break;
            }

            this._super(key, value);
        },

        _destroy: function() {
        },

        mergeOverlays: function(overlays) {
            var elem = this.element,
                ovls = this.options.ovls;
            for(var idx = 0; idx < overlays.length; idx++) {
                var ovl = overlays[idx],
                    id = ovl.attr("id");

                if(!ovls[id]) {
                    ovls[id] = ovl;
                    elem.append(ovls[id]);
                }
            }
        },

        removeOverlays: function(options) {
            var ovls = this.options.ovls;

            if(!options) {
                for(var id in ovls) {
                    ovls[id].remove();
                }
                this.options.ovls = {};
                return;
            }

            if(options.ids) {
                for(var idx = 0; idx < options.ids.length; idx++) {
                    var id = options.ids[idx];
                    if(ovls[id]) {
                        ovls[id].remove();
                        if(ovls[id]) delete ovls[id];
                    }
                }
            }

            if(options.lon1 !== undefined && options.lon2 !== undefined) {
                if(options.lon1 < options.lon2) {
                    for(var id in ovls) {
                        var lon = ovls[id].data("lon");
                        if(lon < options.lon1 || options.lon2 < lon) {
                            ovls[id].remove();
                            if(ovls[id]) delete ovls[id];
                        }
                    }
                } else {
                    for(var id in ovls) {
                        var lon = ovls[id].data("lon");
                        if((0 < lon && lon < options.lon1) || (options.lon2 < lon && lon <= 0)) {
                            ovls[id].remove();
                            if(ovls[id]) delete ovls[id];
                        }
                    }
                }
            }

            if(options.lat1 !== undefined && options.lat2 !== undefined) {
                for(var id in ovls) {
                    var lat = ovls[id].data("lat");
                    if(lat < options.lat1 || options.lat2 < lat) {
                        ovls[id].remove();
                        if(ovls[id]) delete ovls[id];
                    }
                }
            }
        },

        plot: function(ts, force) {
            if(!ts) return;

            if(force) {
                // 画面中心を原点にリセット
                this.options.left = ts.width >> 1;
                this.options.top = ts.height >> 1;
                this.element
                    .css("left", this.options.left + "px")
                    .css("top", this.options.top + "px");
            }

            var ovls = this.options.ovls;
            for(var id in ovls) {
                if(force || ovls[id].data("status") == 1) {
                    var res = ts.lonLat2DeltaElem({
                        lon: ovls[id].data("lon"),
                        lat: ovls[id].data("lat")
                    });

                    var left = res.deltaElemX,
                        top = res.deltaElemY;
                    ovls[id].left = left;
                    ovls[id].top = top;
                    ovls[id].css("left", left + "px")
                        .css("top", top + "px");

                    ovls[id].data("status", 2);
                }
            }
        },

        activate: function(ts) {
            this.plot(ts, true);
            this.element.show();
        },

        deactivate: function(ts) {
            this.element.hide();
        },

        beforeDrag: function(ts, req) {},

        afterDrag: function(ts, req) {
            this.options.left -= req.deltaElemX;
            this.options.top -= req.deltaElemY;
            this.element
                .css("left", this.options.left + "px")
                .css("top", this.options.top + "px");
        },

        beforeMove: function(ts, req) {
            this.options.left -= req.elemX - (ts.width >> 1);
            this.options.top -= req.elemY - (ts.height >> 1);
        },

        inMoving: function(ts, req, dexy) {
            this.element
                .css("left", (this.options.left - dexy.deltaElemX) + "px")
                .css("top", (this.options.top - dexy.deltaElemY) + "px");
        },

        afterMove: function(ts, req, dexy) {
            this.options.left -= dexy.deltaElemX;
            this.options.top -= dexy.deltaElemY;
            this.element
                .css("left", this.options.left + "px")
                .css("top", this.options.top + "px");
        },

        beforeZoom: function(ts, req) {
            this.plot(ts, true);
        },

        inZooming: function(ts, req, dexy) {
            var now = ts.drawNow > 0 ? ts.drawNow : (new Date()).getTime(),
            	p0 = (now - req.zoomStart) / (req.zoomEnd - req.zoomStart),
            	p = p0 > 1 ? 1 : p0,
            	q = 1 - p,
                dz = ts.options.zoom - req.zoom,
                scale = Math.pow(2, -dz * q),
                ovls = this.options.ovls;

            for(var id in ovls) {
				ovls[id].css("left", (ovls[id].left - dexy.deltaElemX) * scale + "px")
					.css("top", (ovls[id].top - dexy.deltaElemY) * scale + "px");
			}
        },

        afterZoom: function(ts, req, dexy) {
            this.plot(ts, true);
        },

        beforeResize: function(ts, req) {},

        afterResize: function(ts, req) {
            var deltaElemX = (ts.width - req.width) >> 1,
                deltaElemY = (ts.height - req.height) >> 1;
            this.options.left += deltaElemX;
            this.options.top += deltaElemY;
            this.element
                .css("left", this.options.left + "px")
                .css("top", this.options.top + "px");
        }
    });

    $.widget("tlsq.tsoverlay", {
        options: {
        	version: tsVersion,
            id: undefined,
            lon: 0,
            lat: 0,
            width: 20,
            height: 20,
            marginLeft: 0,
            marginRight: 0,
            marginTop: 0,
            marginBottom: 0,
            paddingLeft: 0,
            paddingRight: 0,
            paddingTop: 0,
            paddingBottom: 0
        },

        _create: function() {
            var elem = this.element
                .css("width", this.options.width + "px")
                .css("height", this.options.height + "px")
                .css("margin-left", this.options.marginLeft + "px")
                .css("margin-right", this.options.marginRight + "px")
                .css("margin-top", this.options.marginTop + "px")
                .css("margin-bottom", this.options.marginBottom + "px")
                .css("padding-left", this.options.paddingLeft + "px")
                .css("padding-right", this.options.paddingRight + "px")
                .css("padding-top", this.options.paddingTop + "px")
                .css("padding-bottom", this.options.paddingBottom + "px")
                .css("position", "absolute")
                .css("left", "0px")
                .css("top", "0px");

            if(this.options.id) {
                elem.attr("id", this.options.id);
            } else {
                this.options.id = "overlay_" + (new Date()).getTime() + ~~(Math.random() * 1000000);
                elem.attr("id", this.options.id);
            }

            if(elem.is("a")) {
                if(!elem.attr("href")) {
                    elem.attr("href","javascript:void(0)");
                }
            }

            this.element.data("lon", this.options.lon);
            this.element.data("lat", this.options.lat);
            this.element.data("status", 1);

            this.element.data("widgetFullName", this.widgetFullName);
        },

        _setOption: function(key, value) {
            switch(key) {
            case "clear":
                // handle changes to clear option
                break;
            }

            this._super(key, value);
        },

        _destroy: function() {
        },

        getMapID: function() {
            var overlays = this.element.parent(),
                mapid = overlays.tsoverlays("option", "mapid");
            if(typeof mapid != "string") {
                throw new Error("no parent");
            }
            return mapid;
        },

        getOverlaysID: function() {
            var overlays = this.element.parent();
            if(!overlays) {
                throw new Error("no parent");
            }
            var ovlsid = overlays.attr("id");
            if(!ovlsid) {
                throw new Error("no parent");
            }
            return ovlsid;
        },

        getPopupsID: function() {
            var overlays = this.element.parent(),
                popsid = overlays.tsoverlays("option", "popsid");
            if(typeof popsid != "string") {
                throw new Error("no parent");
            }
            return popsid;
        }
    });

    $.widget("tlsq.tsmarker", $.tlsq.tsoverlay, {
        options: {
            src: "TilesSquare/img/marker-b.png",
            title: "",
            width: 21,
            height: 28,
            marginTop: -28,
            marginLeft: -10,
            elev: 6
        },

        _create: function() {
            this._super();

            // 画像
            var img = $("<img />")
                .css("margin", "0px")
                .css("padding", "0px")
                .css("border-style", "none")
                .css("user-select", "none")
                .css("-moz-user-select", "none")
                .css("-webkit-user-select", "none")
                .css("-ms-user-select", "none")
                .attr("width", this.options.width)
                .attr("height", this.options.height)
                .attr("src", this.options.src)
                .attr("alt", this.options.title)
                .attr("onSelectStart", "return false;");
            this.element.append(img);

            this._on({
                mouseover: function(ev) {
                    var elem = $(this.element),
                        eid = elem.attr("id"),
                        tid = eid + "_tooltip",

                        tooltip = $("<div />").tstooltip({
                            id: tid,
                            markerID: eid,
                            text: this.options.title
                        });
                    tooltip.tstooltip("open", this);
                },

                mouseout: function(ev) {
                    var elem = $(this.element),
                        eid = elem.attr("id"),
                        tid = eid + "_tooltip";
                    $("#" + tid).tstooltip("close");
                }
            });
        },

        // popupsから見たマーカーの指している地点の座標
        byPopups: function() {
            var elem = $(this.element),
                tofs = elem.offset(),
                popsid = this.getPopupsID(),
                popups = $("#" + popsid),
                pofs = popups.offset();
            return {
                left: tofs.left - this.options.marginLeft - pofs.left,
                top: tofs.top - this.options.marginTop - pofs.top
            };
        }
    });

    // 今のところ継承禁止 ポリモーフィズム対応待ち
    $.widget("tlsq.tspopups", {
        options: {
        	version: tsVersion,
            left: 0,
            top: 0,
            pops: {},
            mapid: undefined,
            ovlsid: undefined,
            ucnt: 0
        },

        _create: function() {
            this.element
                .css("width", "1px")
                .css("height", "1px")
                .css("margin", "0px")
                .css("padding", "0px")
                .css("position", "absolute")
                .css("left", "0px")
                .css("top", "0px");
        },

        _setOption: function(key, value) {
            switch(key) {
            case "clear":
                // handle changes to clear option
                break;
            }

            this._super(key, value);
        },

        _destroy: function() {
        },

        openPopup: function(popup) {
            var pelem = popup.element;
            var id = pelem.attr("id");
            if(!id) {
                this.options.ucnt++;
                id = this.element.attr("id") + "_" + this.options.ucnt;
                pelem.attr("id", id);
            }

            var pops = this.options.pops;
            if(!pops[id]) {
                pops[id] = pelem;
                this.element.append(pelem);
            }
        },

        closePopup: function(id) {
            var pops = this.options.pops;
            if(pops[id]) {
                pops[id].remove();
                if(pops[id]) delete pops[id];
            }
        },

        closePopups: function(options) {
            var pops = this.options.pops;

            // 全クローズ
            if(!options) {
                for(var id in pops) {
                    pops[id].remove();
                }
                this.options.pops = {};

                // 画面中心を原点にリセット
                var mapid = this.options.mapid,
                    ts = $("#" + mapid).tsmap("option", "active");
                if(ts) {
                    this.options.left = ts.width >> 1;
                    this.options.top = ts.height >> 1;
                    this.element
                        .css("left", this.options.left + "px")
                        .css("top", this.options.top + "px");
                }

                return;
            }

            // ID指定クローズ
            if(options.ids) {
                for(var idx = 0; idx < options.ids.length; idx++) {
                    var id = options.ids[idx];
                    if(pops[id]) {
                        pops[id].remove();
                        if(pops[id]) delete pops[id];
                    }
                }
            }

            // 指定範囲外クローズ
            // TODO: 動作未確認
            if(options.elemX1 !== undefined && options.elemX2 !== undefined) {
                for(var id in pops) {
                    var elemX = pops[id].data("elemX");
                    if(elemX < options.elemX1 || options.elemX2 < elemX) {
                        pops[id].remove();
                        if(pops[id]) delete pops[id];
                    }
                }
            }

            if(options.elemY1 !== undefined && options.elemY2 !== undefined) {
                for(var id in pops) {
                    var elemY = pops[id].data("elemY");
                    if(elemY < options.elemY1 || options.elemY2 < elemY) {
                        pops[id].remove();
                        if(pops[id]) delete pops[id];
                    }
                }
            }
        },

        activate: function(ts) {
            this.closePopups()
            this.element.show();
        },

        deactivate: function(ts) {
            this.closePopups()
            this.element.hide();
        },

        beforeDrag: function(ts, req) {},

        afterDrag: function(ts, req) {
            this.options.left -= req.deltaElemX;
            this.options.top -= req.deltaElemY;
            this.element
                .css("left", this.options.left + "px")
                .css("top", this.options.top + "px");
        },

        beforeMove: function(ts, req) {
            this.options.left -= req.elemX - (ts.width >> 1);
            this.options.top -= req.elemY - (ts.height >> 1);
        },

        inMoving: function(ts, req, dexy) {
            this.element
                .css("left", (this.options.left - dexy.deltaElemX) + "px")
                .css("top", (this.options.top - dexy.deltaElemY) + "px");
        },

        afterMove: function(ts, req, dexy) {
            this.options.left -= dexy.deltaElemX;
            this.options.top -= dexy.deltaElemY;
            this.element
                .css("left", this.options.left + "px")
                .css("top", this.options.top + "px");
        },

        beforeZoom: function(ts, req) {
            this.closePopups()
            this.element.hide();
        },

        inZooming: function(ts, req, dexy) {
        },

        afterZoom: function(ts, req, dexy) {
            this.element.show();
        },

        beforeResize: function(ts, req) {},

        afterResize: function(ts, req) {
            var deltaElemX = (ts.width - req.width) >> 1,
                deltaElemY = (ts.height - req.height) >> 1;
            this.options.left += deltaElemX;
            this.options.top += deltaElemY;
            this.element
                .css("left", this.options.left + "px")
                .css("top", this.options.top + "px");
        }
    });

    $.widget("tlsq.tspopup", {
        options: {
        	version: tsVersion,
            id: undefined,
            margin: 0,
            padding: 0,
            fontSize: 12
        },

        _create: function() {
            var elem = this.element
                .css("margin", this.options.margin + "px")
                .css("padding", this.options.padding + "px")
                .css("font-size", this.options.fontSize + "px")
                .css("position", "absolute")
                .css("left", "0px")
                .css("top", "0px");

            if(this.options.id) {
                elem.attr("id", this.options.id);
            } else {
                this.options.id = "popup_" + (new Date()).getTime();
                elem.attr("id", this.options.id);
            }

            this.element.data("widgetFullName", this.widgetFullName);
        },

        _setOption: function(key, value) {
            switch(key) {
            case "clear":
                // handle changes to clear option
                break;
            }

            this._super(key, value);
        },

        _destroy: function() {
        },

        getMapID: function() {
            var popups = this.element.parent(),
                mapid = popups.tspopups("option", "mapid");
            if(typeof mapid != "string") {
                throw new Error("no parent");
            }
            return mapid;
        },

        getOverlaysID: function() {
            var popups = this.element.parent(),
                ovlsid = popups.tspopups("option", "ovlsid");
            if(typeof ovlsid != "string") {
                throw new Error("no parent");
            }
            return ovlsid;
        },

        getPopupsID: function() {
            var popups = this.element.parent();
            if(!popups) {
                throw new Error("no parent");
            }
            var popsid = popups.attr("id");
            if(!popsid) {
                throw new Error("no parent");
            }
            return popsid;
        },

        open: function(marker) {
            // 開いているポップアップを閉じる
            var popsid = marker.getPopupsID();
            popups = $("#" + popsid);
            popups.tspopups("closePopups");

            // 親に追加
            popups.tspopups("openPopup", this);
        },

        close: function(self) {
            if(!self) self = this;

            // 開いているポップアップを閉じる
            var popsid = self.getPopupsID();
            $("#" + popsid).tspopups("closePopups");
        }
    });

    $.widget("tlsq.tstooltip", $.tlsq.tspopup, {
        options: {
            width: 100,
            padding: 4,
            borderWidth: 2
        },

        _create: function() {
            this._super();

            var elem = this.element
                .css("background-color", "#fff")
                .css("padding", this.options.padding + "px")
                .css("width", this.options.width + "px")
                .css("text-align", "center")
                .css("position", "absolute")
                .css("border", this.options.borderWidth + "px solid #548")
                .css("border-radius", "8px")
                .css("opacity", "0.0");

            elem = $("<span />")
                .css("margin", "0px")
                .css("padding", "0px")
                .css("position", "relative");

            if(this.options.text) {
                elem.text(this.options.text);
            }

            this.element.append(elem);
        },

        open: function(marker) {
            this._super(marker);

            // 内容の文字列幅に合わせる
            var elem = this.element,
                child = elem.children(),
                tmp = (this.options.padding + this.options.borderWidth) * 2;
            if(child.width() + tmp < this.options.width) {
                this.options.width = child.width() + tmp;
                elem.css("width", this.options.width);
            }

            // マーカーの指している地点
            var plt = marker.byPopups(),

            // さらにツールチップの表示位置を調整
                tmp = this.options.padding + this.options.borderWidth,
                left = plt.left - (this.options.width >> 1) - tmp,
                top = plt.top - marker.options.height - elem.height() - tmp * 2 - marker.options.elev;

            // フェードインして表示
            elem.css("left", left + "px")
                .css("top", (top + 4) + "px")
                .animate({
                    top: top + "px",
                    opacity: "0.8"
                }, 200);
        }
    });

    $.widget("tlsq.tssignboard", $.tlsq.tspopup, {
        options: {
            width: 100,
            height: 100,
            padding: 18,
            borderWidth1: 2,
            borderWidth2: 1,
            closable: false,
            markerElev : 0
        },

        _create: function() {
            this._super();

            var self = this,
                closeFunc = function () {
                    if(!self.options.closable) return;
                    self.close();
                };

            this.options.maskID = this.options.id + "_mask";
            var mask = $("<div />")
                .attr("id", this.options.maskID)
                .css("background-color", "black")
                .css("position", "absolute")
                .css("opacity", "0.6")
                .click(closeFunc),

                elem = this.element;
            elem.css("opacity", "0.0");
            elem.append(mask);

            this.options.frameID = this.options.id + "_frame";
            var frame = $("<div />")
                .attr("id", this.options.frameID)
                .css("background-color", "#dbf")
                .css("position", "absolute")
                .css("border", this.options.borderWidth1 + "px solid #548")
                .css("border-radius", "8px");
            elem.append(frame);

            var closeBtn = $("<a />")
                .attr("href", "javascript:void(0)")
                .css("position", "absolute")
                .css("right", "3px")
                .css("top", "3px")
                .click(closeFunc),

                ser = "data:image/png;base64,"
                    + "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAVlJREFUOMudk71u"
                    + "FEEQhL/aswSBE8hMhNNLsAnADjBERCRoe+zAuhiR8C5kPAACCbcsAggQweEAIUuAHaCT34InsItk9zQs"
                    + "d/x1NqOq7lJ/MzCoiBD/U6WUUUQ8/JMuInZKKdf6c9OZLwFT4DAinvzGfB84Aj6WUtbmDWyv274jCeBp"
                    + "RDxaYL4HvJOE7eu2b88bZOYZsGUbSUh6VifpJk87M8AkM19HhDSYclPSly4VwGPgTNK0utvLzFe9Rwui"
                    + "bgGfVPXuk9meZObzWq8lRG7ZPgIuA735p8l9rSxZ+CrQ9Cm6BFcWCUdLUL2XNLJ9DlxIamw/GI/H32ez"
                    + "2XGtbwbmuxUqgAmw3e9gEeJmMPnDANXLzPxcIwbmiOcYI2JD0kmFajczDwbpNoGv1YD9zHzRP6RT2286"
                    + "7WRo7jQnwHZH5Zvtt79stG3bnb/4TDci4upSQdu2//SdfwBsRqV2wx83WgAAAABJRU5ErkJggg==",
                closeImg = $("<img />")
                    .css("margin", "0px")
                    .css("padding", "0px")
                    .css("border-style", "none")
                    .attr("src", ser)
                    .attr("alt", "close button");
            closeBtn.append(closeImg);
            frame.append(closeBtn);

            this.options.contentID = this.options.id + "_content";
            var content = $("<div />")
                .attr("id", this.options.contentID)
                .css("background-color", "#fff")
                .css("margin", "0px")
                .css("padding", "0px")
                .css("position", "absolute")
                .css("border", this.options.borderWidth2 + "px inset #ecf")
                .css("left", "0px")
                .css("top", "0px");
            frame.append(content);
        },

        open: function(marker) {
            this._super(marker);

            var mapid = this.getMapID(),
                map = $("#" + mapid),
                ts = map.tsmap("option", "active"),
                popsid = this.getPopupsID(),
                popups = $("#" + popsid),
                pofs = popups.offset();

            // マスクを拡大
            $("#" + this.options.maskID)
                .css("width", ts.width * 3)
                .css("height", ts.height * 3)
                .css("left", (-pofs.left - ts.width) + "px")
                .css("top", (-pofs.top - ts.height) + "px");

            if(ts.hasSlider) {
                // 後ろの定数は適当
                this.options.width = ts.width - 300;
                this.options.height = ts.height - marker.options.height * 2 - 60;
            } else {
                this.options.width = ts.width;
                this.options.height = ts.height - marker.options.height * 2;
            }

            // フレームを調整
            var frame = $("#" + this.options.frameID)
                .css("width", this.options.width + "px")
                .css("height", this.options.height + "px"),

            // 内容表示部分を調整
                tmp = this.options.padding + this.options.borderWidth1;
            $("#" + this.options.contentID)
                .css("width", (this.options.width - tmp * 2) + "px")
                .css("height", (this.options.height - tmp * 2) + "px")
                .css("left", tmp + "px")
                .css("top", tmp + "px");

            // ダミーマーカーを作成
            this.options.dmMarkerID = this.options.id + "_dmMarker";
            var oofs = marker.element.offset(),
                dmMarker = $("<img />")
                    .attr("id", this.options.dmMarkerID)
                    .attr("src", marker.options.src)
                    .css("margin", "0px")
                    .css("padding", "0px")
                    .css("position", "absolute")
                    .css("border-style", "none")
                    .css("left", (oofs.left - pofs.left) + "px")
                    .css("top", (oofs.top - pofs.top) + "px"),
                elem = this.element;
            elem.append(dmMarker);

            // マーカーの指している地点
            var plt = marker.byPopups(),

            // さらにサインボードの表示位置を調整
                frame = $("#" + this.options.frameID),
//              tmp = this.options.padding + this.options.borderWidth1, // 腑に落ちない
                tmp = this.options.borderWidth1,
                left = plt.left - (frame.width() >> 1) - tmp,
                top = plt.top - marker.options.height - frame.height() - tmp * 2 - marker.options.elev,

            // フェードインして表示
                span = 500,
                self = this;
            frame.css("left", left + "px")
                .css("top", (top + 50) + "px");
            frame.animate({
                top: top + "px"
            }, span);
            elem.animate({
                opacity: "1.0"
            }, span);
            marker.element.animate({
                opacity: "0.0"
            }, span);
            setTimeout(function() {
                self.options.closable = true;
            }, span);

            // 中央に寄せる
            var mofs = map.offset();
            ts.onMove({
                elemX: oofs.left - mofs.left - marker.options.marginLeft,
                elemY: oofs.top - mofs.top - marker.options.marginTop - (frame.height() >> 1)
                    - tmp - marker.options.elev
            });

            this.options.markerElev = marker.options.elev;
        },

        close: function() {
            var span = 500;
            this.element.animate({
                opacity: "0"
            }, span);

            var marker = $("#" + this.options.markerID);
            marker.animate({
                opacity: "1.0"
            }, span);

            var mapid = this.getMapID(),
                map = $("#" + mapid),
                ts = map.tsmap("option", "active"),
                frame = $("#" + this.options.frameID),
                tmp = this.options.borderWidth1;
            ts.onMove({
                elemX: ts.width >> 1,
                elemY: (ts.height >> 1) + (frame.height() >> 1) + tmp + this.options.markerElev
            });

            var self = this,
                closeFunc = self._super;
            setTimeout(function() {
                closeFunc(self);
            }, span + 20);
        }
    });

    $.widget("tlsq.tsmap", {
        options: {
        	version: tsVersion,
            width: 0,
            height: 0,
            tss: [],
            zoom: 12,
            overlays: undefined,
            lon: 139.6916667,
            lat: 35.6894444,
            hasArrows: !(isIOS || isAndroid || isWindowsPhone),
            hasSlider: !(isIOS || isAndroid || isWindowsPhone),
            hasPlsMns: true,
            hasScale: true,
            active: undefined,
            onCreate: undefined,
            onActivate: undefined,
            onDeactivate: undefined,
            beforeDrag: undefined,
            afterDrag: undefined,
            beforeMove: undefined,
            inMoving: undefined,
            afterMove: undefined,
            beforeZoom: undefined,
            inZooming: undefined,
            afterZoom: undefined,
            beforeResize: undefined,
            afterResize: undefined,
            onDraw: undefined,
            onLoaded: undefined,
            onPointerSingle: undefined
        },

        _create: function() {
            this.options.isIOS = isIOS;
            this.options.isAndroid = isAndroid;
            this.options.isWindowsPhone = isWindowsPhone;

            this.options.isAutoFit = (this.options.width == 0 && this.options.height == 0);

            // 地図
            var elem = this.element
                .css("position", "relative")
                .css("width", this.options.isAutoFit ? $(window).width() : this.options.width + "px")
                .css("height", this.options.isAutoFit ? $(window).height() : this.options.height + "px")
                .css("z-index", 30000) // 指定しないとSafariがドラッグ中のオーバーレイを更新しなかった
                .css("overflow", "hidden");

            // キャンバス
            var mapid = elem.attr("id");
            this.options.cvsid = mapid + "_canvas";
            var canvas = $("<canvas />")
                .attr("id", this.options.cvsid)
                .attr("width", this.options.isAutoFit ? $(window).width() : this.options.width)
                .attr("height", this.options.isAutoFit ? $(window).height() : this.options.height);
            elem.append(canvas);

            this.onDrag = function(options) {
                if(this.options.active) {
                    this.options.active.onDrag(options);
                }
            };

            this.onMove = function(options) {
                if(this.options.active) {
                    this.options.active.onMove(options);
                }
            };

            this.onZoom = function(options) {
                if(this.options.active) {
                    this.options.active.onZoom(options);
                }
            };

            if("ontouchstart" in window && (isIOS || isAndroid || isWindowsPhone)) {
                this.pointerHandler = new TSTouchHandler();
                this.pinch2deltaZ = function(pinch) {
                    return (this.options.active ? this.options.active.pinch2deltaZ(pinch) : 0);
                };
            } else {
                this.pointerHandler = new TSMouseHandler();
                this.wheel2deltaZ = function(wheel) {
                    return (this.options.active ? this.options.active.wheel2deltaZ(wheel) : 0);
                };
            }
            this.pointerHandler.init({
                map: this,
                cvsid: this.options.cvsid
            });
            this._on(canvas, this.pointerHandler.getAdapter());

            if(this.options.isAutoFit) {
                this.onResize = function() {
                    var width = $(window).width(),
                        height = $(window).height(),
                        cvsid = this.options.cvsid;

                    $(this.element)
                        .css("width", width + "px")
                        .css("height", height + "px"),
                    $(document.getElementById(cvsid))
                        .attr("width", width)
                        .attr("height", height);

                    if(this.options.active) {
                        this.options.active.onResize({
                            width: width,
                            height: height
                        });
                    }
                };

                this._on(window, {
                    resize: this.onResize
                });
            }

            // オーバーレイ
            var overlays = (this.options.overlays ? this.options.overlays : $("<div />").tsoverlays()),
                ovlsid = overlays.attr("id");
            if(!ovlsid) {
                ovlsid = mapid + "_overlays";
                overlays.attr("id", ovlsid);
            }
            this.options.ovlsid = ovlsid;
            elem.append(overlays);

            // クレジット
            this.options.cdtid = mapid + "_credit";
            var credit = $("<div />")
                .attr("id", this.options.cdtid)
                .css("background-color", "rgba(0,0,0,.2)")
                .css("margin", "0px")
                .css("padding", "2px 6px")
                .css("font-size", "10px")
                .css("position", "absolute")
                .css("right", "0px")
                .css("bottom", "0px");
            elem.append(credit);

            // 移動ボタン
            var self = this;
            var arws = {
                nw: [ 11, 11, -1, -1 ],
                n:  [ 36, 11,  0, -1 ],
                ne: [ 61, 11,  1, -1 ],
                w:  [ 11, 36, -1,  0 ],
                e:  [ 61, 36,  1,  0 ],
                sw: [ 11, 61, -1,  1 ],
                s:  [ 36, 61,  0,  1 ],
                se: [ 61, 61,  1,  1 ]
            };
            this.options.arwids = {};
            if(this.options.hasArrows) {
                for(var key in arws) {
                    this.options.arwids[key] = mapid + "_arrow_" + key;

                    var button = $("<div />")
                        .attr("id", this.options.arwids[key])
                        .css("width", "18px")
                        .css("height", "18px")
                        .css("position", "absolute")
                        .css("left", arws[key][0] + "px")
                        .css("top", arws[key][1] + "px")
                        .data("signX", arws[key][2])
                        .data("signY", arws[key][3])
                        .data("onMove", function(sx, sy) {
                            var elem = self.element,
                                width = elem.width(),
                                height = elem.height();
                            self.onMove({
                                elemX: ~~((width >> 1) + sx * width * 2 / 3),
                                elemY: ~~((height >> 1) + sy * height * 2 / 3)
                            })
                        });
                    elem.append(button);

                    button.button({
                        icons: {
                            primary: "ui-icon-triangle-1-" + key
                        },
                        text: false
                    }).click(function(ev) {
                        ev.preventDefault();
                        var elem = $(this);
                        elem.data("onMove")(elem.data("signX"), elem.data("signY"));
                    });
                }
            }

            // ズームスライダー
            this.options.sldid = mapid + "_slider";
            if(this.options.hasSlider) {
                var slider = $("<div />")
                    .attr("id", this.options.sldid)
                    .css("height", "100px")
                    .css("position", "absolute")
                    .css("top", "130px")
                    .data("onZoom", function(zoom) {
                        self.onZoom({
                            zoom: zoom
                        });
                    });
                elem.append(slider);

                slider.slider({
                    orientation: "vertical",
                    range: "max",
                    min: 0,
                    max: 20,
                    slide: function(ev, ui) {
                        $(this).data("onZoom")(ui.value);
                    }
                });
                slider.css("left", ~~((90 - slider.width()) / 2) + "px");

                slider.children().each(function() {
                    // スライダーのツマミとかが高いz-indexなので
                    $(this).css("z-index", "auto");
                });
            }

            // ズームボタン
            var plsmns;
            if(this.options.hasArrows) {
                if(this.options.hasSlider) {
                    plsmns = {
                        plus:  [ 36, 101,  1 ],
                        minus: [ 36, 241, -1 ]
                    };
                } else {
                    plsmns = {
                        plus:  [ 36, 101,  1 ],
                        minus: [ 36, 126, -1 ]
                    };
                }
            } else {
                plsmns = {
                    plus:  [ 11, 11,  1 ],
                    minus: [ 11, 36, -1 ]
                };
            }
            this.options.pmids = {};
            if(this.options.hasPlsMns) {
                for(var key in plsmns) {
                    this.options.pmids[key] = mapid + "_" + key;
                    var button = $("<div />")
                        .attr("id", this.options.pmids[key])
                        .css("width", "18px")
                        .css("height", "18px")
                        .css("position", "absolute")
                        .css("left", plsmns[key][0] + "px")
                        .css("top", plsmns[key][1] + "px")
                        .data("deltaZ", plsmns[key][2])
                        .data("onZoom", function(deltaZ) {
                            self.onZoom({
                                deltaZ: deltaZ
                            });
                        });
                    elem.append(button);

                    button.button({
                        icons: {
                            primary: "ui-icon-" + key
                        },
                        text: false
                    }).click(function(ev) {
                        ev.preventDefault();
                        var elem = $(this);
                        elem.data("onZoom")(elem.data("deltaZ"));
                    });
                }
            }

            // 画面左下の縮尺
            var sclLines = {
                left:    [   2, 22,  6, 10 ], // 左の縦棒
                horizon: [ 100,  2,  6, 20 ], // 横棒
                kmLine:  [   2, 10, 84, 22 ], // kmの縦棒
                miLine:  [   2, 10, 84, 10 ]  // マイルの縦棒
            },
            sclLabels = {
                kmLabel: [ 80, 10, 12, 26 ],
                miLabel: [ 80, 10, 12,  6 ]
            };
            this.options.sclids = {};
            if(this.options.hasScale) {
                for(var key in sclLines) {
                    this.options.sclids[key] = mapid + "_scale_" + key;
                    var eid = this.options.sclids[key],
                        part = $("<div />")
                            .attr("id", eid)
                            .css("background-color", "#000")
                            .css("width", sclLines[key][0] + "px")
                            .css("height", sclLines[key][1] + "px")
                            .css("margin", "0px")
                            .css("padding", "0px")
                            .css("position", "absolute")
                            .css("left", sclLines[key][2] + "px")
                            .css("bottom", sclLines[key][3] + "px");
                    elem.append(part);
                }

                for(var key in sclLabels) {
                    this.options.sclids[key] = mapid + "_scale_" + key;
                    var eid = this.options.sclids[key],
                        part = $("<div />")
                            .attr("id", eid)
                            .css("width", sclLabels[key][0] + "px")
                            .css("height", sclLabels[key][1] + "px")
                            .css("margin", "0px")
                            .css("padding", "0px")
                            .css("font-size", "10px")
                            .css("line-height", "10px")
                            .css("position", "absolute")
                            .css("left", sclLabels[key][2] + "px")
                            .css("bottom", sclLabels[key][3] + "px");
                    elem.append(part);
                }
            }

            // ポップアップ
            var popups = (this.options.popups ? this.options.popups : $("<div />").tspopups()),
                popsid = popups.attr("id");
            if(!popsid) {
                popsid = mapid + "_popups";
                popups.attr("id", popsid);
            }
            this.options.popsid = popsid;
            popups.tspopups("option", "ovlsid", this.options.ovlsid);
            overlays.tsoverlays("option", "popsid", popsid);
            popups.tspopups("option", "mapid", mapid);
            overlays.tsoverlays("option", "mapid", mapid);
            elem.append(popups);

            if(this.options.onCreate) {
                this.options.onCreate(mapid, this.options.ovlsid, this.options.popsid);
            }
        },

        _setOption: function(key, value) {
            switch(key) {
            case "clear":
                // handle changes to clear option
                break;
            }

            this._super(key, value);
        },

        _destroy: function() {
            var tss = this.options.tss;
            for(var idx = 0; idx < tss.length; idx++) {
                if(tss[idx].initialized) {
                    tss[idx].destroy();
                }
            }
        },

        select: function(tid) {
            var cvsid = this.options.cvsid,
                canvas = $(document.getElementById(cvsid)),
                width = canvas.attr("width"),
                height = canvas.attr("height"),
                tss = this.options.tss,

                actvIdx = -1;
            for(var idx = 0; idx < tss.length; idx++) {
                if(tss[idx].options.id == tid) {
                    actvIdx = idx;
                } else if(tss[idx].initialized && tss[idx].activated) {
                    this.options.zoom = tss[idx].options.zoom;
                    this.options.lon = tss[idx].options.lon;
                    this.options.lat = tss[idx].options.lat;
                    tss[idx].deactivate();
                }
            }

            if(actvIdx >= 0) {
                if(!tss[actvIdx].initialized) {
                    tss[actvIdx].init({
                        isIOS: this.options.isIOS,
                        isAndroid: this.options.isAndroid,
                        isWindowsPhone: this.options.isWindowsPhone,
                        interval: this.options.interval,
                        cvsid: cvsid,
                        cdtid: this.options.cdtid,
                        hasArrows: this.options.hasArrows,
                        arwids: this.options.arwids,
                        hasSlider: this.options.hasSlider,
                        sldid: this.options.sldid,
                        hasPlsMns: this.options.hasPlsMns,
                        pmids: this.options.pmids,
                        hasScale: this.options.hasScale,
                        sclids: this.options.sclids,
                        ovlsid: this.options.ovlsid,
                        popsid: this.options.popsid,
                        onActivate: this.options.onActivate,
                        onDeactivate: this.options.onDeactivate,
                        beforeDrag: this.options.beforeDrag,
                        afterDrag: this.options.afterDrag,
                        beforeMove: this.options.beforeMove,
                        inMoving: this.options.inMoving,
                        afterMove: this.options.afterMove,
                        beforeZoom: this.options.beforeZoom,
                        inZooming: this.options.inZooming,
                        afterZoom: this.options.afterZoom,
                        beforeResize: this.options.beforeResize,
                        afterResize: this.options.afterResize,
                        onDraw: this.options.onDraw,
                        onLoaded: this.options.onLoaded,
                        width: width,
                        height: height
                    });
                }

                if(this.options.zoom < tss[actvIdx].options.minZoom) {
                    this.options.zoom = tss[actvIdx].options.minZoom;
                } else if(this.options.zoom > tss[actvIdx].options.maxZoom) {
                    this.options.zoom = tss[actvIdx].options.maxZoom;
                }

                tss[actvIdx].activate({
                    width: width,
                    height: height,
                    zoom: this.options.zoom,
                    lon: this.options.lon,
                    lat: this.options.lat
                });
                this.options.active = tss[actvIdx];
            }
        }
    });
}(jQuery));
