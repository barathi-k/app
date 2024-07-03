//participants-icon__icon-box
//$0.__reactInternalInstance$6h6neyck7we.return.memoizedProps.receivedReaction
window.addEventListener('DOMContentLoaded', function(event) {
  console.log('DOM fully loaded and parsed');
  websdkready();
});

const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
const chatUrl = (new URLSearchParams(params.roomId.replace(/https.*\?/, "")))
roomId = chatUrl.get('session') || params.roomId


// TODO: Must clear this interval
setInterval(() => {
  document.getElementById('join-btn')?.click()
}, 1000)

const openParticipantPanel = () => {
  document
    .querySelector(
      '[aria-label*="open the manage participants list"'
    )
    ?.click();
  document
    .querySelector(
      '[aria-label*="open the participants list pane"'
    )
    ?.click();
}

const openChatPanel = () => {
  document
    .querySelector(
      '[aria-label*="open the chat pane"'
    )
    ?.click();

  if (!document.querySelector("#q-a-meeting-container-window")){
    document.querySelector('.q-a-entry-button-container')?.click()
  }
}

const joinAsPanelist = () => {
  if (document.querySelector('.zm-modal-footer-default')) {
    document.querySelector('.zm-modal-footer-default .zm-btn--primary')?.click()
  }
}

const openSettings = () => {
  if (!document.querySelector('.settings-dialog')) {
    document.querySelector('[aria-label="Settings"]')?.click()

    Array.from(document.querySelectorAll('.tab-bar-node__text'))?.find(tab => tab.textContent === "Statistics")?.click()
    document.querySelector('[aria-controls="Video-tab"]')?.click()
  }
}

