chrome.runtime.onInstalled.addListener(()=>{
    chrome.storage.sync.get(["geminiApiKey"],(result)=>{
        if(!result.geminiApiKey){
            chrome.tabs.create({url:"options.html"});
        }
    }) //this sync synchronizes the data all over our accounts and sessions and we dont need to input again our geminikey 
})