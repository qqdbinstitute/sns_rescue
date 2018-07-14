$(function() {
	var ua = navigator.userAgent,
		isMobile = ua.indexOf("iPhone") > 0 || ua.indexOf("iPod") > 0
			|| (ua.indexOf("Android") > 0) && (ua.indexOf("Mobile") > 0)
			|| ua.indexOf("Windows Phone") > 0,
		inputFocusIn = false;

	if(!navigator.geolocation) {
		$("#geoButtonLi").hide();
	}

	$(window).on("scroll", function() {
		if(inputFocusIn) return;

		var scrollHeight = $(document).height(),
			scrollPosition = $(window).height() + $(window).scrollTop();
		if(scrollHeight - scrollPosition > 100) {
			$("#messageFooter").slideDown("slow");
		} else {
			$("#messageFooter").slideUp();
		}
	});

	$("input,select,textarea").on("change", function() {
		updateForm();
	});
	$("input[type=text],input[type=password],input[type=email],input[type=tel],input[type=url],input[type=file],textarea").on("focus", function() {
		if(isMobile) {
			$("#messageFooter").slideUp("slow");
		}
		inputFocusIn = true;
	});
	$("input,select,textarea").on("blur", function() {
		var scrollHeight = $(document).height(),
			scrollPosition = $(window).height() + $(window).scrollTop();
		if(isMobile && scrollHeight - scrollPosition > 100) {
			$("#messageFooter").slideDown();
		}
		inputFocusIn = false;
	});

	$("#messageBox").on("show.bs.modal", function() {
		if(requestMessageBoxQueue.length > 0) {
			isMessageBoxOpen = true;

			var req = requestMessageBoxQueue.pop(),
				text = req[0],
				icon = req[1],
				title = req[2];
			$("#messageBoxText").text(text);
			$("#messageBoxIcon").html(icon);
			$("#messageBoxTitle").text(title);
		}
	});
	$("#messageBox").on("hidden.bs.modal", function() {
		isMessageBoxOpen = false;
		if(requestMessageBoxQueue.length > 0) {
			$("#messageBoxOpen").click();
		}
	});

	$.widget("snsr.placemarker", $.tlsq.tsoverlay, {
		options: {
			width: 208,
			height: 68,
			marginTop: -78,
			marginLeft: -104
		},

		_create: function() {
			this._super("_create");

			var $cs = $("<span />").text(this.options.content)
					.addClass("placeContent").hide();
			$("body").append($cs);
			var px = 20, py = 15,
				width = $cs.width() + 2 * px,
				height = $cs.height() + 2 * py,
				$cs = $cs.detach().show();
			$(this.element).addClass("placeMarker")
				.append($cs)
				.css("width", width + "px")
				.css("height", height + "px")
				.css("margin-top", -(height + 11) + "px")
				.css("margin-left", -(width >> 1) + "px")
				.css("padding", py + "px " + px + "px")
				.draggable({
					start: function(ev, ui) {
						$(this).placemarker("start", ev, ui);
					},
					stop: function(ev, ui) {
						$(this).placemarker("end", ev, ui);
					},
					drag: function(ev, ui) {
						$(this).placemarker("move", ev, ui);
					}
				});
		},

		start: function(ev, ui) {
			var elem = $(this.element);
			elem.css("cursor", "all-scroll");
		},

		end: function(ev, ui) {
			var elem = $(this.element);
			elem.css("cursor", "default");
		},

		move: function(ev, ui) {
    		var elem = $(this.element),
    			mapElem = $("#" + this.options.mapid),
				ts = mapElem.tsmap("option", "active"),
				offset = $("#" + ts.cvsid).offset(),
				exy = {
					elemX: ui.offset.left - offset.left,
					elemY: ui.offset.top - offset.top
				},
				dexy = {
					deltaElemX: exy.elemX - (ts.width >> 1),
					deltaElemY: exy.elemY - (ts.height >> 1)
				},
				lonlat = ts.deltaElem2LonLat(dexy);

			mapLat = lonlat.lat;
			mapLon = lonlat.lon;
			elem.data("lon", mapLon);
			elem.data("lat", mapLat);
			var content = mapLat.toFixed(5) + "," + mapLon.toFixed(5);
			$(".placeContent").text(content);
		}
	});

	$("#placeLatLonBox").on("shown.bs.modal", function() {
		var prefectures = [
			[ "北海道", 141.346785, 43.064278 ],
			[ "青森県", 140.740087, 40.824338 ],
			[ "岩手県", 141.152592, 39.703647 ],
			[ "宮城県", 140.871846, 38.268803 ],
			[ "秋田県", 140.103250, 39.718058 ],
			[ "山形県", 140.363278, 38.240457 ],
			[ "福島県", 140.467734, 37.749957 ],
			[ "茨城県", 140.446735, 36.341450 ],
			[ "栃木県", 139.883528, 36.565689 ],
			[ "群馬県", 139.060947, 36.391192 ],
			[ "埼玉県", 139.648854, 35.856907 ],
			[ "千葉県", 140.123184, 35.604588 ],
			[ "東京都", 139.691717, 35.689568 ],
			[ "神奈川県", 139.642536, 35.447710 ],
			[ "新潟県", 139.023531, 37.902238 ],
			[ "富山県", 137.211341, 36.695190 ],
			[ "石川県", 136.625725, 36.594652 ],
			[ "福井県", 136.221791, 36.065244 ],
			[ "山梨県", 138.568379, 35.663935 ],
			[ "長野県", 138.180991, 36.651310 ],
			[ "岐阜県", 136.722168, 35.391199 ],
			[ "静岡県", 138.383023, 34.976906 ],
			[ "愛知県", 136.906739, 35.180198 ],
			[ "三重県", 136.508594, 34.730268 ],
			[ "滋賀県", 135.868292, 35.004394 ],
			[ "京都府", 135.755635, 35.021279 ],
			[ "大阪府", 135.519994, 34.686394 ],
			[ "兵庫県", 135.182995, 34.691304 ],
			[ "奈良県", 135.832883, 34.685231 ],
			[ "和歌山県", 135.167450, 34.225994 ],
			[ "鳥取県", 134.238174, 35.503704 ],
			[ "島根県", 133.050530, 35.472212 ],
			[ "岡山県", 133.934894, 34.661759 ],
			[ "広島県", 132.459369, 34.396271 ],
			[ "山口県", 131.471401, 34.185859 ],
			[ "徳島県", 134.559484, 34.065728 ],
			[ "香川県", 134.043390, 34.340160 ],
			[ "愛媛県", 132.766103, 33.841646 ],
			[ "高知県", 133.531115, 33.559753 ],
			[ "福岡県", 130.418114, 33.606261 ],
			[ "佐賀県", 130.298799, 33.249322 ],
			[ "長崎県", 129.873514, 32.744836 ],
			[ "熊本県", 130.741134, 32.790374 ],
			[ "大分県", 131.612605, 33.238128 ],
			[ "宮崎県", 131.423863, 31.910975 ],
			[ "鹿児島県", 130.558141, 31.560185 ],
			[ "沖縄県", 127.680975, 26.212365 ]
		];

		var prefText = $("#mapPrefecture option:selected").text(),
			lat = 34.3965,
			lon = 132.4596,
			zoom = 8,
			found = false;
		$(prefectures).each(function() {
			if(this[0] == prefText) {
				lat = this[2];
				lon = this[1];
				found = true;
				return false;
			}
		});

		var placeLatLon = $("#placeLatLon").val(),
			placeVals = placeLatLon.split(/,/),
			tmpLat = undefined,
			tmpLon = undefined;
		if(placeVals.length == 2
				&& 20 < placeVals[0] && placeVals[0] < 50
				&& 120 < placeVals[1] && placeVals[1] < 155) {
			tmpLat = +placeVals[0];
			tmpLon = +placeVals[1];
			if(!found) {
				lat = tmpLat;
				lon = tmpLon;
				zoom = 14;
			}
		}

		if(mapInitialized) {
			updateMap(lat, lon, zoom);
		} else {
			initializeMap(lat, lon, zoom);
		}

		if(tmpLat !== undefined) {
			var $mapElem = $("#mapContainer"),
				ts = $mapElem.tsmap("option", "active"),
				$ovlsElem = $("#" + ts.ovlsid);
				$ovlsElem.tsoverlays("removeOverlays"),
				content = tmpLat.toFixed(5) + "," + tmpLon.toFixed(5),
				$placeMarker = $("<div />").placemarker({
					mapid: $mapElem.attr("id"),
					content: content,
					lon: tmpLon,
					lat: tmpLat
				});
			$ovlsElem.tsoverlays("mergeOverlays", [ $placeMarker ])
				.tsoverlays("plot", ts, true);
		}

	});

	new ClipboardJS("#copyMessageBtn");

	updateForm();
});

