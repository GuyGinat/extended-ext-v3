document.querySelector('#sign-in')
  .addEventListener('click', function () {
    console.log(`signing in to user`)
    chrome.runtime.sendMessage({ message: 'login' }, function
      (response) {
      if (response === 'success') window.close();
    });
  });

document.querySelector('button')
  .addEventListener('click', function () {
    chrome.runtime.sendMessage({ message: 'isUserSignedIn' },
      function (response) {
        console.log(response)
        alert(response);
      });
  });