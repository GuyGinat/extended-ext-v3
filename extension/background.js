/// <reference path="chrome.intellisense.js" />

getSignedIn().then((isSignedIn) => {
  if (isSignedIn) {
    chrome.action.setPopup({ popup: "./popup-signed-in.html" });
  } else {
    chrome.action.setPopup({ popup: "./popup.html" });
  }
});
chrome.runtime.onInstalled.addListener((r) => {
  if (r.reason === "install") {
    chrome.permissions.request({
        origins: ["<all_urls>"]
    });
    chrome.tabs.create({
      url: "onboarding-page.html",
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "login") {
    getSignedIn().then((isSignedIn) => {
      if (isSignedIn) {
        chrome.tabs.create({
        //   url: `http://localhost:8080/extension/${user_info.sub}`,
          url: `http://localhost:8080/home`,
        });
        return;
      } else {
        chrome.identity.launchWebAuthFlow(
          {
            url: create_auth_endpoint(),
            interactive: true,
          },
          function (redirect_url) {
            if (chrome.runtime.lastError) {
              // problem signing in
            } else {
              let id_token = redirect_url.substring(
                redirect_url.indexOf("id_token=") + 9
              );
              id_token = id_token.substring(0, id_token.indexOf("&"));
              const CLIENT_ID = encodeURIComponent(
                "715251039168-g59up2iovoge36g88ml0au5j1q9vcqhq.apps.googleusercontent.com"
              );
              const user_info = parseJwt(id_token);
              console.dir(user_info);
              if (
                (user_info.iss === "https://accounts.google.com" ||
                  user_info.iss === "accounts.google.com") &&
                user_info.aud === CLIENT_ID
              ) {
                console.log("User successfully signed in.");
                fetch("http://localhost:3001/users/extension-sign-in", {
                  method: "post",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    // 'Authorization': `Bearer ${token}`
                  },
                  // body: JSON.stringify({'userId': user_info.sub})
                  body: JSON.stringify({ user: user_info }),
                })
                  .then((response) => response.json())
                  .then((userSignedIn) => {
                    console.log(userSignedIn);
                    chrome.tabs.create({
                      url: `http://localhost:8080/extension/${user_info.sub}`,
                    });
                    // if (response.exte) {

                    // }
                  });
                sign_in();
                chrome.action.setPopup(
                  { popup: "./popup-signed-in.html" },
                  () => {
                    sendResponse("success");
                  }
                );
              } else {
                // invalid credentials
                console.log("Invalid credentials.");
              }
            }
          }
        );
        return true;
      }
    });
    return true;
  } else if (request.message === "logout") {
    console.log("signed out");
    sign_out();
    chrome.action.setPopup({ popup: "./popup.html" }, () => {
      sendResponse("success");
    });
    return true;
  } else if (request.message === "isUserSignedIn") {
    console.log("checking user status");
    getSignedIn().then((isSignedIn) => {
      let response = isSignedIn ? "Signed in" : "Not signed in";
      sendResponse(response);
    });
    return true;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }
  getLastTab().then((lastTab) => {
    if (lastTab !== tab.url) {
      console.log(`Switched to new tab ${tab.url}`);
      setLastTab(tab.url);

      isInBlacklist(tab.url).then((urlBlacklisted) => {
        if (urlBlacklisted) {
          console.log(`url: ${tab.url} is blacklisted`);
          return;
        } else {
          let isYouTube = validateYouTubeUrl(tab.url);
          if (isYouTube !== null) {
            getYouTubeData(tab);
          } else {
            getPageData(tab);
          }
        }
      });
    }
  });
});

chrome.omnibox.onInputEntered.addListener(function (text, suggest) {
  chrome.tabs.create({
    url: `http://localhost:8080/main?q=${text}`,
  });
});

function getYouTubeData(tab) {
  let ytId = getVideoId(tab.url);
  let concatedText = "";
  let title = tab.title + "";

  console.log(`getting yt captions for video id ${ytId}`);
  getSubtitles({ videoID: ytId }).then((captions) => {
    captions.map((cap) => {
      concatedText += " " + cap.text;
    });
    let payload = {
      id: ytId,
      rawText: concatedText,
      timedText: captions,
      title: title,
    };
    sendPage(payload, "yt");
  });
}

function getPageData(tab, tabId, windowId) {
  let title = tab.title + "";
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    function (tabs) {
      console.log("sending page data");
      chrome.tabs.sendMessage(
        tab.id,
        {
          functiontoInvoke: "getInnerText",
        },
        (res) => {
          if (!res.innerText) return;
          let text = res.innerText;
          let payload = {
            rawText: text,
            title: title,
            link: tab.url,
          };
          sendPage(payload, "history");
        }
      );
    }
  );
}

function sendPage(payload, suffix) {
  chrome.identity.getProfileUserInfo(
    { accountStatus: "ANY" },
    function (user_info) {
      payload["users"] = [
        {
          user_id: user_info.id,
          date: Date.now(),
        },
      ];
      console.log(user_info.id);
      fetch("http://localhost:3001/" + suffix, {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      })
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((err) => console.log(err));
    }
  );
}

// function sendPage(url) {
//     let time = Date.now()
//     chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
//         chrome.tabs.sendMessage(tabs[0].id, { request: "getPage" }, response => {
//             console.log(response)
//         })
//     })
// }

