document.getElementById("summarize").addEventListener("click", () => {
    const resultDiv = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;

    resultDiv.innerHTML = '<div class="loader"></div>';

    chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
        if (!geminiApiKey) {
            resultDiv.textContent = "No API key set. Click the gear icon to set one.";
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            if (!tab?.id) {
                resultDiv.textContent = "No active tab found.";
                return;
            }

            // Dynamically inject content.js
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            }, () => {
                if (chrome.runtime.lastError) {
                    resultDiv.textContent = "Injection error: " + chrome.runtime.lastError.message;
                    return;
                }

                // Message the now-injected content script
                chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (response) => {
                    if (chrome.runtime.lastError) {
                        resultDiv.textContent = "Content script error: " + chrome.runtime.lastError.message;
                        return;
                    }

                    const text = response?.text;
                    if (!text) {
                        resultDiv.textContent = "Couldn't extract text from this page.";
                        return;
                    }

                    try {
                        const summary = await getGeminiSummary(text, summaryType, geminiApiKey);
                        resultDiv.textContent = summary;
                    } catch (err) {
                        resultDiv.textContent = "Gemini error: " + err.message;
                    }
                });
            });
        });
    });
});

async function getGeminiSummary(rawText, type, apikey) {
    const max = 20000;
    const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;
    const promptMap = {
        brief: `Summarize in 2-3 sentences:\n\n${text}`,
        detailed: `Give a detailed summary:\n\n${text}`,
        bullets: `Summarize in 5-7 bullet points (start each line with "- "):\n\n${text}`
    };
    const prompt = promptMap[type] || promptMap.brief;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apikey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
        })
    });

    if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error?.message || "Request Failed");
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary.";
}

document.getElementById("copy-btn").addEventListener("click",()=>{
    const txt=document.getElementById("result").innerText;
    if(!txt)return;
    navigator.clipboard.writeText(txt).then(()=>{
        const btn=document.getElementById("copy-btn");
        const old=btn.textContent;
        btn.textContent="Copied!";
        setTimeout(()=>(btn.textContent=old),2000);
    })
})