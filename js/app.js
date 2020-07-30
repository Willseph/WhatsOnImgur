// Consts
var CharPool = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
var CreatorUrl = 'https://github.com/willseph/whatsonimgur';
var Host = 'https://whatsonimgur.com';
var IsiOS = window.isiOS();
var IsMobile = window.mobileAndTabletCheck();
var IsSafari = window.isSafari();
var LoadingTimeoutMS = 5000;
var RemovedHeight = 81;
var RemovedWidth = 161
var StatisticsWriteTimeMS = 5000;
var SwipeTolerance = 3;
var ValidIdRegex = /^(([a-zA-Z0-9]{5})|([a-zA-Z0-9]{7}))$/;

var KeycodeFunctions = {
	k27: closePopup,
	k32: imgTapped,
	k37: swipedRight,
	k39: swipedLeft,
	k65: swipedRight,
	k67: copyCurrent,
	k68: swipedLeft,
	k70: toggleFavorite,
	k86: openFavorites
}

// Storage keys
var StorageKeyAttemptMode = 'woi_attemptmode';
var StorageKeyFavorites = 'woi_favorites';
var StorageKeyFullscreen = 'woi_fullscreen';
var StorageKeyHistory = 'woi_history_v4';
var StorageKeyReturning = 'woi_returning';
var StorageKeyStats = 'woi_stats';

// Elements
var $attemptText;
var $body;
var $currentImgHolder;
var $footer;
var $header;
var $loading;
var $main;
var $popup;
var $welcomeHolder;
var $wrapper;

var $btnCopyLink;
var $btnFavorite;
var $btnFullscreenEnable;
var $btnFullscreenDisable;
var $btnLeft;
var $btnRemove;
var $btnRight;
var $btnSettings;
var $btnopenFavorites;

// Fields
var attemptMode;
var clipboard;
var currentIndex = 0;
var currentLoadingId = null;
var firstImage = true;
var isLookingForRandom = false;
var isSearching = false;
var isWelcoming = false;
var loadingTimeout;
var mc;
var popupShowing = false;
var returningVisitor;
var statistics;
var statisticsRefreshInterval;
var storedFavorites = [];
var storedHistory = [];
var xDown = null;

