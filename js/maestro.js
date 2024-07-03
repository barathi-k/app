const isLogging = true

const whenRaisedHandById = {}

const showSpeakerView = utils.debounce(() => {
  document.querySelector(".meeting-client").classList.remove("blackout")
})

const getFakeParticipants = () => {
  return Object.values(state.attendeesById).filter(
    (participant) => participant.userName[0] === "_" && !participant.isHold
  );
};

const isSimulatorUp = () => {
  //const isHostHost = Object.values(state.attendeesById).filter(
  //  (participant) => participant.isHost
  //)?.[0]?.userName === 'Host';

  const areFakeParticipantsUp = getFakeParticipants()?.length >= 19

  return /*isHostHost && */areFakeParticipantsUp
};

function setNativeValue(el, value) {
  const previousValue = el.value;

  if (el.type === 'checkbox' || el.type === 'radio') {
    if ((!!value && !el.checked) || (!!!value && el.checked)) {
      el.click();
    }
  } else el.value = value;

  const tracker = el._valueTracker;
  if (tracker) {
    tracker.setValue(previousValue);
  }

  // 'change' instead of 'input', see https://github.com/facebook/react/issues/11488#issuecomment-381590324
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

let isPerformingAction = false

const finishPerformAction = utils.debounce(() => {
  isPerformingAction = false
}, 1500)

const hideSpeakerView = () => {
  document.querySelector(".meeting-client").classList.add("blackout")
  setTimeout(() => {
    showSpeakerView()
  }, 1600)
}

const mouseoverEvent = new MouseEvent("mouseover", {
  view: window,
  bubbles: true,
  cancelable: true,
});

const mouseoutEvent = new MouseEvent("mouseout", {
  view: window,
  bubbles: true,
  cancelable: true,
});

let cachedState

const state = {
  attendeesList: [],
  chatHistory: "test",
  autoPinOn: true,
  lastMessageByUser: {},
}

const turnOnFakeCamera = () => {
  const activateObsCamera = () => {
    document.querySelector("[arialabel='start sending my video']")?.click()
    document.querySelector("[aria-label~='OBS'")?.click()
  }

  // Try tunring on multiple times
  setTimeout(() => {
    activateObsCamera()
  }, 2000)

  setTimeout(() => {
    activateObsCamera()
  }, 6000)

  setTimeout(() => {
    activateObsCamera()
  }, 12000)
}

let reconnectionTimeInterval;

function connect() {
  const ws = new WebSocket("ws://127.0.0.1:8999");
  let syncStatetimeInterval;
  let lastSyncUpdate = (new Date).getTime()
  const updateMaestroState = utils.debounce(() => {
    // INFO: If attendeesById is not ready it will break the world
    if (!state.attendeesById) { return }
    ws.send(JSON.stringify({ state: { ...state, roomId } }));
  }, 50);

  ws.onopen = function () {
    clearTimeout(reconnectionTimeInterval);

    ws.send("Hello from meeting.js");

    syncStatetimeInterval = setInterval(() => {
      const newStateCache = JSON.stringify(state);
      if (newStateCache !== cachedState || (new Date).getTime() - lastSyncUpdate > 2000) {
        lastSyncUpdate = (new Date).getTime()
        updateMaestroState();
        isLogging && console.log("Synced Maestro");
        cachedState = newStateCache;
      }
    }, 500);
  }

  ws.onmessage = function (evt) {
    const data = JSON.parse(evt.data);

    // Ignore reaction messages because it is not for this client
    if (data?.reactions) {
      return;
    }

    isLogging && console.log(`--- ws message:`, evt.data);

    isLogging && console.log({ action: data.action, data });

    maestro?.[data?.action]?.(data);
  };

  ws.onclose = function (e) {
    clearTimeout(syncStatetimeInterval);
    isLogging &&
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
    reconnectionTimeInterval = setTimeout(function () {
      connect();
    }, 500);
  };

  ws.onerror = function (err) {
    console.error("Socket encountered error: ", err, "Closing socket");
    ws.close();
  };
}

connect();



const pressParticipantDropdownButton = (item) => {
  Array.from(document.querySelectorAll(".new-dropdown-menu .zmu-portal-dropdown__menu-item-button")).filter(button => button.textContent === item)?.[0]?.click()
  utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
}

let internal

const getDomParticipantsMenuDisplayNames = () => document.querySelectorAll(".participants-item__display-name")
const getDomSearch = () => document.querySelector('.participants-search-box__input')
const getDomParticipants = () => document.querySelectorAll('.participants-item-position')

const pressMenuForName = (args) => {
  isLogging && console.log("pressMenuForName", args)

  const { name, menu } = args

  const participants = Array.from(getDomParticipantsMenuDisplayNames())
    .filter(participant => participant.textContent === name)

  if (participants.length === 0) {
    utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
    throw Error("No participants found")
  } else if (participants.length > 1) {
    console.log(`Performing same action in ${participants.length} participants with name ${name}`)
  }

  console.log(participants)
}

const tick = () => {
  const dom = document.querySelector('.video-share-layout')
  if (!dom) { return }
  const key = Object.keys(dom).find(key=>key.startsWith("__reactInternalInstance$"))
  internal = dom[key].alternate.return.alternate.return.alternate.memoizedProps.value.store.getState()
  state.attendeesList = internal.attendeesList.attendeesList
  state.attendeesById = state.attendeesList.reduce((acc, attendee) => {
    const user = {
      ...attendee,
      userName: attendee.displayName,
      isCoHost: attendee.bCoHost,
      isHold: attendee.bHold,
      avatarUrl: attendee.avatar,
      hasUnmuteConsent: false,
      isVideoOn: attendee.bVideoOn,
      isRaisingHand: attendee.bRaiseHand,
      isSpotlighted: state?.spotlightVideoList?.includes(attendee?.userId)
    }

    if (user.isRaisingHand === true && !whenRaisedHandById[user?.userId]) {
      whenRaisedHandById[user?.userId] = new Date().getTime()
      user.whenRaisedHand = whenRaisedHandById[user?.userId]
    } else if (!user.isRaisingHand)  {
      whenRaisedHandById[user?.userId] = undefined
    } else {
      user.whenRaisedHand = whenRaisedHandById[user?.userId]
    }

    acc[attendee?.userId] = user

    return acc
  }, {})
  state.quality = internal?.settings?.qos?.video?.decode

  // Check the number of Attendents in a webinar that are not panelist and add to state
  if (document.querySelector('div[aria-label^="Attendees"]')) {
    state.viewOnly = parseInt(document.querySelector('div[aria-label^="Attendees"]').textContent.match(/\((\d+)\)/)[1])
  }

  state.reactions = Object.values(internal.reaction.receivedReactions)
    .filter(reaction => !reaction.isExpired)
    .map(reaction => `<img src="${internal.reaction.allEmojiSet[reaction.unicode]}" />`)
  state.spotlightVideoList = internal.video.spotlightVideoList
  state.pinVideoList = internal.video.pinVideoList
  state.isVideoRenderingPaused =
    document.querySelectorAll(".video-avatar__avatar").length === 0;

  state.hasPinOnScreen = maestro.hasPin()


  state.speakerViewList = internal
    .video
    .currentSpeakerActiveVideo
    .map(entry => entry.user.displayName)

  state.isWaitingRoomEnabled = !!document.querySelector(
    "[aria-label*='Enable Waiting Room selected']"
  );

  state.isFocusModeEnabled = !!document.querySelector(
    "[aria-label*='Stop Focus Mode']"
  );
  state.isUnmutePermissionEnabled = !!document.querySelector(
    "[aria-label*='Allow participants to unmute themselves unselect']"
  );

  const speakerViewPageInfo = document.querySelector(".speaker-active-container__pagination")?.textContent.split("/")

  state.attendeesWithCameraOn = internal.attendeesList.attendeesList.filter(attendee => attendee.bVideoOn)?.length

  // Close modals
  const modalPrimaryButton = document.querySelector('.zm-modal .zm-btn--primary')
  const modalSecondaryButton = document.querySelector('.zm-modal .zm-btn--default')

  // Simulator stuff
  if (["simulator", "host"].includes(params.mode)) {
    document.querySelector("[aria-label='Stop Incoming Video']")?.click()

    //setInterval(() => {
    //  // Lower all hands
    //  Array.from(document.querySelectorAll('[aria-labelledby="particioantHostDropdown"] a[role=menuitem]')).filter(a => a.textContent.includes('Lower'))[0].click()
    //}, 300000)

    const primaryBtnText = modalPrimaryButton?.textContent;
    if (["Yes", "Got it", "Start My Video", "Unmute", "Join", "Main Session"].includes(primaryBtnText)) {
      modalPrimaryButton?.click();
      setTimeout(turnOnFakeCamera, 1000);
    } else if (primaryBtnText === "Retry") {
      const queryParams = new URLSearchParams({
        meetingNumber: params.meetingNumber,
        pwd: params.pwd,
        name: params.name,
        mode: params.mode,
        browser: true
      });
      window.location.href = `${window.location.origin}/index.html?${queryParams}`;
    } else if (modalSecondaryButton?.textContent === "Later") {
      modalSecondaryButton?.click();
    }
    // Give co-host to everyone but bots
    setTimeout(() => {
      maestro.makeEveryoneCohost()
    }, 5000)


    setTimeout(() => {
      // Turn off camera
      if (params?.disableCamera === "true") {
        document.querySelector('[title="Stop Video"]')?.click()
      }
    }, 500)

    // Disable waiting room
    document
      .querySelector("[aria-label*='Enable Waiting Room selected']")
      ?.click();

    // Disable focus mode
    document.querySelector("[aria-label*='Stop Focus Mode']")?.click();

    if (params?.mode === "simulator") {
      const claimHostButton = Array.from(document.querySelector('.window-content-bottom')?.querySelectorAll('.btn-default') || [])?.find(button => button.textContent === 'Claim Host')
      if (claimHostButton) {
        claimHostButton.click();
        setNativeValue(document.getElementById('hostkey'), params.hk);
        document.querySelector('.dialog-claimhost-container__button').click()
      }

      if (isSimulatorUp() && document.querySelector('.participants-item-position').textContent.includes("Host, Me")) {
        fetch('/ping')
      }
    }
  }

  // Hide selfview
  const firstVideoMenu = document.querySelector('.speaker-bar-container__video-frame')
  if (firstVideoMenu) {
    firstVideoMenu.dispatchEvent(mouseoverEvent)
    Array.from(
      firstVideoMenu.querySelectorAll("[role=menuitem]")
    )?.find((menuItem) => menuItem.textContent === "Hide Self View")?.click();
    firstVideoMenu.dispatchEvent(mouseoutEvent)
    setTimeout(() => {
      firstVideoMenu.dispatchEvent(mouseoutEvent)
    }, 200)
  }
}


const maestro = {
  toggleUnmutePermission: ({ previousToggleState }) => {
    if (previousToggleState === 0) {
      document
        .querySelector(
          "[aria-label*='Allow participants to unmute themselves unselect']"
        )
        .click();
    } else if (previousToggleState === 1) {
      document
        .querySelector(
          "[aria-label*='Allow participants to unmute themselves selected']"
        )
        .click();
    }
  },
  resetWordCloud: () => {
    state.chatHistory = ""
    state.lastMessageByUser = {}
  },
  hasPin: () => {
    return !!Array.from(document.querySelectorAll('button'))?.find(button => button.textContent === 'Remove Pin')
      || !!document.querySelector('[aria-label="Remove All Pins"]')
  },
  clearPins: () => {
    hideSpeakerView()

    setTimeout(() => {
    Array.from(document.querySelectorAll('button'))?.find(button => button.textContent === 'Remove Pin')?.click()
    document.querySelector('[aria-label="Remove All Pins"]')?.click()
    }, 300)
  },
  hasSpotlight: () => {
    return !!Array.from(document.querySelectorAll('button'))?.find(button => button.textContent === 'Remove Spotlight')
      || !!document.querySelector('[aria-label="Remove All Spotlights"]')
  },
  clearSpotlights: () => {
    Array.from(document.querySelectorAll('button'))?.find(button => button.textContent === 'Remove Spotlight')?.click()
    document.querySelector('[aria-label="Remove All Spotlights"]')?.click()
  },
  unmuteSpeakerView: () => {
    isPerformingAction = true
    try {
      setTimeout(() => {
        const iterationSpeed = 150
        state?.speakerViewList?.forEach((displayName, i) => {
          setTimeout(() => {
            let attendeeDom

            if (getDomSearch()) {
              utils.triggerInputChange(getDomSearch(), displayName)
              attendeeDom = Array.from(getDomParticipants())?.find(dom => !dom.textContent.includes("(Backstage)"))
            } else {
              attendeeDom = Array.from(getDomParticipants())?.find(dom => dom.textContent.includes(displayName) && !dom.textContent.includes("(Backstage)"))
            }

            if (!attendeeDom) {
              return
            }

            attendeeDom?.children[0]?.dispatchEvent(mouseoverEvent);

            setTimeout(() => {
              let unmute
              if (displayName.startsWith("_")) {
                unmute = Array.from(attendeeDom.getElementsByTagName('button')).find(button => button.textContent === 'Ask to Unmute');
                unmute?.click()
              } else {
                unmute = Array.from(attendeeDom.getElementsByTagName('button')).find(button => button.textContent === 'Unmute');
                unmute?.click()
              }
              finishPerformAction()
            }, 100)
          }, i * iterationSpeed)
        })
      }, 200)

      // clear search box
      setTimeout(() => {
        utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
        finishPerformAction()
      }, iterationSpeed * state?.attendeesList?.length + iterationSpeed)
    } catch (e) {
      console.log(e.message)
      finishPerformAction()
    }
  },
  muteAll: () => {
    isPerformingAction = true
    try {
      setTimeout(() => {
        const iterationSpeed = 150
        state?.attendeesList?.forEach(({ displayName }, i) => {
          setTimeout(() => {
            let attendeeDom

            if (getDomSearch()) {
              utils.triggerInputChange(getDomSearch(), displayName)
              attendeeDom = Array.from(getDomParticipants())?.find(dom => !dom.textContent.includes("(Backstage)") && !dom.textContent.includes("(Co-host)") && !dom.textContent.includes("(Host)"))
            } else {
              attendeeDom = Array.from(getDomParticipants())?.find(dom => dom.textContent.includes(displayName) && !dom.textContent.includes("(Backstage)") && !dom.textContent.includes("(Co-host)") && !dom.textContent.includes("(Host)"))
            }

            if (!attendeeDom) {
              return
            }

            attendeeDom?.children[0]?.dispatchEvent(mouseoverEvent);

            setTimeout(() => {
              let unmute
              unmute = Array.from(attendeeDom.getElementsByTagName('button')).find(button => button.textContent === 'Mute');
              unmute?.click()
              finishPerformAction()
            }, 100)
          }, i * iterationSpeed)
        })
      }, 200)

      // clear search box
      setTimeout(() => {
        utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
        finishPerformAction()
      }, iterationSpeed * state?.attendeesList?.length + iterationSpeed)
    } catch (e) {
      console.log(e.message)
      finishPerformAction()
    }
  },
  leaveCall: () => {
    document.querySelector('.footer__leave-btn').click()
    document.querySelector('.leave-meeting-options__btn').click()
  },
  refresh: () => {
    document.location.reload()
  },
  partialUnmute: () => {
    isPerformingAction = true
    try {
      setTimeout(() => {
        const iterationSpeed = 150
        state?.attendeesList?.forEach(({ displayName }, i) => {
          setTimeout(() => {
            let attendeeDom

            if (getDomSearch()) {
              utils.triggerInputChange(getDomSearch(), displayName)
              attendeeDom = Array.from(getDomParticipants())?.find(dom => !dom.textContent.includes("(Backstage)") && !dom.textContent.includes("(Co-host)") && !dom.textContent.includes("(Host)"))
            } else {
              attendeeDom = Array.from(getDomParticipants())?.find(dom => dom.textContent.includes(displayName) && !dom.textContent.includes("(Backstage)") && !dom.textContent.includes("(Co-host)") && !dom.textContent.includes("(Host)"))
            }

            if (!attendeeDom) {
              return
            }

            attendeeDom?.children[0]?.dispatchEvent(mouseoverEvent);

            setTimeout(() => {
              let unmute
              if (displayName.startsWith("_")) {
                unmute = Array.from(attendeeDom.getElementsByTagName('button')).find(button => button.textContent === 'Ask to Unmute');
                unmute?.click()
              } else {
                unmute = Array.from(attendeeDom.getElementsByTagName('button')).find(button => button.textContent === 'Unmute');
                unmute?.click()
              }
              finishPerformAction()
            }, 100)
          }, i * iterationSpeed)
        })
      }, 200)

      // clear search box
      setTimeout(() => {
        utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
        finishPerformAction()
      }, iterationSpeed * state?.attendeesList?.length + iterationSpeed)
    } catch (e) {
      console.log(e.message)
      finishPerformAction()
    }
  },
  makeEveryoneCohost: () => {
    if (isPerformingAction) { return }
    isPerformingAction = true
    try {
    setTimeout(() => {
      const iterationSpeed = 300
      state?.attendeesList?.forEach(({ displayName }, i) => {
        setTimeout(() => {
          let attendeeDom

          const patota = ['Nardi', 'Felippe', 'Alan', 'Pedro', 'Marriott'];

          if (params.patota === "true" && !patota.some(name => displayName.includes(name))) {
            return
          }

          if (getDomSearch()) {
            utils.triggerInputChange(getDomSearch(), displayName)
            attendeeDom = Array.from(getDomParticipants())
              ?.filter(dom => !dom?.textContent?.includes("Co-host"))
              .filter(dom => !dom?.textContent?.startsWith("_"))
              .find(dom => dom.textContent.includes(displayName))
          } else {
            attendeeDom = Array.from(getDomParticipants())
              ?.filter(dom => !dom?.textContent?.includes("Co-host"))
              .filter(dom => !dom?.textContent?.startsWith("_"))
              .find(dom => dom.textContent.includes(displayName))
          }

          if (!attendeeDom) {
            return
          }

          attendeeDom?.children[0]?.dispatchEvent(mouseoverEvent);

          setTimeout(() => {
            const menu = attendeeDom.querySelector("[title='More']");

            menu.click()

            setTimeout(() => {
              pressParticipantDropdownButton('Make Co-Host')
            }, 90)
          }, 100)
        }, i * iterationSpeed)
      })

      // clear search box
      setTimeout(() => {
        utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
        finishPerformAction()
      }, iterationSpeed * state?.attendeesList?.length + iterationSpeed)

    }, 200)
    } catch (e) {
      console.log(e.message)
      finishPerformAction()
    }
  },
  toggleFakeParticipantsCameras: () => {
    isPerformingAction = true
    try {
    setTimeout(() => {
      const iterationSpeed = 250
      state?.attendeesList?.forEach(({ displayName }, i) => {
        setTimeout(() => {
          let attendeeDom

          if (getDomSearch()) {
            utils.triggerInputChange(getDomSearch(), displayName)
            attendeeDom = Array.from(getDomParticipants())?.find(dom => dom.textContent.startsWith("_"))
          } else {
            attendeeDom = Array.from(getDomParticipants())?.find(dom => dom.textContent.includes(displayName) && dom.textContent.startsWith("_"))
          }

          if (!attendeeDom) {
            return
          }

          attendeeDom?.children[0]?.dispatchEvent(mouseoverEvent);

          setTimeout(() => {
            const menu = attendeeDom.querySelector("[title='More']");

            menu.click()

            setTimeout(() => {
              pressParticipantDropdownButton('Stop Video')
            }, 90)
          }, 100)
        }, i * iterationSpeed)
      })

      // clear search box
      setTimeout(() => {
        utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
        finishPerformAction()
      }, iterationSpeed * state?.attendeesList?.length + iterationSpeed)

    }, 200)
    } catch (e) {
      console.log(e.message)
      finishPerformAction()
    }
  },
  requestCameras: () => {
    isPerformingAction = true
    try {
    setTimeout(() => {
      const iterationSpeed = 250
      state?.attendeesList?.forEach(({ displayName }, i) => {
        setTimeout(() => {
          let attendeeDom

          if (getDomSearch()) {
            utils.triggerInputChange(getDomSearch(), displayName)
            attendeeDom = Array.from(getDomParticipants())?.find(dom => !dom.textContent.includes("(Backstage)") && !dom.textContent.includes("(Co-host)") && !dom.textContent.includes("(Host)"))
          } else {
            attendeeDom = Array.from(getDomParticipants())?.find(dom => dom.textContent.includes(displayName) && !dom.textContent.includes("(Backstage)") && !dom.textContent.includes("(Co-host)") && !dom.textContent.includes("(Host)"))
          }

          if (!attendeeDom) {
            return
          }

          attendeeDom?.children[0]?.dispatchEvent(mouseoverEvent);

          setTimeout(() => {
            const menu = attendeeDom.querySelector("[title='More']");

            menu.click()

            setTimeout(() => {
              pressParticipantDropdownButton('Ask For Start Video')
            }, 90)
          }, 100)
        }, i * iterationSpeed)
      })

      // clear search box
      setTimeout(() => {
        utils.triggerInputChange(document.querySelector('.participants-search-box__input'), "")
        finishPerformAction()
      }, iterationSpeed * state?.attendeesList?.length + iterationSpeed)

    }, 200)
    } catch (e) {
      console.log(e.message)
      finishPerformAction()
    }
  },
  addSpotlightByName: (args) => {
    isPerformingAction = true
    isLogging && console.log("addSpotlightByName", args)

    const { name, skipFirstDelay, mode } = args

    const userId = state.attendeesList.find(participant => participant.displayName.includes(name) && !participant.displayName.includes("(Backstage)")).userId
    ZoomMtg.operateSpotlight({ userId, operate: mode || 'add' })
  },
  removeSpotlightByName: (args) => {
    isPerformingAction = true
    isLogging && console.log("addSpotlightByName", args)

    const { name, skipFirstDelay, mode } = args

    const userId = state.attendeesList.find(participant => participant.displayName.includes(name) && !participant.displayName.includes("(Backstage)")).userId
    ZoomMtg.operateSpotlight({ userId, operate: 'remove' })
  },
  spotlightPinned: (args) => {
    const { selectedAttendees } = args
    const attendees = [...state.pinVideoList.map(id => state.attendeesById[id]?.displayName), ...selectedAttendees]

    maestro.spotlightSelection({ selectedAttendees: attendees })
  },
  spotlightSelection: (args) => {
    // Remove pins before adding spotlight so there is no bug
    const removePinButtton = document.querySelector('.video-avatar__group.video-opt-buttons-container button')
    if (removePinButtton && removePinButtton.textContent === 'Remove Pin') {
      removePinButtton.click()
    }
    document.querySelector('[aria-label="Remove All Pins"]')?.click()


    const { selectedAttendees, skipFirstDelay, mode } = args
    if (selectedAttendees?.length === 0) {
      return maestro.clearSpotlights()
    }

    const spotlightList = state.spotlightVideoList.map(id => state?.attendeesById?.[id]?.displayName)

    const attendeesToRemove = spotlightList.filter(name => {
      return !selectedAttendees.includes(name)
    })

    const attendeesToAdd = selectedAttendees.filter(name => {
      return !spotlightList.includes(name)
    })

    let forceReplace

    if (spotlightList.length == 1 && attendeesToRemove.length === 1 && attendeesToAdd.length === 1) {
      forceReplace = true
    }

    if (forceReplace || mode === 'replace') {
      setTimeout(() => {
        maestro.addSpotlightByName({ name: selectedAttendees[0] , mode: 'replace'})
      }, 200)
    } else {
      setTimeout(() => {
        attendeesToAdd.forEach((name, i) => {
          setTimeout(() => {
            maestro.addSpotlightByName({ name, skipFirstDelay: true })
          }, i * 400)
        })
      }, 200)

      setTimeout(() => {
        attendeesToRemove.forEach((name, i) => {
          setTimeout(() => {
            maestro.removeSpotlightByName({ name })
          }, i * 800)
        })
      }, 300 + attendeesToAdd.length * 400 + 200)
    }

    document.querySelectorAll('.zm-modal-legacy .zm-btn--primary').forEach(modal => modal.click())
  },
  tick,
  removeAllPins: () => {
    Array.from(document.querySelectorAll('button'))?.find(button => button.textContent === 'Remove Pin')?.click()

    document.querySelector('[aria-label="Remove All Pins"]')?.click()
  },
  removePinByName: (args) => {
    isPerformingAction = true
    isLogging && console.log("removePinByName", args)

    const { name, skipFirstDelay } = args

    const userId = state.attendeesList.find(participant => participant.displayName.includes(name) && !participant.displayName.includes("(Backstage)")).userId
    ZoomMtg.operatePin({ userId, operate: 'remove' })
  },
  chatMessage: (args) => {
    const { name, message, avatarUrl } = args

	  const body = {
	    "chatname": name,
	    "chatmessage": message,
	    "chatimg": avatarUrl
	  }

	  let encoded = JSON.stringify(body);
	  encoded = encodeURIComponent(encoded)

	  fetch(`https://api.vdo.ninja/${roomId}/content2/null/${encoded}`);
  },
  clearMessage: () => {
	  fetch(`https://api.vdo.ninja/${roomId}/clearOverlay`);
  },
  nextMessage: () => {
    fetch(`https://api.vdo.ninja/${roomId}/nextInQueue`);
  },
  autoMessage: () => {
    fetch(`https://api.vdo.ninja/${roomId}/autoShow/null/toggle`);
  },
  autoPinToggle: () => {
    state.autoPinOn = !state.autoPinOn
  },
  replacePin: utils.debounce((args) => {
    const { attendeeName: name } = args
    const userId = state.attendeesList.find(participant => participant.displayName.includes(name) && !participant.displayName.includes("(Backstage)")).userId
    ZoomMtg.operatePin({ userId, operate: 'replace' })
    //maestro.addPinByName({ name, mode: 'replace'})
  }, 500),
  addPinByName: (args) => {
    isPerformingAction = true
    isLogging && console.log("addPinByName", args)

    const { name, skipFirstDelay, mode } = args

    if (state.pinVideoList?.length === 4 && mode !== 'replace') {
      throw Error("Maximum number of 4 pinned participants reached")
    }

    const userId = state.attendeesList.find(participant => participant.displayName.includes(name) && !participant.displayName.includes("(Backstage)")).userId
    ZoomMtg.operatePin({ userId, operate: mode || 'add' })
  },
  pinSelection: (args) => {
    const { selectedAttendees, skipFirstDelay, mode } = args
    if (selectedAttendees?.length === 0) {
      return maestro.clearPins()
    }

    // If replacing someone that is already pinned, clear pin first and continue
    if (selectedAttendees?.length === 1 && state.pinVideoList.find(id => state.attendeesById[id].userName === selectedAttendees[0])) {
      maestro.clearPins()
    }

    let pinList = state.pinVideoList.map(id => state?.attendeesById?.[id]?.displayName)

    const shouldIgnoreSpeakerViewParticipant = state.pinVideoList.length === 0 && state.speakerViewList.length === 1

    const attendeesToRemove = pinList.filter(name => {
      return !selectedAttendees.includes(name)
    })

    const attendeesToAdd = selectedAttendees
      .filter(name => {
        return !pinList.includes(name)
      })
      .filter(name => {
        if (shouldIgnoreSpeakerViewParticipant && state.speakerViewList?.[0] === name) {
          return false
        }
        return true
      })

    if (mode === 'replace') {
      setTimeout(() => {
        maestro.addPinByName({ name: selectedAttendees[0] , mode: 'replace'})
      }, 200)
    } else {
      setTimeout(() => {
        attendeesToAdd.forEach((name, i) => {
          setTimeout(() => {
            maestro.addPinByName({ name, skipFirstDelay: true })
          }, i * 400)
        })
      }, 200)

      setTimeout(() => {
        attendeesToRemove.forEach((name, i) => {
          setTimeout(() => {
            maestro.removePinByName({ name })
          }, i * 800)
        })
      }, 300 + attendeesToAdd.length * 400 + 200)
    }
  }
}

window.maestro = maestro
