chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // return Promise.resolve('HEY!')
  if (request.functiontoInvoke == "getInnerText") {
    if (!document) {
      sendResponse({
        err: true,
        message: "could not find document",
      });
    }
    let innerText = document.querySelector("body").innerText;
    sendResponse({
      err: false,
      innerText: innerText,
      message: "Succesfully sent innerText",
    });
  } else {
    sendResponse({
      err: true,
      message: `could not recognize function requested ${request.functiontoInvoke}`,
    });
  }
});