// Methods
function init() {
	$body = jQuery('body');
	$wrapper = jQuery('.wrapper').first();
	$main = jQuery('.main').first();
	
	$footer = jQuery('footer').first();
	$header = jQuery('header').first();
	
	$loading = createSpinner();
	$main.append($loading);
	
	$attemptText = jQuery('<div class="attempt-text no-select"></div>');
	$loading.append($attemptText);
	
	attemptMode = localStorage.getObj(StorageKeyAttemptMode);
	if(!attemptMode || !(/^(5)|(7)|(57)$/).test(attemptMode)) {
		attemptMode = '5';
		localStorage.setObj(StorageKeyAttemptMode, '5');
	}
	
	returningVisitor = !!localStorage.getObj(StorageKeyReturning);
	
	statistics = localStorage.getObj(StorageKeyStats);
	if(!statistics) {
		statistics = {attempts:0, taps:0};
		storeStatistics();
	}
	statisticsRefreshInterval = setInterval(storeStatistics, StatisticsWriteTimeMS);
	
	storedFavorites = localStorage.getObj(StorageKeyFavorites);
	if(!storedFavorites || !Array.isArray(storedFavorites))
		storedFavorites = [];
	
	storedHistory = localStorage.getObj(StorageKeyHistory);
	if(!storedHistory || !Array.isArray(storedHistory))
		storedHistory = [];
	
	currentIndex = storedHistory.length;
	if(currentIndex < 0) currentIndex = 0;
	
	document.body.onkeyup = function(e) {
		if(popupShowing && e.keyCode!==27) return;
		if(!e || !e.keyCode) return;
		var key = 'k'+e.keyCode;
		
		if(KeycodeFunctions[key])
			KeycodeFunctions[key]();
	}
	
	// Mobile gesture detectors
	if(IsMobile) {
		document.addEventListener('touchstart', handleTouchStart, false);        
		document.addEventListener('touchmove', handleTouchMove, false);
		
		if(IsiOS) 
			$main.removeClass('no-select');
	} else 
		$main.css('cursor','pointer');
		
	$main.click(imgTapped);
	
	$btnopenFavorites = jQuery('#favorites-btn').first();
	$btnopenFavorites.click(openFavorites);
	
	$btnSettings = jQuery('#settings-btn').first();
	$btnSettings.click(openSettings);
	
	$btnFullscreenEnable = jQuery('#fullscreen-btn');
	$btnFullscreenEnable.click(enableFullscreen);
	
	$btnFullscreenDisable = jQuery('#contract-btn');
	$btnFullscreenDisable.hide();
	
	var fullscreenValue = localStorage.getObj(StorageKeyFullscreen);
	if(fullscreenValue === true)
		enableFullscreen();
	
	var iParam = getQueryParam('i');
	if(ValidIdRegex.test(iParam)) {
		launchWithId(iParam);
		//ga('send', 'event', 'interaction', 'loaded_img');
	} else {
		$welcomeHolder = createWelcomeHolder();
		$main.append($welcomeHolder);
		isWelcoming = true;
		//ga('send', 'event', 'interaction', 'loaded_home');
	}
	$currentImgHolder = jQuery('.img-holder').first();
	
	if(iParam === 'favorites')
		openFavorites();
	if(iParam === 'settings')
		openSettings();
	
	if(IsMobile) 
		jQuery('#footer-desktop').remove();
	else
		jQuery('#footer-mobile').remove();
	
	$btnLeft = jQuery('button[for="left"]');
	$btnRemove = jQuery('button[for="remove"]');
	$btnCopyLink = jQuery('button[for="copy"]');
	$btnFavorite = jQuery('button[for="favorite"]');
	$btnRight = jQuery('button[for="right"]');
	updateButtons();
	
	if(!IsMobile) {
		$btnLeft.click(swipedRight);
		$btnRight.click(swipedLeft);
	}
	
	$btnRemove.click(promptRemove);
	
	clipboard = new Clipboard('button[for="copy"]');
	clipboard.on('success', function(e) {
		createTooltip('Link copied', 'tooltip-copied', $btnCopyLink);
	});
	
	clipboard.on('error', openAlternativeCopyPopup);
	
	$btnFavorite.click(toggleFavorite);
}

function addFavorite(item) {
	storedFavorites.push(item);
	localStorage.setObj(StorageKeyFavorites, storedFavorites);
}

function addImage(id, imgElement, $newHolder, delay) {
	setTimeout(function() {
		if($currentImgHolder && $currentImgHolder[0] !== $newHolder[0])
			$currentImgHolder.remove();
		$currentImgHolder = $newHolder;
		$currentImgHolder.addClass('clickable');
		
		var $img = jQuery(imgElement);
		$img.hide();
		$currentImgHolder.append($img);
		$img.fadeIn(200);
		isSearching = false;
		$btnCopyLink.attr('data-clipboard-text', generatePermalink(id));
		updateButtons();
	}, delay);
	
	history.replaceState(null, null, '?i='+id);
}

function attemptModeCheckboxClicked() {
	var $checkbox = jQuery(this);
	var newState = !$checkbox[0].hasAttribute('checked');
	
	if(!newState) {
		var numberOfCheckedBoxes = 0;
		$checkbox.parent().find('li[checked]').each(function() {
			numberOfCheckedBoxes++;
		});
		if(numberOfCheckedBoxes < 2)
			return;
	}
	
	if(newState)
		$checkbox.attr('checked','checked');
	else
		$checkbox.removeAttr('checked');
	
	attemptMode = '';
	$checkbox.parent().find('li[checked]').each(function() {
		attemptMode = attemptMode+jQuery(this).attr('for');
	});
	if(attemptMode === '75')
		attemptMode = '57';
	
	if(attemptMode !== '5' && attemptMode !== '57' && attemptMode !== '7')
		attemptMode='5';
	
	localStorage.setObj(StorageKeyAttemptMode, attemptMode);
};

