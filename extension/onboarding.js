const button = document.querySelector('#access-button')
button.addEventListener('click', function () {
    console.log('asking for permissions')
    chrome.permissions.request({
        origins: ["<all_urls>"]
    });
});

const storageButton = document.querySelector('#storage-button')
storageButton.addEventListener('click', function () {
    chrome.storage.local.get(["blacklist"], ({ blacklist }) => {
        console.log(blacklist)
    })
});

const storageSaveButton = document.querySelector('#storage-save')
storageButton.addEventListener('click', function () {
    blacklist = {"blacklist": [1,2,4]}
    chrome.storage.local.set(blacklist)
});