function updateForm() {
	var criteriaText = $("#criteria option:selected").text(),
		criteriaTextSplit = criteriaText.split(/ - /),
		message = criteriaTextSplit[0];

	var useStatusConfirmed = $("#useStatusConfirmed").prop("checked");
	if(useStatusConfirmed) {
		message += " 状態確認" + $("#statusConfirmedHour").val()
			+ ":" + $("#statusConfirmedMinute").val();
	}
	$("#statusConfirmedFieldset").prop("disabled", !useStatusConfirmed);

	var usePlaceAddress = $("#usePlaceAddress").prop("checked"),
		placeAddress = $("#placeAddress").val().replace(/\s/g, "");
	if(usePlaceAddress && placeAddress.length > 0) {
		message += " 住所" + placeAddress;
	}
	$("#placeAddress").prop("disabled", !usePlaceAddress);

	var usePlaceLatLon = $("#usePlaceLatLon").prop("checked"),
		placeLatLon = $("#placeLatLon").val();
	if(usePlaceLatLon && placeLatLon.length > 0) {
		var placeVals = placeLatLon.split(/,/);
		if(placeVals.length > 1) {
			var lat = +placeVals[0],
				lon = +placeVals[1];
				acc = $("#placeAccuracy").val();

			message += " 経緯度" + lat.toFixed(acc) + "," + lon.toFixed(acc);
		}
	}
	$("#placeLatLonFieldset").prop("disabled", !usePlaceLatLon);

	var useAlreadyContacted = $("#useAlreadyContacted").prop("checked");
	if(useAlreadyContacted && $("#alreadyContacted").val() != "undone") {
		message += " 連絡済" + $("#alreadyContacted option:selected").text();
	}
	$("#alreadyContacted").prop("disabled", !useAlreadyContacted);

	var useLandmark = $("#useLandmark").prop("checked"),
		landmark = $("#landmark").val().replace(/\s/g, "");
	if(useLandmark && landmark.length > 0) {
		message += " " + landmark;
	}
	$("#landmark").prop("disabled", !useLandmark);

	var useEvacuee = $("#useEvacuee").prop("checked");
	if(useEvacuee) {
		message += " 避難者" + $("#evacueeCount option:selected").text();
		if($("#evacueeInfant").val() != "none") {
			message += ",幼児" + $("#evacueeInfant option:selected").text();
		}
		if($("#evacueeElder").val() != "none") {
			message += ",高齢者" + $("#evacueeElder option:selected").text();
		}
		if($("#evacueeSick").val() != "none") {
			message += ",傷病人" + $("#evacueeSick option:selected").text();
		}
		if($("#evacueeSerious").val() != "none") {
			message += ",重症者" + $("#evacueeSerious option:selected").text();
		}
		if($("#evacueeUnknown").val() != "none") {
			message += ",安否不明" + $("#evacueeUnknown option:selected").text();
		}
	}
	$("#evacueeFieldset").prop("disabled", !useEvacuee);

	var useShelter1 = $("#useShelter1").prop("checked"),
		shelterKind = $("#shelterKind").val(),
		isShelterBuilding = shelterKind == "building",
		isShelterCar = shelterKind == "car";
	if(useShelter1) {
		message += " ";

		if(isShelterBuilding) {
			switch($("#shelterBuilding").val()) {
			case "wooden":
			case "concrete":
				break;
			default:
				message += "建物";
				break;
			}
			message += $("#shelterBuilding option:selected").text();
			message += ",全" + $("#allFloors option:selected").text();
		} else {
			message += "避難場所" + $("#shelterKind option:selected").text();
		}
	}
	$("#shelter1Fieldset").prop("disabled", !useShelter1);

	var useShelter2 = $("#useShelter2").prop("checked"),
		evacueeFloor = $("#evacueeFloor").val();
	if(useShelter2) {
		if(useShelter1) {
			message += ",";
		} else {
			message += " ";
		}
		if(isShelterBuilding) {
			message += "避難階" + $("#evacueeFloor option:selected").text() + ",";
		} else if(!useShelter1) {
			message += "避難場所";
		}
		message += $("#evacueeDanger option:selected").text();
	}
	$("#shelter2Fieldset").prop("disabled", !useShelter2);

	var usePossession = $("#usePossession").prop("checked"),
		mobilePhone = $("#mobilePhone").val(),
		lighting = $("#lighting").val();
	if(usePossession) {
		if(mobilePhone != "none") {
			message += " 携帯" + $("#mobilePhone option:selected").text();
		}
		if(lighting != "none") {
			message += " 照明" + $("#lighting option:selected").text();
		}
	}
	$("#possessionFieldset").prop("disabled", !usePossession);

	var useRemarks = $("#useRemarks").prop("checked"),
		remarks = $("#remarks").val().replace(/\s/g, "");
	if(useRemarks && remarks.length > 0) {
		message += " " + remarks;
	}
	$("#remarks").prop("disabled", !useRemarks);

	var useOthers1 = $("#useOthers1").prop("checked");
	if(useOthers1) {
		message += " 保温" + $("#warmness option:selected").text();
		message += " 飲料水" + $("#drinkingWater option:selected").text();
		message += " 食料" + $("#food option:selected").text();
	}
	$("#others1Fieldset").prop("disabled", !useOthers1);

	var useOthers2 = $("#useOthers2").prop("checked");
	if(useOthers2) {
		message += " 電気" + $("#electricity option:selected").text();
		message += " 水道" + $("#waterSupply option:selected").text();
	}
	$("#others2Fieldset").prop("disabled", !useOthers2);

	var useOthers3 = $("#useOthers3").prop("checked");
	if(useOthers3) {
		message += " トイレ" + $("#toilet option:selected").text();
		message += " 医薬品" + $("#medicine option:selected").text();
		message += " 衛生用品" + $("#sanitary option:selected").text();
	}
	$("#others3Fieldset").prop("disabled", !useOthers3);

	$("#message").val(message);
	$("#messageCharCount").text(message.length);
	$("#messageTwitterRatio").text(getMessageTwitterRatio(message));

	reloadTwitterButton();

	$("#shelterBuilding").prop("disabled", !isShelterBuilding);
	$("#allFloors").prop("disabled", !isShelterBuilding);
	$("#evacueeFloor").prop("disabled", useShelter1 && !isShelterBuilding);
}