function buildImageUrl(id, ext) {
	if(!ext) ext = 'gif';
	return 'https://i.imgur.com/'+id+'.'+ext;
}

function closePopup(callback) {
	if(!$popup) return;
	$popup.fadeOut(100,function() {
		$popup.remove();
		$popup = null;
		popupShowing = false;
		if(isFunction(callback))
			callback();
	});
}

function copyCurrent() {
	if(popupShowing) return;
	if(isWelcoming) return;
	if(isSearching) return;
}

function createImgElement(id, ext) {
	if(!ext) ext = 'gif';
	var img = new Image();
	if(IsMobile)
		img.setAttribute('draggable', 'false');
	var url = buildImageUrl(id, ext);
	img.src = url;
	return img;
}

function createSpinner() {
	var $spinner = jQuery('<div class="loader" style="display:none;"><svg class="circular" viewBox="25 25 50 50"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="0.25" stroke-miterlimit="10"/></svg></div>');
	return $spinner;
}

function createTooltip(text, customClass, $centerOn) {
	if(!text) return false;
	if(!$centerOn) return false;
	
	var centerX = $centerOn.offset().left + $centerOn.width() / 2.0;
	var centerY = $centerOn.offset().top + $centerOn.height() / 2.0;
	
	var $tooltip = jQuery('<div class="tooltip"><p>'+text+'</p><div class="tail"></div></div>');
	if(customClass)
		$tooltip.addClass(customClass);
	
	$tooltip.hide();
	$body.append($tooltip);
	
	var tooltipX = centerX - $tooltip.width() / 2.0;
	var tooltipY = centerY - $tooltip.height() - 12;
	$tooltip.css({left:tooltipX, top:tooltipY});
	
	$tooltip.fadeIn(200).delay(1000).fadeOut(200, function() { jQuery(this).remove(); });
}

function createWelcomeHolder() {
	var $welcomeHolder = jQuery('<div class="img-holder welcome clickable no-select"><div class="welcome-image"><div class="welcome-text">'+((IsMobile ? "Tap" : "Click")+" here to see<br/>What's on Imgur")+'</div></div></div>');
	if(IsMobile && IsiOS)
		$welcomeHolder.addClass('compressed-text');
	return $welcomeHolder;
}

function disableFullscreen() {
	localStorage.setObj(StorageKeyFullscreen, false);
	$btnFullscreenDisable.hide();
	$btnFullscreenDisable.off('click');
	$header.removeClass('fullscreen');
	$footer.removeClass('fullscreen');
	$main.removeClass('fullscreen');
}

function enableFullscreen() {
	localStorage.setObj(StorageKeyFullscreen, true);
	$btnFullscreenDisable.show();
	$btnFullscreenDisable.click(disableFullscreen);
	$header.addClass('fullscreen');
	$footer.addClass('fullscreen');
	$main.addClass('fullscreen');
}

function favoriteGridItemClicked() {
	var $item = jQuery(this);
	isSearching = false;
	$loading.fadeOut(200);
	
	closePopup(function() {
		launchWithId($item.attr('data-id'));
		isWelcoming = false;
		updateButtons();
	});
}

function findNextValidId(on404Callback, onFoundCallback, onError) {
	if(!isSearching)
		return;
		
	var idLength = getAttemptIdLength();
	var id = generateId(idLength);
	isValidImage(id, function(is404, imgElement) {
		if(is404) {
			on404Callback(id);
			findNextValidId(on404Callback, onFoundCallback, onError);
		} else {
			onFoundCallback(id, imgElement);
		}
	});
}

function generateId(length) {
	var result = '';
    for (var i = length; i > 0; --i) result += CharPool[Math.floor(Math.random() * CharPool.length)];
    return result;
}

function generatePermalink(id) {
	return Host+'/?i='+id;
}

function getAttemptIdLength() {
	if(!attemptMode) return 5;
	switch(attemptMode) {
		case '5':
			return 5;
		case '7':
			return 7;
		case '57':
			return Math.random() >= 0.5 ? 5 : 7;
	}
	return 5;
}

