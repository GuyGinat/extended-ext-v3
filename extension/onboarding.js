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
button.addEventListener("click", function () {
  console.log("asking for permissions");
  chrome.permissions.request({
    origins: ["<all_urls>"],
  });
});