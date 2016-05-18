/**
 * This work is licensed under the Creative Commons Attribution-Share Alike 3.0
 * United States License. To view a copy of this license,
 * visit http://creativecommons.org/licenses/by-sa/3.0/us/ or send a letter
 * to Creative Commons, 171 Second Street, Suite 300, San Francisco, California, 94105, USA.
 *
 * Modified by: Jason Abraham (CrashSensei)
 * Email: jason@linearsoft.com
 *
 * Configurable idle (no activity) timer and logout redirect for jQuery.
 * Supports both jQueryUI dialogs or Bootstrap modals
 * Works across multiple windows, tabs from the same domain.
 * Additional support for iFrames (not extensively tested) /* --strip_iframe-- */ /*
 *
 * Initially forked from Jill Elaine's jquery-idleTimeout
 * Bootstrap code and other code influenced by bootstrap-session-timeout by orangehill
 *
 * Dependencies: JQuery v1.7+,
 *      Multi-window support requires JQuery Storage API
 *      Dialogs require either jQueryUI or Bootstrap
 *
 * version 0.5.0
 **/

(function ($) {

    /** @namespace $.fn */
    $.fn.idleTimeout = function (userConfig) {

        console.log('start of jquery-idleTimeout-plus plugin');

        //#########################################
        // ###  Configuration Opts
        //#########################################
        var defaultConfig = {
            //Idle settings
            idleTimeLimit:      1200,                                                           //'No activity' time limit in seconds. 1200 = 20 Minutes
            idleCheckHeartbeat: 2,                                                              // Frequency to check for idle timeouts in seconds
            activityEvents:     'click keypress scroll wheel mousewheel mousemove touchmove',   // configure which activity events to detect separate each event with a space, set to false for none

            //Warning dialog
            warningEnabled:             true,                               // set to false for redirect without any warning
            warningTimeLimit:           180,                                // timeout until warning results in redirect in seconds. 180 = 3 Minutes
            warningTitle:               'Session Timeout',                  // also displays on browser title bar
            warningMessage:             'Your session is about to expire!',
            warningCountdownMessage:    'Time remaining: {timer}',           //Set to false to disable see doc on how to set
            warningStayConnectedButton: 'Stay Connected',
            warningLogoutButton:        'Logout',
            warningWindowTitle:         false,

            warningBootstrapped:        false,                               //Enable bootstrap modal
            warningCountdownBar:        false,

            //Urls / Handlers
            redirectUrl:    '/timed-out',       //URL to take browser to if no action is take after the warning.
            logoutUrl:      '/logout',          //URL to take browser to if user clicks "Logout" on the Bootstrap warning dialog
            logoutAutoUrl:  '/logout-notice',   //URL to send secondary tabs that received an automatic logout trigger (to help avoid race conditions)
            onWarn:         false,              //Callback for warning (you will need to call showWarn if you want the dialog to display) -- timer will start automatically
            onLogout:       false,              //Callback for logout (note: url redirection will not occur)
            onLogoutAuto:   false,              //Callback for logoutAuto (note: url redirection will not occur)
            onRedirect:     false,              //Callback for Redirect (note: url redirection will not occur)

            //Session keepAlive
            keepAliveInterval:  600,                    //ping the server at this interval in seconds. 600 = 10 Minutes. Set to false to disable pings
            keepAliveUrl:       window.location.href,   // set URL to ping - does not apply if keepAliveInterval: false
            keepAliveAjaxType:  'GET',
            keepAliveAjaxData:  '',

            //Extensions
            iframesSupport: false,      //Enable iframe support code (also requires multiWindow support to work) /* --strip_iframe-- */
            multiWindowSupport: true    //Requires jquery-storage-api

        };

        /* --strip_testing_begin-- */
        var testingConfig = {
            idleTimeLimit:      30,                                         // 30 seconds for testing.
            activityEvents:     'click keypress scroll wheel mousewheel',   // Remove mousemove
            warningTimeLimit:   20,                                         // 20 seconds for testing
            keepAliveInterval:  10
        };
        /* --strip_testing_end-- */

        //#########################################
        // ###  Configuration check & var init
        //#########################################
        var config = $.extend(defaultConfig, userConfig);           // merge default and user runtime configuration
        config = $.extend(defaultConfig,testingConfig, userConfig); /* --strip_testing-- */
        config.idleTimeLimit        = config.idleTimeLimit*1000;
        config.idleCheckHeartbeat   = config.idleCheckHeartbeat*1000;
        config.warningTimeLimit     = config.warningTimeLimit*1000;
        config.keepAliveInterval    = config.keepAliveInterval*1000;
        /* --strip_iframe_begin-- */
        if(config.iframesSupport && !config.multiWindowSupport) {
            console.error('jqueryIdleTimeoutPlus Error: IFrame support requested but Multi-Window support disabled');
            return false;
        }
        /* --strip_iframe_end-- */
        if(config.multiWindowSupport) {
            if(!$.localStorage) {
                console.error('jqueryIdleTimeoutPlus Error: Multi-Window support requested but JQuery Storage API is unavailable');
                return false;
            }
        }
        if (config.warningEnabled && typeof(config.onWarn) != 'function') {
            if (config.warningBootstrapped) {
                if (typeof($.fn.modal) === 'undefined') {
                    console.error('jqueryIdleTimeoutPlus Error: Bootstrap library is unavailable');
                    return false;
                }
            } else {
                if (typeof(jQuery.ui) === 'undefined') {
                    console.error('jqueryIdleTimeoutPlus Error: jQueryUI library is unavailable');
                    return false;
                }
            }
        }

        var dataStore = null;
        if(config.multiWindowSupport) dataStore = ($.initNamespaceStorage('jqueryIdleTimeoutPlus')).localStorage;
        else dataStore = {};


        //#########################################
        // ###  Public Functions
        //#########################################
        /**
         * logout()
         * trigger a manual user logout, call this to cause a logout of all windows
         * use this code snippet on your site's Logout button: $.fn.idleTimeout().logout();
         */
        this.logout = function () {
            console.log('start logout');
            storeData('logoutTriggered', true);
        };
        /**
         * showWarningDialog()
         * launches the warning dialog
         * this is meant to be used by your onWarn callback function
         */
        this.showWarningDialog = function () {
            console.log('manual warn dialog');
            openWarningDialog();
        };
        /**
         * clearWarningTimer()
         * clears the warning timer and reverts back to idleTimout
         * this is meant to be used by your onWarn callback function
         */
        this.clearWarningTimer = function () {
            console.log('manual clear warn');
            stopWarningTimer();
        };

        /* --strip_iframe_begin-- */
        /**
         *  iframeRecheck()
         *  trigger a recheck for iframes
         *  use this code snippet after an iframe is inserted into the document: $.fn.idleTimeout().iframeRecheck()
         */
        this.iframeRecheck = function () {
            console.log('start iframeRecheck');
            checkForIframes();
        };
        /* --strip_iframe_end-- */

        //#########################################
        //## Private Functions
        //#########################################

        var storeData = function (key,value) {
            if(config.multiWindowSupport) {
                dataStore.set(key,value);
            } else {
                dataStore[key] = value;
            }
        };

        var loadData = function (key,defaultValue) {
            defaultValue = typeof defaultValue !== 'undefined' ? defaultValue : null;
            if(config.multiWindowSupport) {
                if(dataStore.isSet(key)) return dataStore.get(key);
            } else {
                if(key in dataStore) return dataStore[key];
            }
            return defaultValue;
        };

        // -------------------------- Idle Monitoring --------------------------//
        var idleTimer;
        var mousePosition = [-1, -1];

        var startIdleTimer = function () {
            console.log('start startIdleTimer');
            stopIdleTimer();
            storeData('lastActivity',$.now());
            idleTimer = setInterval(checkIdleTimeout,config.idleCheckHeartbeat);
        };

        var stopIdleTimer = function () {
            console.log('start stopIdleTimer');
            clearInterval(idleTimer);
        };

        var checkIdleTimeout = function () {

            // Note: lastActivity stops being updated once the warning period starts
            var idleTimeoutTime = (loadData('lastActivity', $.now()) + config.idleTimeLimit);

            //Check to see if other windows/tabs have had a critical event
            if (loadData('logoutTriggered') === true) {
                console.log('alternate document logout detected');
                return handleLogoutTrigger();
            }
            if($.now() >= idleTimeoutTime) {
                console.log('inactivity has exceeded the idleTimeLimit');
                return handleIdleTimeout();
            }
        };


        var handleIdleTimeout = function () {
            if(!config.warningEnabled) { // warning dialog is disabled
                console.log('warning dialog disabled - log out user without warning');
                return handleRedirect(); // immediately redirect user when user is idle for idleTimeLimit
            }
            startWarningTimer();
            if(typeof config.onWarn == 'function') return config.onWarn(config);
            if (isWarningDialogOpen() !== true) {
                console.log('warning dialog is not open & will be opened');
                openWarningDialog();
            }
        };

        var activityDetector = function () {
            $(document).on(config.activityEvents, function (e) {
                if (e.type === 'mousemove') {
                    // Solves mousemove even when mouse not moving issue on Chrome:
                    // https://code.google.com/p/chromium/issues/detail?id=241476
                    if (e.clientX === mousePosition[0] && e.clientY === mousePosition[1]) {
                        return;
                    }
                    mousePosition[0] = e.clientX;
                    mousePosition[1] = e.clientY;
                }
                if(loadData('warningStartTime',-1) == -1) {
                    console.log('activity detected');
                    startIdleTimer();
                }
                else console.log('warningTriggered activity ignored'); /* --strip_testing-- */
            });
        };

        // -------------------------- Session Keep Alive --------------------------//
        var keepAliveInterval;

        var startKeepSessionAlive = function () {
            console.log('start startKeepSessionAlive');
            setInterval(function() {
                console.log('sending ping to keepAliveUrl');
                $.ajax({
                    type: config.keepAliveAjaxType,
                    url: config.keepAliveUrl,
                    data: config.keepAliveAjaxData
                });
            }, config.keepAliveInterval);
        };

        var stopKeepSessionAlive = function () {
            console.log('stop keep session alive');
            clearInterval(keepAliveInterval);
        };


        // -------------------------- Warning Timer --------------------------//

        var warningTimer;

        var startWarningTimer = function () {
            console.log('start startWarningTimer');
            stopIdleTimer();
            storeData('warningStartTime',$.now());
            warningTimer = setInterval(checkWarningTimeout, 500);
        };

        var stopWarningTimer = function () {
            console.log('start stopWarningTimer');
            killWarningTimer();
            storeData('warningStartTime',-1);
            startIdleTimer();
        };

        var killWarningTimer = function () {
            clearInterval(warningTimer);
        };

        var checkWarningTimeout = function () {
            //Check to see if other windows/tabs have had a critical event
            if (loadData('logoutTriggered') === true) {
                console.log('alternate document logout detected');
                return handleLogoutTrigger();
            }
            //Has the warning been cleared (possibly by another tab/window)
            if(loadData('warningStartTime',-1) == -1) {
                console.log('checkWarningTimer warning cleared');
                stopWarningTimer();
                return closeWarningDialog();
            }
            //Check if timeout exceeded
            var warningTimeout = (loadData('warningStartTime') + config.warningTimeLimit);
            if ($.now() >= warningTimeout) {
                killWarningTimer();
                return handleRedirect();
            }
            //Update dialog if open
            if(isWarningDialogOpen()) {
                updateWarningDialog();
            }
        };


        // -------------------------- Warning Dialog --------------------------//

        var warningDialogInitialized = false;
        var warningDialog = null;
        var warningDialogCountdownHolder = null;

        var openWarningDialog = function () {
            console.log('openWarningDialog');
            if(!warningDialogInitialized) initializeWarningDialog();
            updateWarningDialog();
            if(!config.warningBootstrapped) {
                warningDialog.dialog('open');
            } else {
                warningDialog.modal('show')
            }
        };

        var closeWarningDialog = function () {
            console.log('closeWarningDialog');
            if(!isWarningDialogOpen()) return;
            if(!config.warningBootstrapped) {
                warningDialog.dialog('close');
            } else {
                warningDialog.modal('hide'); //Despite modal being self-closing this is used if warning is cleared on another window
                // http://stackoverflow.com/questions/11519660/twitter-bootstrap-modal-backdrop-doesnt-disappear
                $('body').removeClass('modal-open');
                $('div.modal-backdrop').remove();
            }
        };

        var isWarningDialogOpen = function () {
            return ($("#idletimeout-warning-dialog").is(":visible") === true);
        };

        var updateWarningDialog = function () {
            var currTime = $.now();
            var totalSecsLeft = Math.floor(((loadData('warningStartTime',currTime) + config.warningTimeLimit) - currTime)/1000);

            if(config.warningCountdownMessage != false) {
                var minLeft =  Math.floor(totalSecsLeft/60);
                var secsLeft = totalSecsLeft % 60;
                var countTxt = minLeft > 0 ? minLeft + 'm ' : '';
                countTxt += secsLeft + 's';
                warningDialogCountdownHolder.text(countTxt);
            }
            if(config.warningCountdownBar != false) {
                var percentLeft = Math.floor(totalSecsLeft/config.warningTimeLimit) * 100;
                warningDialog.find('.countdown-bar').css('width', percentLeft + '%');
            }
        };

        var onLogoutButton = function () {
            killWarningTimer();
            handleLogout();
        };

        var onStayConnectedButton = function () {
            closeWarningDialog();
            stopWarningTimer();
        };

        var initializeWarningDialog = function () {
            var countdownMessage = '';
            if(config.warningCountdownMessage !== false) {
                countdownMessage = '<p>' + config.warningCountdownMessage.replace(/{timer}/g, '<span class="countdown-holder"></span>') + '</p>'
            }
            if(!config.warningBootstrapped) {
                //Setup non bootstrap Dialog
                var dialogContent = '<div id="idletimeout-warning-dialog">' + '<p>' + config.warningMessage + '</p>' + countdownMessage + '</div>';
                $(dialogContent).dialog({
                    buttons: [
                        {
                            text: config.warningLogoutButton,
                            click: function () {
                                console.log('Log Out Now button clicked');
                                onLogoutButton();
                            }
                        },
                        {
                            text: config.warningStayConnectedButton,
                            click: function () {
                                console.log('Stay Logged In button clicked');
                                onStayConnectedButton();
                            }
                        }
                    ],
                    closeOnEscape: false,
                    modal: true,
                    title: config.warningTitle,
                    autoOpen: false,
                    open: function () {
                        //hide the dialog's upper right corner "x" close button
                        $(this).closest('.ui-dialog').find('.ui-dialog-titlebar-close').hide();
                    }
                });
            } else {
                //Setup bootstrap dialog
                var coundownBarHtml = config.warningCountdownBar ?
                    '<div class="progress"> \
                      <div class="progress-bar progress-bar-striped countdown-bar active" role="progressbar" style="min-width: 15px; width: 100%;"> \
                        <span class="countdown-holder"></span> \
                      </div> \
                    </div>' : '';

                $('body').append(
                    '<div class="modal fade" id="idletimeout-warning-dialog"> \
                        <div class="modal-dialog"> \
                            <div class="modal-content"> \
                                <div class="modal-header"> \
                                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button> \
                                    <h4 class="modal-title">' + config.warningTitle + '</h4> \
                            </div> \
                            <div class="modal-body"> \
                                <p>' + config.warningMessage + '</p> \
                                ' + countdownMessage + ' \
                                ' + coundownBarHtml + ' \
                            </div> \
                            <div class="modal-footer"> \
                                <button id="idletimeout-warning-logout" type="button" class="btn btn-default">' + config.warningLogoutButton + '</button> \
                                <button id="idletimeout-warning-stayconnected" type="button" class="btn btn-primary" data-dismiss="modal">' + config.warningStayConnectedButton + '</button> \
                            </div> \
                        </div> \
                    </div> \
                </div>'
                );

                // "Logout" button click
                $('#idletimeout-warning-logout').on('click', function() {
                    console.log('Log Out Now button clicked');
                    onLogoutButton();
                });
                // "Stay Connected" button click / or modal close
                $('#idletimeout-warning-dialog').on('hidden.bs.modal', function() {
                    console.log('BS modal closed');
                    onStayConnectedButton();
                });
            }

            warningDialogInitialized = true;
            warningDialog = $('#idletimeout-warning-dialog');
            warningDialogCountdownHolder = warningDialog.find('.countdown-holder');
        };


        // -------------------------- Logout & Redirect --------------------------//

        var handleLogout = function () {
            storeData('logoutTriggered',true);
            if(typeof config.onLogout == 'function') {
                return config.onLogout(config);
            }
            window.location = config.logoutUrl;
        };

        var handleLogoutTrigger = function () {
            if(typeof config.onLogoutAuto == 'function') {
                return config.onLogoutAuto(config);
            }
            window.location = config.logoutAutoUrl;
        };

        var handleRedirect = function () {
            if(typeof config.onRedirect == 'function') {
                return config.onRedirect(config);
            }
            window.location.href = config.redirectUrl;
        };

        /* --strip_iframe_begin-- */
        // ###############################
        // ###  Special IFrame Code
        // ###############################

        // WORK AROUND - save config.activityEvents value to interWindow storage for use in function: attachEventIframe
        var storeActivityEvents = function () {
            console.log('store configuration activityEvents ' + config.activityEvents + '.');
            storeData('activityEvents',config.activityEvents);
        };

        // Recheck for iframes when a dialog is opened
        var dialogListener = function() {
            $(document).on('dialogopen shown.bs.modal', function () {
                console.log('start dialog/modal open');
                if(!isWarningDialogOpen()) {
                    console.log('a dialog other than warning dialog opened. Recheck for iframes.');
                    checkForIframes();
                }
                else console.log('warning dialog opened. No recheck for iframes.');  /* --strip_testing-- */
            });
        };

        var checkForIframes = function () {
            console.log('start checkForIframes');
            // document must be in readyState 'complete' before checking for iframes - $(document).ready() is not good enough!
            var docReadyInterval;

            var docReadyCheck = function () {
                if (document.readyState === "complete") {
                    clearInterval(docReadyInterval);
                    includeIframes();
                }
            };
            //Use of anon function prevents clearing of docReadyInterval
            docReadyInterval = setInterval(docReadyCheck, 1000); // check once a second to see if document is complete
        };

        var includeIframes = function (elementContents) {
            console.log('start includeIframes');

            if (!elementContents) {
                console.log('elementContents not defined. Define as $(document)');
                elementContents = $(document);
            }

            var iframeCount = 0;

            elementContents.find('iframe,frame').each(function () {
                console.log('start of find iframes');

                if ($(this).hasClass('jitp-inspected') === false) {

                    console.log('first time inpection of iframe - no jitp-inspected class');

                    try {

                        includeIframes($(this).contents()); // recursive call to include nested iframes

                        // attach event code for most modern browsers
                        $(this).on('load', attachEventIframe($(this))); // Browser NOT IE < 11

                        // attach event code for older Internet Explorer browsers
                        console.log('iframeCount: ' + iframeCount + '.');
                        var domElement = $(this)[iframeCount]; // convert jquery object to dom element

                        if (domElement.attachEvent) { // Older IE Browser < 11
                            console.log('attach event to iframe. Browser IE < 11');
                            domElement.attachEvent('onload', attachEventIframe($(this)));
                        }

                        iframeCount++;

                    } catch (err) {
                        /* Unfortunately, if the 'includeIframes' function is manually triggered multiple times in quick succession,
                         * this 'try/catch' block may not have time to complete,
                         * and so it might error out,
                         * and iframes that are NOT cross-site may be set to "cross-site"
                         * and activity may or may not bubble to parent page.
                         * Fortunately, this is a rare occurrence!
                         */
                        console.log('found cross-site iframe - add classes "jitp-inspected" & "cross-site"');
                        $(this).addClass('jitp-inspected cross-site');
                    }

                } else {
                    console.log('iframe already has class jitp-inspected');
                }

            });

        };

        var attachEventIframe = function (iframeItem) {
            console.log('start attachEventIframe');

            // retrieve stored value as config will not include private config
            // when this function is called by public function, iframeRecheck
            console.log('config.activityEvents: ' + config.activityEvents + '.');
            var iframeContents = iframeItem.contents(), storeActivityEvents = loadData('activityEvents','');

            try {

                iframeContents.on(storeActivityEvents, function (event) {
                    console.log('bubbling iframe activity event to body of page event: ' + event.type + '.');
                    $('body').trigger(event);
                });

                iframeItem.addClass('jitp-inspected'); // add "jitp-inspected" class, so we don't need to check this iframe again

            } catch (err) {
                console.log('problem with attachment of activity events to this iframe');
            }

        };

        /* --strip_iframe_end-- */

        //###############################
        // Build & Return the instance of the item as a plugin
        // This is your construct.
        //###############################
        return this.each(function () {
            //Init data (this will clear other tabs in a warning state by design)
            storeData('logoutTriggered',false);
            storeData('warningStartTime',-1);
            storeData('lastActivity',$.now());

            /* --strip_iframe_begin-- */
            storeActivityEvents();
            dialogListener();
            /* --strip_iframe_end-- */
            activityDetector();

            if (config.keepAliveInterval) {
                startKeepSessionAlive();
            }

            startIdleTimer();

            checkForIframes();  /* --strip_iframe-- */
        });
    };
}(jQuery));