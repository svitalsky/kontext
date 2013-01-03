/*
 * Copyright (c) 2003-2009 Pavel Rychly
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

function winH() {
   if (window.innerHeight) {
      /* NN4 and compatible browsers */
      return window.innerHeight;

   } else if (document.documentElement &&
            document.documentElement.clientHeight) {
      /* MSIE6 in std. mode - Opera and Mozilla
       succeeded with window.innerHeight */
        return document.documentElement.clientHeight;

   } else if (document.body && document.body.clientHeight) {
      /* older MSIE + MSIE6 in quirk mode */
      return document.body.clientHeight;

   } else {
      return screen.availHeight;
   }
}

function getScrollY() {
    var scrOfY = 0;
    if( typeof( window.pageYOffset ) == 'number' ) {
        //Netscape compliant
        scrOfY = window.pageYOffset;

    } else if (document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
        //DOM compliant
        scrOfY = document.body.scrollTop;
    } else if (document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
        //IE6 standards compliant mode
        scrOfY = document.documentElement.scrollTop;
    }
    return scrOfY;
}


function getIEVersion() {
    var ua = navigator.userAgent;
    var MSIEOffset = ua.indexOf("MSIE ");
    if (MSIEOffset == -1) {
        return 0;
    } else {
        return parseFloat(ua.substring(MSIEOffset + 5,
                                       ua.indexOf(";", MSIEOffset)));
    }
}

function fix_detail_frame_on_scrolling() { // IE only
    if (navigator.appName == "Microsoft Internet Explorer" & getIEVersion() < 8) {
        var win_height = winH();
        var detail_height = $('detailframe').scrollHeight;
        if (detail_height > win_height / 3) {
            detail_height = win_height / 3;
        }
        var div_position = win_height - detail_height;
        if (navigator.appName == "Microsoft Internet Explorer") {
            $('detailframe').style.position = 'absolute';
            $('detailframe').style.top = getScrollY() + div_position - 3;
            if ($('detailframecontent').scrollHeight > win_height / 3) {
                $('detailframe').style.height = detail_height;
            }
            $('bodytag').style.paddingBottom = detail_height;
            $('bodytag').style.height = win_height - detail_height;
        }
    }
}

function update_detail_frame(request) {
    var win_height = winH();
    $('#detailframecontent').innerHTML = request.responseText;
    var detail_height = $('detailframecontent').scrollHeight + 18; // 18 = horiz. sroll bar
    if (detail_height > win_height / 3) {
        detail_height = win_height / 3;
    }
    var div_position = win_height - detail_height;

    if (navigator.appName == "Microsoft Internet Explorer" & getIEVersion()<8) {
        $('#detailframe').style.position = 'absolute';
        $('#detailframe').style.top = getScrollY() + div_position - 3;
        if ($('#detailframecontent').scrollHeight > win_height / 3) {
            $('#detailframe').style.height = detail_height;
        }
        $('#detailframe').style.height = detail_height;
        $('#bodytag').style.paddingBottom = detail_height;
        $('#bodytag').style.height = win_height - detail_height;

    } else { // normal browsers
        $('#detailframe').style.height = detail_height + 'px';
        $('#detailframe').style.position = 'fixed';
        $('#detailframe').style.top = div_position - 1;
        $('#bodytag').style.paddingBottom = detail_height;
    }
    $(document).bind('click', close_by_outside_click);
    $('#detailframe').bind('click', function (event) {
        event.stopPropagation();
    });

}


function close_by_outside_click(event) {
    hide_detail_frame();
}

function display_in_detail_frame(url, params) {
    $($('#minus_sign *:first-child')).bind('click', function (event) {
        hide_detail_frame();
        event.stopPropagation();
    });
    $(document).unbind('click', close_by_outside_click);
	var df = $('detailframe');
	df.css({
        display : 'block',
        height : '50'
    });
    $('detailframecontent').innerHTML = '';
	params += '&corpname=' + df.corpname;
	$.ajax({
        url : url,
        data : params,
        method:'get',
        complete: update_detail_frame
    });
}

function hide_detail_frame() {
	$('detailframe').style.display='none'; 
        if (navigator.appName == "Microsoft Internet Explorer") { $('bodytag').style.height = winH(); }
	$('bodytag').style.paddingBottom='0px';
}

function wide_context(toknum, hitlen) {
	var params = 'pos=' + toknum + '&hitlen=' + hitlen;
	display_in_detail_frame("widectx", params);
}

function full_ref(toknum) {
	display_in_detail_frame("fullref", 'pos=' + toknum);
}

/**
 *
 * @param linkElem
 */
function open_speech(linkElem) {
    var speechURL = $(linkElem).attr('href'),
        sound;

    require(['audioplayer'], function (ap) {
        ap.create('audio-wrapper', linkElem, { volume : 90 }).play(speechURL);
    });



}