function websdkready() {
  var testTool = window.testTool;
  // get meeting args from url
  var tmpArgs = testTool.parseQuery();
  var meetingConfig = {
    sdkKey: tmpArgs.sdkKey,
    meetingNumber: tmpArgs.mn,
    userName: (function () {
      if (tmpArgs.name) {
        try {
          if (params.mode == 'host') {
            return "Host"
          } else if (params.mode === 'simulator' && params.gender == 'female') {
            return femaleNames[Math.floor(Math.random()*femaleNames.length)];
          } else if (params.mode == 'simulator') {
            return maleNames[Math.floor(Math.random()*maleNames.length)];
          }

          return testTool.b64DecodeUnicode(tmpArgs.name);
        } catch (e) {
          return tmpArgs.name;
        }
      }
      return "";
    })(),
    passWord: tmpArgs.pwd,
    leaveUrl: "/off.html",
    role: parseInt(tmpArgs.role, 10),
    userEmail: (function () {
      try {
        return testTool.b64DecodeUnicode(tmpArgs.email);
      } catch (e) {
        return tmpArgs.email;
      }
    })(),
    tk: params.tk,
    lang: tmpArgs.lang,
    signature: tmpArgs.signature || "",
    china: tmpArgs.china === "1",
  };

  window.addEventListener('message', ({ data }) => {
    if (data?.type === "zoomLoginSuccess" && data?.zak && !params?.browser && !window.navigator.userAgent.includes("OBS")) {
      testTool.setCookie('zak', data?.zak)
      window.history.replaceState(null, null, `?${window.location.href.split('?')[1]}&zak=${data?.zak !== 'undefined' && data?.zak || testTool.getCookie('zak')}`)

      ZoomMtg.leaveMeeting({});
      fetch("http://localhost:3900/new-zoom-connection", {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ zoomUrl: `${window.location.href}&zak=${data?.zak !== 'undefined' && data?.zak || testTool.getCookie('zak')}` })
      }).then(() => {
        window.location.href = `https://zoom.us/j/${meetingConfig.meetingNumber}?pwd=${meetingConfig.passWord}#success`
      })

      return
    }

    // Remove the unecessary "leave site" confirmation
    window.onbeforeunload = null;
    window.onunload = null

    setTimeout(() => {
      document.querySelector('.login-btn')?.click()
      setTimeout(() => {
        if (data?.zak) {
          if (params.zak || testTool.getCookie('zak')) {
            // Simulate login
            window.postMessage({ type: 'zoomLoginSuccess', zak: params?.zak !== 'undefined' && params.zak || testTool.getCookie('zak') })
          }
        }
      }, 2000)
    }, 1000)
  })


  // a tool use debug mobile device
  if (testTool.isMobileDevice()) {
    vConsole = new VConsole();
  }
  console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));

  // it's option if you want to change the WebSDK dependency link resources. setZoomJSLib must be run at first
  // ZoomMtg.setZoomJSLib("https://source.zoom.us/2.11.0/lib", "/av"); // CDN version defaul
  if (meetingConfig.china)
    ZoomMtg.setZoomJSLib("https://jssdk.zoomus.cn/2.11.0/lib", "/av"); // china cdn option
  ZoomMtg.preLoadWasm();
  ZoomMtg.prepareJssdk();
  function beginJoin(signature) {
    ZoomMtg.init({
      leaveUrl: meetingConfig.leaveUrl,
      disableJoinAudio: ["simulator"].includes(params.mode) ? false : true,
      enableFullHD: true,
      isSupportQA: true,
      webEndpoint: meetingConfig.webEndpoint,
      disableCORP: !window.crossOriginIsolated, // default true
      // disablePreview: false, // default false
      externalLinkPage: './externalLinkPage.html',
      success: function () {
        console.log(meetingConfig);
        console.log("signature", signature);

        if (params.zak) {
          setTimeout(() => {
            window.postMessage({ type: 'zoomLoginSuccess', zak: params.zak })
          }, 1000)
        }

        ZoomMtg.i18n.load(meetingConfig.lang);
        ZoomMtg.i18n.reload(meetingConfig.lang);
        ZoomMtg.join({
          meetingNumber: meetingConfig.meetingNumber,
          userName: meetingConfig.userName,
          signature: signature,
          sdkKey: meetingConfig.sdkKey,
          userEmail: meetingConfig.userEmail,
          ...(meetingConfig?.tk && { tk: meetingConfig.tk }),
          passWord: meetingConfig.passWord,
          success: function (res) {
            if (!window.navigator.userAgent.includes("OBS") && !params?.browser) {
              ZoomMtg.leaveMeeting({});
              fetch("http://localhost:3900/new-zoom-connection", {
                method: 'POST',
                mode: 'cors',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ zoomUrl: `${window.location.href}&zak=${params?.zak !== 'undefined' && params.zak || testTool.getCookie('zak')}` })
              }).then(() => {
                window.location.href = `https://zoom.us/j/${meetingConfig.meetingNumber}?pwd=${meetingConfig.passWord}#success`
              })
            }

            console.log("join meeting success");
            console.log("get attendeelist");

            setInterval(
              () => {
                openSettings()

                openParticipantPanel()

                openChatPanel()

                maestro.tick()

                joinAsPanelist()
              },
              1000 // a good time for a thousand attends (10ms each)
            )
          },
          error: function (res) {
            console.log(res);
          },
        });
      },
      error: function (res) {
        console.log(res);
      },
    });

    ZoomMtg.inMeetingServiceListener('onUserJoin', function (data) {
      //console.log('inMeetingServiceListener onUserJoin', data);
    });

    ZoomMtg.inMeetingServiceListener('onUserLeave', function (data) {
      //console.log('inMeetingServiceListener onUserLeave', data);
    });

    ZoomMtg.inMeetingServiceListener('onUserIsInWaitingRoom', function (data) {
      //console.log('inMeetingServiceListener onUserIsInWaitingRoom', data);
    });

    ZoomMtg.inMeetingServiceListener('onMeetingStatus', function (data) {
      //console.log('inMeetingServiceListener onMeetingStatus', data);
    });
  }

  beginJoin(meetingConfig.signature);
};
