setTimeout(() => {
  document.getElementById('non_essential_fields').style.display = ''
}, 500)


window.addEventListener('DOMContentLoaded', function (event) {
  console.log('DOM fully loaded and parsed');
  websdkready();
});

let tk
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());

function websdkready() {
  var testTool = window.testTool;
  if (testTool.isMobileDevice()) {
    vConsole = new VConsole();
  }
  console.log("checkSystemRequirements");
  console.log(JSON.stringify(ZoomMtg.checkSystemRequirements()));

  // Generate a unique email for the webinar
  function generateRandomEmail() {
    // Generate a random 4-digit number
    var randomNumber = Math.floor(1000 + Math.random() * 9000);
    // Create the email with the random number
    return "backstage" + randomNumber + "@ew.com";
  }

  function updateMeetingEmail() {
    // Generate a random email
    var email = generateRandomEmail();
    // Find the element with ID 'meeting_email'
    var emailInput = document.getElementById('meeting_email');
    // Update the value of the element
    if (emailInput) {
      emailInput.value = email;
    } else {
      console.log("Element with ID 'meeting_email' not found.");
    }
  }

  updateMeetingEmail()

  // it's option if you want to change the WebSDK dependency link resources. setZoomJSLib must be run at first
  // if (!china) ZoomMtg.setZoomJSLib('https://source.zoom.us/2.11.0/lib', '/av'); // CDN version default
  // else ZoomMtg.setZoomJSLib('https://jssdk.zoomus.cn/2.11.0/lib', '/av'); // china cdn option
  // ZoomMtg.setZoomJSLib('http://localhost:9999/node_modules/@zoomus/websdk/dist/lib', '/av'); // Local version default, Angular Project change to use cdn version
  ZoomMtg.preLoadWasm(); // pre download wasm file to save time.

  var CLIENT_ID = "Ga0hiQmQ3eaCzLs4TT3vER22LAAi7xPLouKS";
  /**
   * NEVER PUT YOUR ACTUAL SDK SECRET OR CLIENT SECRET IN CLIENT SIDE CODE, THIS IS JUST FOR QUICK PROTOTYPING
   * The below generateSignature should be done server side as not to expose your SDK SECRET in public
   * You can find an example in here: https://developers.zoom.us/docs/meeting-sdk/auth/#signature
   */
  var CLIENT_SECRET = "TEBaxj5BTSTOCg8yq3yDSlSZqb2lyZrKxP1t";

  // some help code, remember mn, pwd, lang to cookie, and autofill.
  //document.getElementById("display_name").value =
  //  "CDN" +
  //  ZoomMtg.getWebSDKVersion()[0] +
  //  testTool.detectOS() +
  //  "#" +
  //  testTool.getBrowserInfo();
  document.getElementById('display_name').value =
    testTool.getCookie('display_name')

  //document.getElementById('roomId').value =
  //  testTool.getCookie('roomId')

  document.getElementById("meeting_number").value = testTool.getCookie(
    "meeting_number"
  );
  document.getElementById("meeting_pwd").value = testTool.getCookie(
    "meeting_pwd"
  );
  if (testTool.getCookie("meeting_lang"))
    document.getElementById("meeting_lang").value = testTool.getCookie(
      "meeting_lang"
    );

  document
    .getElementById("meeting_lang")
    .addEventListener("change", function (e) {
      testTool.setCookie(
        "meeting_lang",
        document.getElementById("meeting_lang").value
      );
      testTool.setCookie(
        "_zm_lang",
        document.getElementById("meeting_lang").value
      );
    });
  // copy zoom invite link to mn, autofill mn and pwd.
  document
    .getElementById('meeting_number')
    .addEventListener('input', function (e) {
      var tmpMn = e.target.value.replace(/([^0-9])+/i, '')
      if (tmpMn.match(/([0-9]{9,11})/)) {
        tmpMn = tmpMn.match(/([0-9]{9,11})/)[1]
      }
      var tmpPwd = e.target.value.match(/pwd=([\d,\w]+)/)
      if (tmpPwd) {
        document.getElementById('meeting_pwd').value = tmpPwd[1]
        testTool.setCookie('meeting_pwd', tmpPwd[1])
      }
      document.getElementById('meeting_number').value = tmpMn
      testTool.setCookie(
        'meeting_number',
        document.getElementById('meeting_number').value
      )
    })

  document
    .getElementById('meeting_link')
    .addEventListener('input', function (e) {
      const link = e.target.value.split('#')[0]

      tk = new URLSearchParams(link?.replace(/^.*\?/, '?')).get('tk')
      const pwd = new URLSearchParams(link?.replace(/^.*\?/, '?')).get('pwd')
      const meetingNumber = link.replace(/^.*zoom\.us.*\//, '').split('?')[0]

      console.log(pwd)
      document.getElementById('meeting_number').value = meetingNumber
      document.getElementById('meeting_pwd').value = pwd
    })

  document
    .getElementById('display_name')
    .addEventListener('input', function (e) {
      testTool.setCookie(
        'display_name',
        document.getElementById('display_name').value
      )
    })

  //document
  //  .getElementById('roomId')
  //  .addEventListener('input', function (e) {
  //    testTool.setCookie(
  //      'roomId',
  //      document.getElementById('roomId').value
  //    )
  //  })

  document.getElementById("clear_all").addEventListener("click", function (e) {
    testTool.deleteAllCookies();
    document.getElementById("display_name").value = "";
    document.getElementById("meeting_number").value = "";
    document.getElementById("meeting_pwd").value = "";
    document.getElementById("meeting_lang").value = "en-US";
    document.getElementById("meeting_role").value = 0;
    window.location.href = "/index.html";
  });

  const joinMeeting = () => {
    var meetingConfig = testTool.getMeetingConfig();
    if (!meetingConfig.mn || !meetingConfig.name) {
      alert("Meeting number or username is empty");
      return false;
    }

    meetingConfig.name = btoa(atob(meetingConfig.name) + " (Backstage)")

    testTool.setCookie("meeting_number", meetingConfig.mn);
    testTool.setCookie("meeting_pwd", meetingConfig.pwd);

    var signature = ZoomMtg.generateSDKSignature({
      meetingNumber: meetingConfig.mn,
      sdkKey: CLIENT_ID,
      sdkSecret: CLIENT_SECRET,
      role: meetingConfig.role,
      success: function (res) {
        console.log(res.result);
        meetingConfig.signature = res.result;
        meetingConfig.sdkKey = CLIENT_ID;

        if (tk) {
          meetingConfig.tk = tk
        }

        const file = /*['simulator', 'host'].includes(params?.mode) ? '/simulator.html?' :*/ '/meeting.html?'
        var joinUrl = file + testTool.serialize(meetingConfig) +
          `&${urlSearchParams.toString()}`
        console.log(joinUrl)

        // Remove the unecessary "leave site" confirmation
        window.onbeforeunload = null;
        window.onunload = null

        window.location.href = window.location.origin + joinUrl
      },
    });
  }

  // Automatically join meeting if params is filled
  if (params.meetingNumber) {
    document.getElementById('meeting_number').value = params.meetingNumber
    document.getElementById('meeting_pwd').value = params.pwd
    document.getElementById('display_name').value = params.name
    document.getElementById('roomId').value = params.roomId

    joinMeeting()
  }

  // click join meeting button
  document
    .getElementById("join_meeting")
    .addEventListener("click", function (e) {
      e.preventDefault();
      joinMeeting()
    });

  // click new chrome extension join meeting button
  document
    .getElementById("join_meeting_chrome_extension")
    .addEventListener("click", function (e) {
      e.preventDefault();
      //joinMeeting()
      const originalURL = document.getElementById('meeting_link_chrome_extension').value
      var match = originalURL.match(/[jws]\/(\d+)/);

      if (match) {
        var meetingNumber = match[1];

        var urlObj = new URL(originalURL);

        // Get the search parameters
        var searchParams = urlObj.searchParams;

        // Convert the search parameters to an object
        var { pwd, tk } = Object.fromEntries(searchParams.entries());

        // Create the new URL
        var newURL = `https://app.zoom.us/wc/join/${meetingNumber}?fromPWA=0&pwd=${pwd}${tk ? `&tk=${tk}` : ''}`;

        // Change the current location to the new URL
        window.location.href = newURL;
      } else {
        console.log("URL format is not recognized");
      }
    });

  function copyToClipboard(elementId) {
    var aux = document.createElement("input");
    aux.setAttribute("value", document.getElementById(elementId).getAttribute('link'));
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);
  }

  // click copy jon link button
  window.copyJoinLink = function (element) {
    var meetingConfig = testTool.getMeetingConfig();
    if (!meetingConfig.mn || !meetingConfig.name) {
      alert("Meeting number or username is empty");
      return false;
    }
    var signature = ZoomMtg.generateSDKSignature({
      meetingNumber: meetingConfig.mn,
      sdkKey: CLIENT_ID,
      sdkSecret: CLIENT_SECRET,
      role: meetingConfig.role,
      success: function (res) {
        console.log(res.result);
        meetingConfig.signature = res.result;
        meetingConfig.sdkKey = CLIENT_ID;
        var joinUrl =
          testTool.getCurrentDomain() +
          "/meeting.html?" +
          testTool.serialize(meetingConfig);
        document.getElementById('copy_link_value').setAttribute('link', joinUrl);
        copyToClipboard('copy_link_value');

      },
    });
  };

}