var twitterButtonTimer = -1;
function reloadTwitterButton() {
	if(twitterButtonTimer > 0) {
		clearTimeout(twitterButtonTimer);
		twitterButtonTimer = -1;
	}

	if(!window.twttr) {
		twitterButtonTimer = setTimeout(function() {
			reloadTwitterButton();
		}, 500);
		return;
	}

	var $twitterButtonLi = $("#twitterButtonLi");
	if($twitterButtonLi.children().length > 0) {
		$twitterButtonLi.empty();
	}

	var encodedMessage = encodeURIComponent($("#message").val()),
		$twitterButton = $("<a />").attr("id", "twitterButton")
			.attr("href", "https://twitter.com/intent/tweet?text=" + encodedMessage)
			.addClass("twitter-hashtag-button")
			.attr("data-show-count", "false")
			.attr("data-size", "large")
			.text("Tweet");
	$twitterButtonLi.append($twitterButton);
	twttr.widgets.load();
}

// https://octicons.github.com/
var svgAlert = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"/></svg>';
var svgInfo = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16"><path fill-rule="evenodd" d="M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"/></svg>';
var svgStop = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16"><path fill-rule="evenodd" d="M7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 1.3c1.3 0 2.5.44 3.47 1.17l-8 8A5.755 5.755 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zm0 11.41c-1.3 0-2.5-.44-3.47-1.17l8-8c.73.97 1.17 2.17 1.17 3.47 0 3.14-2.56 5.7-5.7 5.7z"/></svg>';
var svgQuestion = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16"><path fill-rule="evenodd" d="M7 1C3.14 1 0 4.14 0 8s3.14 7 7 7 7-3.14 7-7-3.14-7-7-7zm0 1.3c1.3 0 2.5.44 3.47 1.17l-8 8A5.755 5.755 0 0 1 1.3 8c0-3.14 2.56-5.7 5.7-5.7zm0 11.41c-1.3 0-2.5-.44-3.47-1.17l8-8c.73.97 1.17 2.17 1.17 3.47 0 3.14-2.56 5.7-5.7 5.7z"/></svg>';