//Tab tracking related functions
function getLastTab() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["lastTab"], ({ lastTab }) => {
      resolve(lastTab);
    });
  });
}
function setLastTab(url) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ lastTab: url }, () => {
      resolve();
    });
  });
}

//User blacklist related functions
function isInBlacklist(url) {
  return new Promise((resolve) => {
    let replace = "regex";
    let re = new RegExp(replace, "g");
    let regex;
    getBlacklist().then((blacklist) => {
      for (let site of blacklist) {
        regex = "^((?:https?:)?//)?((?:www|m).)?(regex)/.*".replace(re, site);
        if (url.match(regex)) {
          resolve(true);
        }
      }
      resolve(false);
    });
  });
}
function getBlacklist() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["blacklist"], ({ blacklist }) => {
      if (!blacklist) {
        resolve([]);
      }
      resolve(blacklist);
    });
  });
}
function setBlacklist() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ blacklist: blacklist }, () => {
      resolve();
    });
  });
}

//User auth related functions

//Get user sign in status
function getSignedIn() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["user_signed_in"], ({ user_signed_in }) => {
      // console.log(`user signed in: ${user_signed_in}`)
      resolve(user_signed_in);
    });
  });
}
//Set user status in storage
function sign_in() {
  chrome.storage.local.set({ user_signed_in: true });
}
function sign_out() {
  chrome.storage.local.set({ user_signed_in: false });
}
//Creates an endpoint for the user to sign in through
function create_auth_endpoint() {
  const CLIENT_ID = encodeURIComponent(
    "715251039168-g59up2iovoge36g88ml0au5j1q9vcqhq.apps.googleusercontent.com"
  );
  const RESPONSE_TYPE = encodeURIComponent("id_token");
  const REDIRECT_URI = encodeURIComponent(
    "https://jccandmdlgjbgmfidbnlhfkjgkakhlil.chromiumapp.org/"
  );
  const SCOPE = encodeURIComponent(
    "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
  );
  const STATE = encodeURIComponent(
    "meet" + Math.random().toString(36).substring(2, 15)
  );
  const PROMPT = encodeURIComponent("consent");
  let nonce = encodeURIComponent(
    Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
  );

  let openId_endpoint_url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=${RESPONSE_TYPE}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&state=${STATE}&nonce=${nonce}&prompt=${PROMPT}`;

  return openId_endpoint_url;
}

//Youtube related functions

//Checks if a given url is a youtube one
function validateYouTubeUrl(url) {
  let regex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
  let res = url.match(regex);
  return res;
}
//Extracts the video id from YouTube url
function getVideoId(url) {
  if (!url.includes("watch?v=")) {
    return;
  }
  let video_id = url.split("v=")[1];
  let ampersandPosition = video_id.indexOf("&");
  if (ampersandPosition != -1) {
    video_id = video_id.substring(0, ampersandPosition);
    return video_id;
  } else {
    return video_id;
  }
}
//Returns the subtitles of a given Youtube video
function getSubtitles(videoID) {
  return new Promise((resolve, reject) => {
    let lang = "en";
    fetch(`https://youtube.com/get_video_info?video_id=${videoID.videoID}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
      .then((response) => response.text())
      .then((data) => {
        const decodedData = decodeURIComponent(data);
        // * ensure we have access to captions data
        if (!decodedData.includes("captionTracks")) {
          // throw new Error(`Could not find captions for video: ${videoID}`);
          reject(`Could not find captions for video: ${videoID}`);
        }

        const regex = /({"captionTracks":.*isTranslatable":(true|false)}])/;
        const [match] = regex.exec(decodedData);
        const { captionTracks } = JSON.parse(`${match}}`);

        const subtitle =
          captionTracks.find((o) => (o.vssId = `.${lang}`)) ||
          captionTracks.find((o) => (o.vssId = `a.${lang}`)) ||
          captionTracks.find(({ vssId }) => vssId?.match(`.${lang}`));

        // * ensure we have found the correct subtitle lang
        if (!subtitle || (subtitle && !subtitle.baseUrl))
          reject(`Could not find ${lang} captions for ${videoID}`);

        // resolve('asd')

        fetch(subtitle.baseUrl, {
          method: "GET",
        })
          .then((response) => response.text())
          .then((transcript) => {
            const lines = transcript
              .replace(
                '<?xml version="1.0" encoding="utf-8" ?><transcript>',
                ""
              )
              .replace("</transcript>", "")
              .split("</text>")
              .filter((line) => line && line.trim())
              .map((line) => {
                const startRegex = /start="([\d.]+)"/;
                const durRegex = /dur="([\d.]+)"/;

                const [, start] = startRegex.exec(line);
                const [, dur] = durRegex.exec(line);

                const htmlText = line
                  .replace(/<text.+>/, "")
                  .replace(/&amp;/gi, "&")
                  .replace(/<\/?[^>]+(>|$)/g, "");

                const text = decodeHtml(htmlText);
                return {
                  start,
                  dur,
                  text,
                };
              });
            resolve(lines);
          });
      });
  });
}

//Utility functions

//Utility fot parsing jwt
function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map(function (c) {
        return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join("")
  );

  return JSON.parse(jsonPayload);
}
//Utility for decoding html texts
function decodeHtml(html) {
  return html.replace(/&#(\d+);/g, function (match, dec) {
    return String.fromCharCode(dec);
  });
}

function sanitizeHTML(str) {
  return str.replace(/javascript:/gi, "").replace(/[^\w-_. ]/gi, function (c) {
    return `&#${c.charCodeAt(0)};`;
  });
}
