const button = document.querySelector("#register");
button.addEventListener("click", function () {
  console.log("asking for permissions");
  chrome.runtime.sendMessage({ message: "login" }, function (response) {
      if (response === "success") {
        console.log("successfuly signed in user")
      }
  });
});

const logginButton = document.querySelector("#access-button");
logginButton.addEventListener("click", function () {
  console.log("asking for permissions");
  chrome.permissions.request({
    origins: ["<all_urls>"],
  }, function(granted) {
    if (granted) {
      console.log(`permmision granted: ${granted}`)
      button.classList.remove('main-button-disabled')
      button.classList.add('main-button')
      button.disabled = false
    } else {
      console.log(`no permission granted`)
    }
  });
});