var isMessageBoxOpen = false,
	requestMessageBoxQueue = [];

function openMessageBox(text, level, title) {
	var icon;
	switch(level) {
	case "info":
		icon = svgInfo;
		if(!title) title = "情報";
		break;
	case "error":
		icon = svgStop;
		if(!title) title = "エラー";
		break;
	default:
		icon = svgAlert;
		if(!title) title = "注意";
		break;
	}

	requestMessageBoxQueue.push([ text, icon, title ]);
	$("#messageBoxOpen").click();
}

function closeMessageBox() {
	$("#messageBoxClose").click();
}

function geoSearch() {
	function success(pos) {
		// closeMessageBox();
		openMessageBox("位置情報の取得に成功しました。", "info");

		var lat = pos.coords.latitude,
			lon = pos.coords.longitude,
			acc = $("#placeAccuracy").val();

		$("#placeLatLon").val(lat.toFixed(acc) + "," + lon.toFixed(acc));
	};

	function error() {
		// closeMessageBox();
		openMessageBox("位置情報の取得に失敗しました。ブラウザの位置情報取得が許可されているか確認してください。", "warn");
	};

	// openMessageBox("位置情報を取得しています...", "info");

	navigator.geolocation.getCurrentPosition(success, error);
}

var mapInitialized = false,
	mapLat = undefined, mapLon = undefined;

