<?php
	function grabImage($url){
		$ch = curl_init ($url);
		curl_setopt($ch, CURLOPT_HEADER, 0);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
		curl_setopt($ch, CURLOPT_BINARYTRANSFER,1);
		curl_setopt($ch, CURLOPT_USERAGENT, 'TelegramBot (like TwitterBot)');
		curl_setopt($ch, CURLOPT_VERBOSE, 1);
		curl_setopt($ch, CURLOPT_HEADER, 1);
		$response=curl_exec($ch);
		curl_close ($ch);
		return explode("\r\n\r\n", $response, 2);
	}
	
	if(isset($_REQUEST['i']) && strlen(trim($_REQUEST['i'])) >= 5) {
		if(strpos($_SERVER['HTTP_USER_AGENT'], 'TelegramBot') !== false || strpos($_SERVER['HTTP_USER_AGENT'], 'Slack') !== false || $_REQUEST['tgtest']) {
			list($h, $b) = grabImage(sprintf('https://i.imgur.com/%s.jpg', trim($_REQUEST['i'])));
			preg_match_all('/Content-Type: (image\\/[a-z]+)/', $h, $m);
			$MIME = $m[1][0];
			preg_match_all('/Content-Length: (\\d+)/', $h, $m);
			$size = $m[1][0];
			
			header(sprintf("Content-Type: %s", $MIME)); 
			header(sprintf("Content-Length: %d" . $size));
			
			die($b);
			exit;
		}
		if(strpos($_SERVER['HTTP_USER_AGENT'], 'Twitterbot') !== false || $_REQUEST['twtest']): ?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:og="http://ogp.me/ns#" xmlns:fb="https://www.facebook.com/2008/fbml">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="twitter:card" content="summary_large_image">
		<meta name="twitter:title" content="What's on Imgur">
		<meta name="twitter:description" content="Explore the depths of the Imgur servers.">
		<meta name="twitter:image" content="https://i.imgur.com/<?= trim($_REQUEST['i']) ?>l.jpg">
		<title>What's on Imgur</title>
		<link rel="icon" sizes="16x16 32x32 64x64 128x128 256x256" href="woi.ico" type="image/x-icon">
	</head>
	<body>
	</body>
</html>
<?php 
			exit;
			endif; 
	}
	
	if(!isset($_REQUEST['i']) || (strlen(trim($_REQUEST['i'])) !== 5 && strlen(trim($_REQUEST['i'])) !== 7)) {
		if(strpos($_SERVER['HTTP_USER_AGENT'], 'Twitterbot') !== false || $_REQUEST['twtest']): ?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:og="http://ogp.me/ns#" xmlns:fb="https://www.facebook.com/2008/fbml">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="twitter:card" content="summary_large_image">
		<meta name="twitter:title" content="What's on Imgur">
		<meta name="twitter:description" content="Explore the depths of the Imgur servers.">
		<meta name="twitter:image" content="https://whatsonimgur.com/img/woi.png">
		<title>What's on Imgur</title>
		<link rel="icon" sizes="16x16 32x32 64x64 128x128 256x256" href="woi.ico" type="image/x-icon">
	</head>
	<body>
	</body>
</html>
<?php 
			exit;
			endif; 
	}
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="user-scalable=yes, initial-scale=1, maximum-scale=4, minimum-scale=1, width=device-width, height=device-height, target-densitydpi=device-dpi" />
		<title>What's on Imgur</title>
		<link rel="stylesheet" href="css/reset.css">
		<link rel="stylesheet" href="geomicons-squared/ss-geomicons-squared.css">
		<link rel="stylesheet" href="css/spinner.css">
		<link rel="stylesheet" href="css/app.css">
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=aljX6bJ08R">
		<link rel="icon" type="image/png" href="/favicon-32x32.png?v=aljX6bJ08R" sizes="32x32">
		<link rel="icon" type="image/png" href="/android-chrome-192x192.png?v=aljX6bJ08R" sizes="192x192">
		<link rel="icon" type="image/png" href="/favicon-16x16.png?v=aljX6bJ08R" sizes="16x16">
		<link rel="manifest" href="/manifest.json?v=aljX6b308C">
		<link rel="mask-icon" href="/safari-pinned-tab.svg?v=aljX6bJ08R" color="#85bf25">
		<link rel="shortcut icon" href="/favicon.ico?v=aljX6bJ08R">
		<meta name="description" content="Explore the depths of the Imgur servers and share what you find with your poor friends.">
		<meta name="apple-mobile-web-app-title" content="On Imgur">
		<meta name="application-name" content="What's on Imgur">
		<meta name="msapplication-TileColor" content="#85bf25">
		<meta name="msapplication-TileImage" content="/mstile-144x144.png?v=aljX6bJ08R">
		<meta name="theme-color" content="#191920">
		<script src="js/jquery.1.12.4.min.js"></script>
		<script src="geomicons-squared/ss-geomicons-squared.js"></script>
		<script src="js/mobile-detect.js"></script>
		<script src="js/clipboard.min.js"></script>
		<script src="js/app.js"></script>
	</head>
	<body>
		<div class="wrapper full-height">
			<header id="header">
				<div class="w-content">
					<div class="title float-l">
						<div class="icon float-l"></div>
						<div class="text float-l"></div>
						<div class="clear-b"></div>
					</div>
					<div class="buttons float-r">
						<button id="favorites-btn" class="ss-icon ss-grid" title="View favorites"></button>
						<button id="settings-btn" class="ss-icon ss-settings" title="Settings"></button>
						<button id="fullscreen-btn" class="ss-icon ss-expand" title="Fullscreen"></button>
					</div>
					<div class="clear-b"></div>
				</div>
			</header>
			<button id="contract-btn" class="ss-icon ss-contract"></button>
			<div class="main no-select full-height"></div>
			<footer id="footer">
				<div id="footer-desktop" class="footer-wrap">
					<div class="button-wrap"><button for="left" class="ss-icon ss-left" title="Previous image"></button></div>
					<div class="button-wrap"><button for="remove" class="ss-icon ss-trash" title="Remove from history"></button></div>
					<div class="button-wrap"><button for="copy" class="ss-icon ss-share green larger" title="Copy link"></button></div>
					<div class="button-wrap"><button for="favorite" class="ss-icon ss-star" title="Add to favorites"></button></div>
					<div class="button-wrap"><button for="right" class="ss-icon ss-right" title="Next image"></button></div>
					<div class="clear-b"></div>
				</div>
				<div id="footer-mobile" class="footer-wrap">
					<div class="button-wrap"><button for="remove" class="ss-icon ss-trash"></button></div>
					<div class="button-wrap"><button for="copy" class="ss-icon ss-share green larger"></button></div>
					<div class="button-wrap"><button for="favorite" class="ss-icon ss-star"></button></div>
					<div class="clear-b"></div>
				</div>
			</footer>
		</div>
		<script type="application/ld+json">
		{
		  "@context": "http://schema.org/",
		  "@type": "WebSite",
		  "copyrightYear": 2017,
		  "description": "Explore the depths of the Imgur servers and share what you find with your poor friends.",
		  "isAccessibleForFree": true,
		  "name": "What's on Imgur",
		  "url": "https://whatsonimgur.com/",
		  "publisher": {
		    "@context": "http://schema.org/",
		    "@type": "Person",
		    "name": "William Thomas"
		  }
		}
		</script>
		<?php /*<script>
			(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
			(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
			m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
			})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
			ga('create', 'UA-39294961-6', 'auto');
			ga('send', 'pageview');
		</script> */
		?>
	</body>
</html>
