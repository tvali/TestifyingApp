

var _cart_booster$ = jQuery.noConflict(true);

//debugging with console.log
CB_DEBUG = false;

try {
  CB_DEBUG = {{site.debug}};
}
catch(err) {
    CB_DEBUG = false;;
}

!CB_DEBUG || console.log("Debug:true");

var _cart_booster_isMobile = false; //initiate as false
// device detection
if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) _cart_booster_isMobile = true;

var _cart_booster = {
	site: '{{&site.hash}}',
	$:  _cart_booster$,
	kv: false,
	popup_status: false,
	fh: [],
	fopt: {{&mask_fields}},
	acttime: 0,
	func_cart_total: function() {
		var $ = _cart_booster.$
		var $cart_total = false;
		try {
			{{&site.function_cart_total}}
		} catch (e) {

		}
		return $cart_total;
	},
	func_cart_products: function() {
		var $ = _cart_booster.$

		{{&site.function_cart_products}}
	},
	wcm: function(string, pattern) {
		if (pattern.indexOf('*') > 0) {
			// wcm
			pattern = pattern.replace('*','(.*)')
			pattern = pattern.replace('?','\\?')
			return string.search(pattern) == 0;
		} else {
			// rm
			return string == pattern;
		}
	},

	page_confirmation: false,
	fp: {{&confirmation_pages}},
	ff: function() {
		var url = location.href

		if (url.substr(0,7) == 'http://')
			url = url.substr(7)

		if (url.substr(0,8) == 'https://')
			url = url.substr(8)

		if (url.substr(0,4) == 'www.')
			url = url.substr(4)

		for(var $i in this.fp) {
			if (this.fp.hasOwnProperty($i)) {
				if (this.wcm(url, this.fp[$i])) {
					this.page_confirmation = true
				}
			}
		}
		if (this.ffx() !== null) {
			this.page_confirmation = false
			this.fi = setInterval(function() {
				if (_cart_booster.ffx()) {
					clearInterval(_cart_booster.fi)
					_cart_booster.$.getJSON('//t.keptify.com/cf/finish.php?r=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&callback=?', function(){})
					_cart_booster.setCookie('cart-booster',_cart_booster.uuid(), {{&site.cookie_days}} )
					_cart_booster.sid = _cart_booster.getCookie('cart-booster')
					if (_cart_booster.hasls())
						localStorage.setItem("keptify-active-time", 0 )
				}
			},2500)
		} else {

		}
	},
	ffx: function() {
		var $ = _cart_booster.$
		var $ret = false;
		try {
			{{&function_finish}}
		} catch(e) {
		}
		return $ret
	},
	MD5: function(a){function b(a,b){return a<<b|a>>>32-b}function c(a,b){var c,d,e,f,g;return e=2147483648&a,f=2147483648&b,c=1073741824&a,d=1073741824&b,g=(1073741823&a)+(1073741823&b),c&d?2147483648^g^e^f:c|d?1073741824&g?3221225472^g^e^f:1073741824^g^e^f:g^e^f}function d(a,b,c){return a&b|~a&c}function e(a,b,c){return a&c|b&~c}function f(a,b,c){return a^b^c}function g(a,b,c){return b^(a|~c)}function h(a,e,f,g,h,i,j){return a=c(a,c(c(d(e,f,g),h),j)),c(b(a,i),e)}function i(a,d,f,g,h,i,j){return a=c(a,c(c(e(d,f,g),h),j)),c(b(a,i),d)}function j(a,d,e,g,h,i,j){return a=c(a,c(c(f(d,e,g),h),j)),c(b(a,i),d)}function k(a,d,e,f,h,i,j){return a=c(a,c(c(g(d,e,f),h),j)),c(b(a,i),d)}function l(a){for(var b,c=a.length,d=c+8,e=(d-d%64)/64,f=16*(e+1),g=Array(f-1),h=0,i=0;c>i;)b=(i-i%4)/4,h=8*(i%4),g[b]=g[b]|a.charCodeAt(i)<<h,i++;return b=(i-i%4)/4,h=8*(i%4),g[b]=g[b]|128<<h,g[f-2]=c<<3,g[f-1]=c>>>29,g}function m(a){var d,e,b="",c="";for(e=0;3>=e;e++)d=255&a>>>8*e,c="0"+d.toString(16),b+=c.substr(c.length-2,2);return b}function n(a){a=a.replace(/\r\n/g,"\n");for(var b="",c=0;c<a.length;c++){var d=a.charCodeAt(c);128>d?b+=String.fromCharCode(d):d>127&&2048>d?(b+=String.fromCharCode(192|d>>6),b+=String.fromCharCode(128|63&d)):(b+=String.fromCharCode(224|d>>12),b+=String.fromCharCode(128|63&d>>6),b+=String.fromCharCode(128|63&d))}return b}var p,q,r,s,t,u,v,w,x,o=Array(),y=7,z=12,A=17,B=22,C=5,D=9,E=14,F=20,G=4,H=11,I=16,J=23,K=6,L=10,M=15,N=21;for(a=n(a),o=l(a),u=1732584193,v=4023233417,w=2562383102,x=271733878,p=0;p<o.length;p+=16)q=u,r=v,s=w,t=x,u=h(u,v,w,x,o[p+0],y,3614090360),x=h(x,u,v,w,o[p+1],z,3905402710),w=h(w,x,u,v,o[p+2],A,606105819),v=h(v,w,x,u,o[p+3],B,3250441966),u=h(u,v,w,x,o[p+4],y,4118548399),x=h(x,u,v,w,o[p+5],z,1200080426),w=h(w,x,u,v,o[p+6],A,2821735955),v=h(v,w,x,u,o[p+7],B,4249261313),u=h(u,v,w,x,o[p+8],y,1770035416),x=h(x,u,v,w,o[p+9],z,2336552879),w=h(w,x,u,v,o[p+10],A,4294925233),v=h(v,w,x,u,o[p+11],B,2304563134),u=h(u,v,w,x,o[p+12],y,1804603682),x=h(x,u,v,w,o[p+13],z,4254626195),w=h(w,x,u,v,o[p+14],A,2792965006),v=h(v,w,x,u,o[p+15],B,1236535329),u=i(u,v,w,x,o[p+1],C,4129170786),x=i(x,u,v,w,o[p+6],D,3225465664),w=i(w,x,u,v,o[p+11],E,643717713),v=i(v,w,x,u,o[p+0],F,3921069994),u=i(u,v,w,x,o[p+5],C,3593408605),x=i(x,u,v,w,o[p+10],D,38016083),w=i(w,x,u,v,o[p+15],E,3634488961),v=i(v,w,x,u,o[p+4],F,3889429448),u=i(u,v,w,x,o[p+9],C,568446438),x=i(x,u,v,w,o[p+14],D,3275163606),w=i(w,x,u,v,o[p+3],E,4107603335),v=i(v,w,x,u,o[p+8],F,1163531501),u=i(u,v,w,x,o[p+13],C,2850285829),x=i(x,u,v,w,o[p+2],D,4243563512),w=i(w,x,u,v,o[p+7],E,1735328473),v=i(v,w,x,u,o[p+12],F,2368359562),u=j(u,v,w,x,o[p+5],G,4294588738),x=j(x,u,v,w,o[p+8],H,2272392833),w=j(w,x,u,v,o[p+11],I,1839030562),v=j(v,w,x,u,o[p+14],J,4259657740),u=j(u,v,w,x,o[p+1],G,2763975236),x=j(x,u,v,w,o[p+4],H,1272893353),w=j(w,x,u,v,o[p+7],I,4139469664),v=j(v,w,x,u,o[p+10],J,3200236656),u=j(u,v,w,x,o[p+13],G,681279174),x=j(x,u,v,w,o[p+0],H,3936430074),w=j(w,x,u,v,o[p+3],I,3572445317),v=j(v,w,x,u,o[p+6],J,76029189),u=j(u,v,w,x,o[p+9],G,3654602809),x=j(x,u,v,w,o[p+12],H,3873151461),w=j(w,x,u,v,o[p+15],I,530742520),v=j(v,w,x,u,o[p+2],J,3299628645),u=k(u,v,w,x,o[p+0],K,4096336452),x=k(x,u,v,w,o[p+7],L,1126891415),w=k(w,x,u,v,o[p+14],M,2878612391),v=k(v,w,x,u,o[p+5],N,4237533241),u=k(u,v,w,x,o[p+12],K,1700485571),x=k(x,u,v,w,o[p+3],L,2399980690),w=k(w,x,u,v,o[p+10],M,4293915773),v=k(v,w,x,u,o[p+1],N,2240044497),u=k(u,v,w,x,o[p+8],K,1873313359),x=k(x,u,v,w,o[p+15],L,4264355552),w=k(w,x,u,v,o[p+6],M,2734768916),v=k(v,w,x,u,o[p+13],N,1309151649),u=k(u,v,w,x,o[p+4],K,4149444226),x=k(x,u,v,w,o[p+11],L,3174756917),w=k(w,x,u,v,o[p+2],M,718787259),v=k(v,w,x,u,o[p+9],N,3951481745),u=c(u,q),v=c(v,r),w=c(w,s),x=c(x,t);var O=m(u)+m(v)+m(w)+m(x);return O.toLowerCase()},
	setCookie: function (name, value, days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			var expires = "; expires=" + date.toGMTString();
		}
		else var expires = "";
		document.cookie = name + "=" + value + expires + "; path=/";
	},
	getCookie: function(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) == 0)
				return c.substring(nameEQ.length, c.length);
		}
		return null;
	},
	validateEmail: function(email) {
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(email);
	},
	pageView: function() {
		var r = (document.referrer.indexOf(location.host) > -1 ? '' : document.referrer);
		var $st = false
		if (this.hasls())
			$st = localStorage.getItem("keptify-active-time") || 30

		//var remote_url = '//t.keptify.com/cf/pv.php?rand=' + Math.random() + '&lh=' + encodeURIComponent(location.hash) + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + ($st !== false ? '&st=' + $st : '' ) + '&r=' + encodeURIComponent(r) + '&callback=?'
		var remote_url = '//t.keptify.com/node/pv/?rand=' + Math.random() + '&lh=' + encodeURIComponent(location.hash) + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + ($st !== false ? '&st=' + $st : '' ) + '&r=' + encodeURIComponent(r) + '&callback=?'

		_cart_booster.$.getJSON(remote_url, function(remoteData){
			if (remoteData.page_registration) {
				setInterval(function() {
					_cart_booster.$('input[type=text],input[type=email],select').each(function() {

						var $found = false;
						for (var i in _cart_booster.fh) {
							if (_cart_booster.fh[i] == this )
								$found = true;
						}
						if (!$found) {
							_cart_booster.fh.push( this )
							_cart_booster.$(this).blur(function() {
								var $fname = _cart_booster.$(this).attr('name')
								!CB_DEBUG || console.log("fname=",$fname)
								!CB_DEBUG || console.log("fopt[fname]=",_cart_booster.fopt[$fname])
								var $fval = _cart_booster.$(this).val()
								if (_cart_booster.fopt.hasOwnProperty($fname) && _cart_booster.fopt[$fname] == 'mask') {
									$fval = $fval.split('').map(function() { return 'X'}).join('')
								}
								if (_cart_booster.fopt.hasOwnProperty($fname) && _cart_booster.fopt[$fname] == 'ignore') {
								} else {
									_cart_booster.$.getJSON('//t.keptify.com/node/field/?r=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&f=' + encodeURIComponent($fname) + '&v=' + encodeURIComponent($fval) + '&callback=?', function(remoteData){})
									//_cart_booster.$.getJSON('//t.keptify.com/cf/f.php?r='    + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&f=' + encodeURIComponent($fname) + '&v=' + encodeURIComponent($fval) + '&callback=?', function(remoteData){})
								}
							})
						}
					})
				},1000)
			}

			if (_cart_booster.page_confirmation) {
				_cart_booster.$.getJSON('//t.keptify.com/cf/finish.php?r=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&callback=?', function(){})
				_cart_booster.setCookie('cart-booster',_cart_booster.uuid(), remoteData.cookie_days )
				_cart_booster.sid = _cart_booster.getCookie('cart-booster')
				if (_cart_booster.hasls())
					localStorage.setItem("keptify-active-time", 0 )
			} else {
				_cart_booster.kv = remoteData.kv;
				if (remoteData.page_cart) {
					setInterval(function() {
						_cart_booster.cart_total = _cart_booster.func_cart_total()
						try {
							_cart_booster.func_cart_products()
						} catch (e) {
							_cart_booster.cart_products = false;
						}

						if (_cart_booster.MD5(parseFloat(_cart_booster.cart_total).toString()) !== _cart_booster.kv.total) {
							if ((_cart_booster.cart_total !== false)) {
								_cart_booster.kv.total = _cart_booster.MD5(parseFloat(_cart_booster.cart_total).toString())
								var $carturl = '//t.keptify.com/cf/c.php?r=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&t=' + encodeURIComponent(_cart_booster.cart_total) + '&c=' + encodeURIComponent(JSON.stringify(_cart_booster.cart_products)) + '&callback=?'
								var $carturl = '//t.keptify.com/node/cart/?rand=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&t=' + encodeURIComponent(_cart_booster.cart_total) + '&c=' + encodeURIComponent(JSON.stringify(_cart_booster.cart_products)) + '&callback=?'

								_cart_booster.$.getJSON($carturl, function(){
									// launch popup only after cart total was updated
									if (remoteData.popup_enabled) {
										if (remoteData.page_popup) {
											_cart_booster.popup_status = true;
										}
									}
								})
							} else {
								// popup
								if (remoteData.popup_enabled) {
									if (remoteData.page_popup) {
										_cart_booster.popup_status = true;
									}
								}
							}
						} else {
							// popup
							if (remoteData.popup_enabled) {
								if (remoteData.page_popup) {
									_cart_booster.popup_status = true;
								}
							}
						}
					},1000)
				} else {
					// popup
					if (remoteData.popup_enabled) {
						if (remoteData.page_popup) {
							_cart_booster.popup_status = true;
						}
					}
				}
			}
		})
	},

	saveField: function(field) {
		if (_cart_booster.$(field)[0].tagName == "INPUT" && _cart_booster.$(field)[0].type == "checkbox") {
			var $value = _cart_booster.$(field).is(':checked') ? _cart_booster.$(field).val() : _cart_booster.$(field).attr('off-value')
			_cart_booster.$.getJSON('//t.keptify.com/node/field/?r=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&popup=1&f=' + encodeURIComponent(_cart_booster.$(field).attr('name')) + '&v=' + encodeURIComponent($value) + '&callback=?', function(remoteData){})
			//_cart_booster.$.getJSON('//t.keptify.com/cf/f.php?r='    + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&popup=1&f=' + encodeURIComponent(_cart_booster.$(field).attr('name')) + '&v=' + encodeURIComponent($value) + '&callback=?', function(remoteData){})
		} else {
			_cart_booster.$.getJSON('//t.keptify.com/node/field/?r=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&popup=1&f=' + encodeURIComponent(_cart_booster.$(field).attr('name')) + '&v=' + encodeURIComponent(_cart_booster.$(field).val()) + '&callback=?', function(remoteData){})
			//_cart_booster.$.getJSON('//t.keptify.com/cf/f.php?r='    + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&popup=1&f=' + encodeURIComponent(_cart_booster.$(field).attr('name')) + '&v=' + encodeURIComponent(_cart_booster.$(field).val()) + '&callback=?', function(remoteData){})
		}
	},
	popup: function() {

		if (_cart_booster.$('.cart-booster-popup').length)
			return;

		_cart_booster.$.getJSON('//t.keptify.com/cf/popup.php?r=' + Math.random() + '&sid=' + _cart_booster.sid + '&site=' +_cart_booster.site + '&callback=?', function(popup_content){
			if (popup_content === false )
				return;


			var $cover = _cart_booster.$(
				'<div></div>',
				{
					class: 'cart-booster-popup',
					style: 'position: fixed;top: 0px;left: 0px;bottom: 0px;right: 0px;background-color: rgba(0,0,0,.5);z-index: 99999999;'
				}
			);
			$cover.click(function() {
				$cover.remove()
			})
			$cover.appendTo('body')


			var $cb_popup = _cart_booster.$(popup_content)


			$cb_popup.find('input[type=checkbox]').click(function(event) {
				event.stopPropagation()
				//return false
			})

			$cb_popup.click(function(event) {
				//event.preventDefault()
				return false;
			})

			$cb_popup.find('input[type=text]:first').focus(function() {
				_cart_booster.$(this).css('border','')
			})
			$cb_popup.find('a.cb-showpromocode').click(function() {
				if (_cart_booster.validateEmail(_cart_booster.$('input[type=text]:first', $cb_popup).val())) {
					_cart_booster.$('input[type=text]', $cb_popup).each(function(k,v) {
						_cart_booster.saveField( this )
					})
					_cart_booster.$('select', $cb_popup).each(function(k,v) {
						_cart_booster.saveField( this )
					})
					_cart_booster.$('input[type=checkbox]', $cb_popup).each(function(k,v) {
						_cart_booster.saveField( this )
					})

					_cart_booster.$(this).hide()
					_cart_booster.$('.cart-booster-popup input[type=text]').hide()
					_cart_booster.$('.cart-booster-popup select').hide()
				} else {
					_cart_booster.$('input[type=text]:first', $cb_popup).css('border','2px solid red')
				}
				return false;
			})
			$cb_popup.find('a').click(function() {
				if (_cart_booster.$(this).hasClass('cb-showpromocode') )
					return;

				$cover.remove()
				location.href = $(this).attr('href')
				return false;
			})
			$cb_popup.css('position', 'fixed')
			$cb_popup.css('top', '50%')
			$cb_popup.css('left', '50%')
			$cb_popup.css('margin-top' , '-' + ($cb_popup.height()/2) + 'px')
			$cb_popup.css('margin-left' , '-' + ($cb_popup.width()/2) + 'px')
			$cb_popup.appendTo($cover)

			_cart_booster.$('.cart-booster-popup form').submit(function() {
				_cart_booster.$('.cart-booster-popup [type=button]').click();
				return false;
			})

			_cart_booster.$('.cart-booster-popup [type=button]').click(function() {
				_cart_booster.$('input[type=text]', $cb_popup).each(function(k,v) {
					_cart_booster.saveField( this )
					$cover.click()
				})
			})

			_cart_booster.$('.cartbooster-popup-close').click(function() {
				$cover.click()
			})
		})
	},
	uuid: function() {
		return ('xxxxxxxx-xxxx-yxxx-' + new Date().getTime().toString() + '-0-0').replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);
		});
	},
	hasls: function () {
	  try {
		return 'localStorage' in window && window['localStorage'] !== null;
	  } catch (e) {
		return false;
	  }
	},
	feedback: function(settings) {
		var $this = this
		var $ = $this.$
		var $mini = false
		if ($(window).width() <= 450) $mini = true

		var $feedback_button = $('<img>', { src: settings.button, style: 'position:fixed;z-index: 99999999;cursor: pointer;'})
		var $feedback_mask = $('<div>', {style: 'position:fixed;top:0px;bottom:0px;width:0px;transition: all .5s;overflow: hidden;z-index: 99999999;' })
		if ($mini)
			$feedback_mask.css('top','').css('width','').css('height','0px').css('left','0px')

		var $feedback_content = $('<div>', { style: 'position:absolute;top: 50%;margin-top: -150px;width: 400px;height: 300px;box-sizing: border-box;' } )
		if ($mini)
			$feedback_content.css('margin-top','').css('width','').css('top','15px').css('left','15px').css('right','15px')

		$feedback_content.attr('style', $feedback_content.attr('style') + ';' + settings.style )
		$feedback_content.append( "<div style='font-size: 28px;line-height: 36px;'>Feedback</div>" )

		var $feedback_form = $('<form>', { target:'cartbooster-feedback-frame', method: 'POST' , action:'//t.keptify.com/cf/fb.php?r=' + Math.random() + '&site=' + $this.site + '&sid=' + $this.sid  } ).appendTo($feedback_content)

		$feedback_form.html(settings.form)
		var $feedback_iframe = $('<iframe>', {name: 'cartbooster-feedback-frame', frameborder: 'no', style: 'width:100%;'}).hide().appendTo($feedback_form)
		var $feedback_submit = $('<input>', {type: 'submit', value: 'Submit'}).appendTo($feedback_form).attr('style', settings.submit_style)


		$('input[type=text]',$feedback_form).attr('style', settings.input_style)
		$('textarea',$feedback_form).attr('style', settings.textarea_style)
		//$('input[type=submit]',$feedback_form).attr('style', settings.submit_style)

		var $feedback_close = $(settings.closeBtn).appendTo($feedback_content)


		if (settings.position == 'right') {
			$feedback_button.css('right', '0px' )
			$feedback_mask.css('right','0px')
			// move close to leftside
			if (!$mini)
				$feedback_close.css('left', $feedback_close.css('right')).css('right','')

			$feedback_content.css('left', '15px')
		} else if (settings.position == 'left') {
			$feedback_button.css('left', '0px' )
			$feedback_mask.css('left','0px')
			$feedback_content.css('right', '15px')
		} else {
			$feedback_button.hide()
		}



		$feedback_button.css('top', ($(window).height()/2) - 70 )
		$feedback_button.appendTo('body')
		$feedback_mask.appendTo('body')
		$feedback_content.appendTo($feedback_mask)

		// open feedback
		$feedback_button.click(function() {
			$feedback_button.hide()
			if ($mini) {
				$feedback_mask.css('height', '100%')
			} else {
				$feedback_mask.css('width', '415px')
			}
		})

		// close feedback
		$feedback_close.click(function() {
			if ($mini)
				$feedback_mask.css('height', '0px')
			else
				$feedback_mask.css('width', '0px')

			setTimeout(function() {
				$feedback_button.show()
			},1000)
		})

		// submit
		$feedback_form.submit(function() {
			var $ef = $feedback_form.find('[name=email]')
			if (!$this.validateEmail($ef.val())) {
				$ef.attr('cb-border',$ef.css('border'))
				$ef.css('border','2px solid red')
				$ef.click(function() {
					$ef.css('border', $ef.attr('cb-border') )
				})
				return false;
			} else {
				$feedback_form.find('input,textarea').hide()
				$feedback_iframe.show()
				setTimeout(function() {
					if ($mini)
						$feedback_mask.css('height', '0px')
					else
						$feedback_mask.css('width', '0px')

					setTimeout(function() {
						$feedback_button.show()
					},1000)
				},1000)
			}
		})

	},
	act: function() {
		if (this.lastact !== Math.round(new Date().getTime() / 30000)) {
			if (this.hasls()) {
				this.acttime = parseInt(localStorage.getItem("keptify-active-time")) || 0
				this.acttime+=30
				localStorage.setItem("keptify-active-time", this.acttime )

			} else {
				this.acttime+=30
			}
			this.lastact = Math.round(new Date().getTime() / 30000)
		}
	}
}
if (_cart_booster.getCookie('cart-booster') === null) {
	_cart_booster.setCookie('cart-booster',_cart_booster.uuid(), {{site.cookie_days}} )
	_cart_booster.sid = _cart_booster.getCookie('cart-booster')
}