function getFavoritedIndex(id) {
	if(!id) return -1;
	if(!storedFavorites) return -1;
	
	for(var k=0; k<storedFavorites.length; k++) {
		if(storedFavorites[k].i === id)
			return k;
	}
	return -1;
}

function getQueryParam(name) {
	url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// Callback: trueImageUrl, ext, id, imgElement, postLoadCallback, imageLoaded
function getTrueImageUrl(id, imgElement, postLoadCallback, imageLoaded, callback) {
	var attemptUrl = buildImageUrl(id, 'gif');
	
	jQuery.ajax({
		type: "GET",
		url: attemptUrl,
		success: function(response, status, xhr){ 
			var ct = xhr.getResponseHeader("content-type") || "";
			var ext = 'gif';
			switch(ct) {
				case 'image/jpeg':
					ext = 'jpg';
					break;
				case 'image/jpg':
					ext = 'jpg';
					break;
				case 'image/png':
					ext = 'png';
					break;
				case 'image/bmp':
					ext = 'bmp';
					break;
				case 'image/gif':
					ext = 'gif';
					break;
			}
			
			var trueUrl = buildImageUrl(id, ext);
			callback(trueUrl, ext, id, imgElement, postLoadCallback, imageLoaded);
		}
	});
}

function handleTouchStart(evt) {
	if (isSearching) return;
	xDown = evt.touches[0].clientX;
}

function handleTouchMove(evt) {
	if (!xDown) return;
	if (isSearching) return;

	var xUp = evt.touches[0].clientX;
	var xDiff = xDown - xUp;

	if (xDiff > SwipeTolerance)
		swipedLeft();
	else if(xDiff < -SwipeTolerance)
		swipedRight();

	xDown = null;
}

function imageFound(id, imgElement, $newHolder) {
	addImage(id, imgElement, $newHolder, 0);
}

function imageLoaded(e) {
	this.removeEventListener("load", imageLoaded);
	invalid = false;
	currentLoadingId = null;
		
	if(this.naturalWidth==RemovedWidth && this.naturalHeight==RemovedHeight) invalid = true;
	if(this.naturalWidth<3 || this.naturalHeight<3) invalid = true;
	
	this.callback(invalid, this);
}

function imgTapped(id) {
	if(isSearching) return;
	if(popupShowing) return;
	
	if(!returningVisitor && (!id || typeof id !== 'string')) {
		showWarningDialog();
		return;
	}
	
	isWelcoming = false;
	var $newImgHolder = pushNewImageHolder('slide-out-to-left', 'slide-in-from-right');
	
	$loading.fadeIn(100);
	$attemptText.text('');
	$attemptText.fadeIn(100);
	
	var postLoadCallback = function(is404, imgElement) {
		$loading.fadeOut(200, function(){jQuery(this).hide();});
		$attemptText.fadeOut(200, function(){jQuery(this).hide();});
		pushToHistory(imgElement.imageId, imgElement.ext); 
		currentIndex = storedHistory.length-1;
		imageFound(imgElement.imageId, imgElement, $newImgHolder);
	};
	
	var onFoundRealImage = function(id, imgElement, postLoadCallback) {
		//if(isLookingForRandom)
			//ga('send', 'event', 'interaction', 'found', id.length);
		isLookingForRandom = false;
		imgElement.imageId = id;
		getTrueImageUrl(id, imgElement, postLoadCallback, imageLoaded, function(trueImageUrl, ext, id, imgElement, postLoadCallback, imageLoaded) {
			imgElement.ext = ext;
				
			if(imgElement.src === trueImageUrl) 
				postLoadCallback(false, imgElement);
			
			else {
				imgElement.callback = postLoadCallback;
				lastImgCallback = postLoadCallback;
				imgElement.addEventListener("load", imageLoaded);
				imgElement.src = trueImageUrl;
			}
		});
	};
	
	var updateSpinnerText = function(id) {
		if($attemptText)
			$attemptText.fadeOut(50, function(){
				jQuery(this).text(id).fadeIn(50);
			});
	};
	
	if(!!id && ValidIdRegex.test(id)) {
		isValidImage(id, function(is404, imgElement) {
			if(is404)
				window.location.href = Host;
			else {
				updateSpinnerText(id);
				onFoundRealImage(id, imgElement, postLoadCallback);
			}
		});
	} else {
		statistics.taps++;
		//ga('send', 'event', 'interaction', 'tap');
		isLookingForRandom = true;
		findNextValidId(
			function(id) {
				updateSpinnerText(id);
			},
			function(id, imgElement) {
				updateSpinnerText(id);
				onFoundRealImage(id, imgElement, postLoadCallback);
			}
		);
	}
}

function isFavorited(id) {
	return getFavoritedIndex(id) > -1;
}

function isFunction(functionToCheck) {
	var getType = {};
	return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

function isValidImage(id, callback){
	statistics.attempts++;
	var img = createImgElement(id);
	currentLoadingId = id;
	img.callback = callback;
	lastImgCallback = callback;
	img.addEventListener("load", imageLoaded);
	
	if(loadingTimeout)
		clearTimeout(loadingTimeout);
	
	loadingTimeout = setTimeout(function() {
		if(id === currentLoadingId) {
			// Image is stuck
			if(img)
				img.removeEventListener("load", imageLoaded);
			img = null;
			console.log('Image '+currentLoadingId+' taking too long. Skipping...');
			callback(true);
		}
	}, LoadingTimeoutMS);
}

function isZoomed() {
	var ratio = document.body.clientWidth / window.innerWidth
	return ratio < 0.98 || ratio > 1.02;
}

function launchWithId(id) {
	// Search history
	var index = -1;
	for(var i=0; i<storedHistory.length; i++) {
		if(storedHistory[i] && storedHistory[i].i && storedHistory[i].i === id) {
			index = i;
			break;
		}
	}
	
	if(index > -1) {
		currentIndex = index;
		var item = storedHistory[index];
		var imgElement = createImgElement(item.i, item.e);
		var $newImgHolder = pushNewImageHolder();
		addImage(id, imgElement, $newImgHolder, 0);
	} else {
		imgTapped(id);
	}
}

function openAlternativeCopyPopup(e) {
	if(popupShowing) return;
	if(isSearching) return;
	
	var $content = jQuery('<div id="alternative-copy"></div>');
	$content.append('<h1>Permalink</h1>');
	
	var $input = jQuery('<input type="text"/>');
	var id = storedHistory[currentIndex].i;
	$input.val(generatePermalink(id));
	$content.append($input);
	
	popup('', $content);
	
	$input[0].setSelectionRange(0, 9999);
}

function openFavorites() {
	if(popupShowing) return;
	
	if(!storedFavorites || storedFavorites.length < 1) {
		showNoFavoritesPopup();
		return;
	}
	
	var $content = jQuery('<div id="favorites-grid"></div>');
	var $favoritesUl = jQuery('<ul></ul>');
	$content.append($favoritesUl);
	
	popup('', $content);
	
	var gridWidth = Math.floor($favoritesUl.width()) - 30;
	var maximumSizeForItem = 120;
	var itemsPerRow = 1;
	var itemWidth = gridWidth/itemsPerRow;
	var cellMargin = 4;
	
	if(gridWidth > 1) {
		while(itemWidth > maximumSizeForItem && storedFavorites.length > itemsPerRow) {
			itemsPerRow++;
			itemWidth = Math.floor(gridWidth/itemsPerRow);
		}
	}
	itemWidth -= cellMargin*2;
	
	for(var i=0; i<storedFavorites.length; i++) {
		var item = storedFavorites[storedFavorites.length-i-1];
		var $li = jQuery('<li data-id="'+item.i+'" data-ext="'+item.e+'"></li>');
		var url = 'https://i.imgur.com/'+item.i+'b.jpg';
		var $thumb = jQuery('<img src="'+url+'" alt=""/>');
		$li.append($thumb);
		$li.css({height: itemWidth, width: itemWidth});
		$li.click(favoriteGridItemClicked);
		$favoritesUl.append($li);
	}
	
	$content.parent().css('height','80%');
	$content.css('width','auto');
	$favoritesUl.css({width: (itemWidth+cellMargin*2)*itemsPerRow});
	
	var numRows = Math.ceil(storedFavorites.length/itemsPerRow);
	var requiredHeight = numRows*(itemWidth+cellMargin*2);
	
	if($content.height() > requiredHeight) 
		$content.parent().css({height: requiredHeight});
}

function openSettings() {
	if(popupShowing) return;
	
	var $content = jQuery('<div id="settings"></div>');
	$content.append('<h1>Settings</h1>');	
	
	// Attempt modes
	var $attemptModes = jQuery('<div class="settings-row" for="attempt-modes"></div>');
	$attemptModes.append('<div class="label float-l">Attempt modes</div>');
	var $checkboxList = jQuery('<ul class="checkbox-list float-r"></ul>');
	
	var createCheckboxLi = function(num) {
		num = ''+num;
		var $box = jQuery('<li class="float-l no-select" for="'+num+'"><div class="checkbox float-l"><div class="ss-icon ss-check"></div></div><div class="label float-r">'+num+' Digits</div><div class="clear-b"></div></li>');
		if(attemptMode.indexOf(num) > -1)
			$box.attr('checked','1');
		return $box;
	};
	
	var $box5 = createCheckboxLi('5');
	var $box7 = createCheckboxLi('7');
	
	$box5.click(attemptModeCheckboxClicked);
	$box7.click(attemptModeCheckboxClicked);
		
	$checkboxList.append($box5);
	$checkboxList.append($box7);
	$checkboxList.append('<div class="clear-b"></div>');
	$attemptModes.append($checkboxList);
	$attemptModes.append('<div class="clear-b"></div>');
	
	$content.append($attemptModes);
	
	// Created by
	$content.append('<h1>Created by</h1>');	
	var $credits = jQuery('<div class="creator"></div>');
	$credits.append('<img class="photo float-l" src="img/me.jpg" width="64" height="64" alt=""/>');
	$credits.append('<div class="info float-r"><div class="name">William Thomas</div><div class="url"><a target="_blank" href="'+CreatorUrl+'">GitHub</a></div></div>');
	$credits.append('<div class="clear-b"></div>');
	$content.append($credits);
	
	// Delete history
	var $deleteHistory = jQuery('<div class="settings-row" for="clear-history"></div>');
	var $deleteButton = jQuery('<button class="full-width red">Wipe All Data</button>');
	$deleteHistory.append($deleteButton);
	$content.append($deleteHistory);
	$deleteButton.click(promptWipeAllData);
	
	popup('', $content);
}

function popup(contentClass, $content) {
	var createFunc = function () {
		$popup = jQuery('<div class="popup full-height"></div>');
		$popup.hide();
		
		var $popupContent = jQuery('<div class="content"></div>');
		if(contentClass)
			$popupContent.addClass(contentClass);
		if($content)
			$popupContent.append($content);
		$popup.append($popupContent);
		
		$popup.click(closePopup);
		$popupContent.click(function(e) { e.stopPropagation(); });
		
		$wrapper.append($popup);
		$popup.fadeIn(200);
		
		popupShowing = true;
	};
	
	if(popupShowing) 
		closePopup(createFunc);
	else
		createFunc();
}

function promptRemove() {
	if(isSearching) return;
	if(isWelcoming) return;
	if(!storedHistory) return;
	if(storedHistory.length < 1) return;
	
	var $content = jQuery('<div id="remove-prompt"></div>');
	$content.append('<h1>Remove Image</h1>');
	var confirmMessage = '<p>Are you sure you want to remove this image from your history?</p>';
	if(isFavorited(storedHistory[currentIndex].i))
		confirmMessage += '<p>It will also be removed from your favorites.</p>';
	$content.append(confirmMessage);
	
	var $buttonWrap = jQuery('<div class="button-wrap"><div class="clear-b"></div></div>');
	var $cancelButton = jQuery('<button class="cancel float-l">Cancel</button>');
	var $confirmButton = jQuery('<button class="confirm float-r">Remove</button>');
	
	$buttonWrap.prepend($confirmButton);
	$buttonWrap.prepend($cancelButton);
	
	$cancelButton.click(closePopup);
	$confirmButton.click(function() {
		closePopup(function() {
			removeCurrentImageFromHistory();
			createTooltip('Image removed', 'tooltip-removed', $btnRemove);
		});
	});
	
	$content.append($buttonWrap);
	
	popup('red', $content);
}

function promptWipeAllData() {
	var $content = jQuery('<div id="remove-prompt"></div>');
	$content.append('<h1>Wipe All Data</h1>');
	var confirmMessage = '<p>Are you sure you want to erase all of your <strong>What\'s on Imgur</strong> data?</p><p>This will remove your image history, favorites, and settings.</p>';
	$content.append(confirmMessage);
	
	var $buttonWrap = jQuery('<div class="button-wrap"><div class="clear-b"></div></div>');
	var $cancelButton = jQuery('<button class="cancel float-l">Cancel</button>');
	var $confirmButton = jQuery('<button class="confirm float-r">Wipe Data</button>');
	
	$buttonWrap.prepend($confirmButton);
	$buttonWrap.prepend($cancelButton);
	
	$cancelButton.click(closePopup);
	$confirmButton.click(wipeDataAndRefresh);
	
	$content.append($buttonWrap);
	
	popup('red', $content);
}

function pushNewImageHolder(currentImgHolderClass, newImageHolderClass) {
	isSearching = true;
	updateButtons();
	
	if($currentImgHolder) {
		$currentImgHolder.removeClass('slide-in-from-left');
		$currentImgHolder.removeClass('slide-in-from-right');
		$currentImgHolder.removeClass('clickable');
		if(currentImgHolderClass)
			$currentImgHolder.addClass(currentImgHolderClass);
	}
	
	if(!newImageHolderClass) newImageHolderClass = '';
	var $newImgHolder = jQuery('<div class="img-holder '+newImageHolderClass+'"></div>');
	$main.append($newImgHolder);
	return $newImgHolder;
}

function pushToHistory(id, ext) {
	storedHistory.push({i:id, e:ext});
	localStorage.setObj(StorageKeyHistory, storedHistory);
}

function removeCurrentImageFromHistory() {
	var current = storedHistory[currentIndex];
	if(!current) return;
	
	var isFavorite = isFavorited(current.i);
	if(isFavorite)
		removeFavorite(current.i);
		
	var indexToRemove = currentIndex;
	if(currentIndex > 0)
		swipedRight();
	else if(currentIndex <= 0 && storedHistory.length > 1) {
		swipedLeft();
		currentIndex--;
	} else {
		var showWelcome = function() {
			$welcomeHolder = createWelcomeHolder();
			$currentImgHolder = $welcomeHolder;
			$main.append($welcomeHolder);
			isWelcoming = true;
			history.replaceState(null, null, '?i=');
			updateButtons();
		};
		if($currentImgHolder)
			$currentImgHolder.fadeOut(200, function() {
				$currentImgHolder.remove();
				showWelcome();
			})
		else
			showWelcome();
		
	}
	
	storedHistory.splice(indexToRemove, 1);
	localStorage.setObj(StorageKeyHistory, storedHistory);
	
	updateButtons();
	//ga('send', 'event', 'interaction', 'removed');
}

function removeFavorite(id) {
	var index = getFavoritedIndex(id);
	if(index < 0) return;
	
	storedFavorites.splice(index, 1);
	localStorage.setObj(StorageKeyFavorites, storedFavorites);
}

function setButtonState($button, enabled) {
	if(!$button) return;
	if(enabled)
		$button.removeAttr('disabled');
	else
		$button.attr('disabled', 'disabled');
}

function showNoFavoritesPopup() {
	if(popupShowing) return;
	
	var $content = jQuery('<div id="no-favorites-prompt"></div>');
	var confirmMessage = "<p>No favorite images to display</p>";
	$content.append(confirmMessage);
	
	popup('', $content);
}

function showWarningDialog() {
	if(popupShowing) return;
	
	var $content = jQuery('<div id="warning-prompt"></div>');
	$content.append('<h1>Warning</h1>');
	var confirmMessage = "<p><strong>What's on Imgur</strong> loads random images from the Internet, with no filter. Some of the images you'll see may be offensive or pornographic in nature.</p><p>To continue, you must agree that you have read and understand this warning, that you are at least 18 years of age, and that you are continuing at your own risk.</p>";
	$content.append(confirmMessage);
	
	var $buttonWrap = jQuery('<div class="button-wrap"><div class="clear-b"></div></div>');
	var $cancelButton = jQuery('<button class="cancel float-l">Cancel</button>');
	var $confirmButton = jQuery('<button class="confirm float-r">I Agree</button>');
	
	$buttonWrap.prepend($confirmButton);
	$buttonWrap.prepend($cancelButton);
	
	$cancelButton.click(closePopup);
	$confirmButton.click(function() {
		closePopup(function() {
			returningVisitor = true;
			localStorage.setObj(StorageKeyReturning, true);
			imgTapped();
		});
	});
	
	$content.append($buttonWrap);
	
	popup('green', $content);
}

function swipedLeft(e) {
	if(isZoomed()) return;
	if(isSearching) return;
	if(popupShowing) return;
	if(currentIndex >= storedHistory.length-1) return;
	currentIndex++;
	isSearching = true;
	isWelcoming = false;
	updateButtons();
	
	var item = storedHistory[currentIndex];
	var imgElement = createImgElement(item.i, item.e);
	var $newImgHolder = pushNewImageHolder('slide-out-to-left', 'slide-in-from-right');
	addImage(item.i, imgElement, $newImgHolder, 200);
}

function storeStatistics() {
	if(!statistics) return;
	localStorage.setObj(StorageKeyStats, statistics);
}

function swipedRight(e) {
	if(isZoomed()) return;
	if(isSearching) return;
	if(popupShowing) return;
	if(currentIndex <= 0) return;
	currentIndex--;
	if(currentIndex >= storedHistory.length) return;
	isSearching = true;
	isWelcoming = false;
	updateButtons();
	
	var item = storedHistory[currentIndex];
	var imgElement = createImgElement(item.i, item.e);
	var $newImgHolder = pushNewImageHolder('slide-out-to-right', 'slide-in-from-left');
	addImage(item.i, imgElement, $newImgHolder, 200);
}

function toggleFavorite() {
	if(isSearching) return;
	if(isWelcoming) return;
	if(!storedHistory) return;
	if(storedHistory.length < 1) return;
	
	var current = storedHistory[currentIndex];
	if(!current) return;
	
	var isFavorite = isFavorited(current.i);
	if(isFavorite) {
		// Unfavoriting
		createTooltip('Removed from favorites', 'tooltip-favorite', $btnFavorite);
		removeFavorite(current.i);
		//ga('send', 'event', 'interaction', 'unfavorite');
	} else {
		// Favoriting
		createTooltip('Added to favorites', 'tooltip-favorite', $btnFavorite);
		addFavorite(current);
		//ga('send', 'event', 'interaction', 'favorite');
	}
	
	updateButtons();
}

function updateButtons() {
	if(!$btnCopyLink) return;
	
	setButtonState($btnLeft, !isSearching && currentIndex > 0);
	setButtonState($btnRemove, !isSearching && !isWelcoming);
	setButtonState($btnCopyLink, !isSearching && !isWelcoming);
	setButtonState($btnFavorite, !isSearching && !isWelcoming);
	setButtonState($btnRight, !isSearching && currentIndex < storedHistory.length-1);
	
	if(!isWelcoming && !isSearching && currentIndex > -1 && storedHistory.length > currentIndex) {
		if(isFavorited(storedHistory[currentIndex].i)) 
			$btnFavorite.addClass('gold');
		else
			$btnFavorite.removeClass('gold');
	}
}

function wipeDataAndRefresh() {
	localStorage.clear();
	window.location.href = Host;
}

Storage.prototype.setObj = function(key, obj) {
    return this.setItem(key, JSON.stringify(obj))
}
Storage.prototype.getObj = function(key) {
    return JSON.parse(this.getItem(key))
}

jQuery(document).ready(init);