function initializeMap(lat, lon, zoom) {
	var $mapElem = $("#mapContainer");

	$mapElem.tsmap({
		width: $mapElem.width(),
		height: ~~($(window).height() * 0.6),
		tss: [
			new GSIGoJpStdTilesSquare()
		],
		lon: lon,
		lat: lat,
		zoom: zoom,
		onCreate: function(mapid, ovlsid, popsid) {
			$mapElem.tsmap("select", "default");
		},
		onPointerSingle: function(ts, exy, lonlat) {
			var ovlsElem = $("#" + ts.ovlsid);
			ovlsElem.tsoverlays("removeOverlays");

			mapLat = lonlat.lat;
			mapLon = lonlat.lon;

			var content = mapLat.toFixed(5) + "," + mapLon.toFixed(5),
				$placeMarker = $("<div />").placemarker({
					mapid: $mapElem.attr("id"),
					content: content,
					lon: lonlat.lon,
					lat: lonlat.lat
				});
			ovlsElem.tsoverlays("mergeOverlays", [ $placeMarker ])
				.tsoverlays("plot", ts, true);
		}
	});

	mapInitialized = true;
}

function updateMap(lat, lon, zoom) {
	var $mapElem = $("#mapContainer"),
		ts = $mapElem.tsmap("option", "active"),
		$ovlsElem = $("#" + ts.ovlsid);

	ts.setCenter({
		zoom: zoom,
		lon: lon,
		lat: lat
	});
	ts.retrieve();
	ts.draw();
	$ovlsElem.tsoverlays("plot", ts, true);
}

function getLatLonAndClose() {
	var acc = $("#placeAccuracy").val();

	if(mapLat !== undefined && mapLon !== undefined) {
		$("#placeLatLon").val(mapLat.toFixed(acc) + "," + mapLon.toFixed(acc));
		updateForm();
	}
	$("#placeLatLonBox").modal("toggle");
}

var maxWeightedLength = 280;
var defaultWeight = 200;
var codePointRanges = [{"start":0,"end":4351,"weight":100},{"start":8192,"end":8205,"weight":100},{"start":8208,"end":8223,"weight":100},{"start":8242,"end":8247,"weight":100}];

// Twitter文字数簡易計算 URL、サロゲートペア考慮なし
function getMessageTwitterRatio(message) {
	var total = 0,
		normalized = (typeof String.prototype.normalize === "function") ? message.normalize() : message;

	for(var midx = 0; midx < normalized.length; midx++) {
		var weight = defaultWeight,
			ch = normalized.charAt(midx),
			chCodePoint = ch.charCodeAt(0);

		for(var ridx = 0; ridx < codePointRanges.length; ridx++) {
			var currRange = codePointRanges[ridx];
			if(chCodePoint >= currRange.start && chCodePoint <= currRange.end) {
				weight = currRange.weight;
				break;
			}
		}

		total += weight;
	}

	return Math.floor(total / maxWeightedLength);
}
