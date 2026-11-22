/* CS Bot AI — widget chat. Semua teks dirender pakai textContent (aman dari XSS). */
(function () {
    const fab = document.getElementById('fabChat');
    const panel = document.getElementById('chatPanel');
    if (!fab || !panel) return;
    const body = document.getElementById('chatBody');
    const form = document.getElementById('chatForm');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const closeBtn = document.getElementById('chatClose');
    const COOLDOWN_MS = 2500;
    let busy = false, lastSent = 0, greeted = false;
    const hist = [];

    function scrollDown() { body.scrollTop = body.scrollHeight; }

    function addMsg(text, who) {
        const el = document.createElement('div');
        el.className = 'chat-msg ' + who;
        el.textContent = text;
        body.appendChild(el);
        scrollDown();
    }

    function waLink() {
        const wa = document.getElementById('fabWa');
        const href = wa && wa.getAttribute('href');
        return href && href !== '#' ? href : '';
    }

    function addWaButton() {
        const href = waLink();
        if (!href) return;
        const a = document.createElement('a');
        a.className = 'chat-wa-btn';
        a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = 'Chat WhatsApp admin';
        body.appendChild(a);
        scrollDown();
    }

    function addChips() {
        const box = document.createElement('div');
        box.className = 'chat-chips';
        ['Daftar produk dan harga', 'Cara order', 'Metode pembayaran'].forEach(function (t) {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'chat-chip'; b.textContent = t;
            b.addEventListener('click', function () { box.remove(); send(t); });
            box.appendChild(b);
        });
        body.appendChild(box);
    }

    function setTyping(on) {
        let t = document.getElementById('chatTyping');
        if (on && !t) {
            t = document.createElement('div');
            t.id = 'chatTyping'; t.className = 'chat-typing';
            t.innerHTML = '<i></i><i></i><i></i>';
            body.appendChild(t); scrollDown();
        } else if (!on && t) t.remove();
    }

    async function send(text) {
        text = String(text || '').trim().slice(0, 200);
        if (!text || busy) return;
        const now = Date.now();
        if (now - lastSent < COOLDOWN_MS) return;
        lastSent = now; busy = true; sendBtn.disabled = true;
        addMsg(text, 'me');
        input.value = '';
        setTyping(true);
        try {
            const ctl = new AbortController();
            const timer = setTimeout(function () { ctl.abort(); }, 25000);
            const r = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: hist.slice(-6) }),
                signal: ctl.signal
            });
            clearTimeout(timer);
            const j = await r.json().catch(function () { return {}; });
            setTyping(false);
            if (j && j.reply) {
                addMsg(String(j.reply), 'bot');
                hist.push({ role: 'user', text: text }, { role: 'bot', text: String(j.reply).slice(0, 300) });
                if (j.wa) addWaButton();
            } else {
                addMsg('Maaf, asisten sedang bermasalah. Silakan hubungi admin lewat WhatsApp ya.', 'bot');
                addWaButton();
            }
        } catch (e) {
            setTyping(false);
            addMsg('Koneksi bermasalah. Silakan coba lagi atau hubungi admin lewat WhatsApp.', 'bot');
            addWaButton();
        } finally {
            busy = false; sendBtn.disabled = false;
        }
    }

    function openChat() {
        panel.classList.add('open');
        fab.classList.add('chat-open');
        if (!greeted) {
            greeted = true;
            addMsg('Halo! Saya asisten AI Andika Store. Tanya soal produk, harga, atau cara order ya.', 'bot');
            addChips();
        }
        setTimeout(function () { input.focus(); }, 300);
    }
    function closeChat() {
        panel.classList.remove('open');
        fab.classList.remove('chat-open');
    }

    fab.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeChat(); });
})();