_cart_booster.sid = _cart_booster.getCookie('cart-booster')
_cart_booster.pageView()
_cart_booster.ff()


//variables to link with core->done 2015.11.17
overlayEnabled = false;
swipeEnabled = true;
swipes = 0;
//default values


try {
	MIN_SWIPES_FOR_OVERLAY = {{site.min_swipes_for_mob_overlay}};
	MIN_TIME_FOR_OVERLAY = {{site.min_time_for_mob_overlay}}; //milisec 
}
catch (err) {
	MIN_SWIPES_FOR_OVERLAY = 5;
	MIN_TIME_FOR_OVERLAY = 5; 
}




setTimeout(function() {
	overlayEnabled = true ;
	!CB_DEBUG || console.log("Elapsed:"+(MIN_TIME_FOR_OVERLAY)+"s -Overlay is now enabled to show on mobile)");
}, (MIN_TIME_FOR_OVERLAY*1000));

_cart_booster.$(window).mouseleave(function(e) {
	if ((e.clientY < 0) && (e.clientY > -30)) {
		if (!_cart_booster_isMobile){
			if ( _cart_booster.popup_status ){
				_cart_booster.popup();
				!CB_DEBUG || console.log("May show popup on desktop")
			}
		}	
	}
})

_cart_booster.$(window).mousemove(function(e) {
	_cart_booster.act()
})

_cart_booster.$(window).scroll(function(e) {
	_cart_booster.act()
	if (_cart_booster_isMobile) {
		if (_cart_booster$(this).scrollTop() == 0) { //reach top
			!CB_DEBUG || console.log("Top reached")
			if(swipes > MIN_SWIPES_FOR_OVERLAY  && overlayEnabled) {
				if (_cart_booster.popup_status) {
					_cart_booster.popup();
					!CB_DEBUG || console.log("OVERLAY IS DISPLAYED on mobile")
					swipes = 0 ;
					overlayEnabled = false;
					setTimeout(function() {
						overlayEnabled = true;
						!CB_DEBUG || console.log("Overlay on mobile is now enabled-elapsed:"+MIN_TIME_FOR_OVERLAY)
					}, (MIN_TIME_FOR_OVERLAY*1000));
				}	
			}
		}	
		if(swipeEnabled){
			swipes++;
			!CB_DEBUG || console.log("Swipes: " + swipes);
			swipeEnabled=false;
			setTimeout(function() {
				swipeEnabled=true;
			},700);
		}
	}
})

if (_cart_booster_isMobile) {
	!CB_DEBUG || console.log("You are on Mobile")
}else {
	!CB_DEBUG || console.log("You are on Desktop")
}
