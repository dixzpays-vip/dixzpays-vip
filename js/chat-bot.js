/* CS Bot AI — widget chat. Semua teks dirender pakai textContent (aman dari XSS). */
(function () {
    const fab = document.getElementById('fabChat');
    const panel = document.getElementById('chatPanel');
    if (!fab || !panel) return;
    const body = document.getElementById('chatBody');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSend');
    const closeBtn = document.getElementById('chatClose');
    const vv = window.visualViewport;
    const COOLDOWN_MS = 2500;
    const hist = [];
    let busy = false, lastSent = 0, greeted = false, base = null;

    function scrollDown() { body.scrollTop = body.scrollHeight; }

    /* Panel: sisi atas dikunci. Saat keyboard muncul, hanya tinggi panel yang
       menyusut (bagian bawah / kolom ketik naik ke atas keyboard); header dan
       latar atas tidak bergeser. */
    function vh() { return vv ? vv.height : window.innerHeight; }
    function vtop() { return vv ? vv.offsetTop : 0; }
    function measureBase() {
        const h = vh();
        const fullH = Math.min(540, h - 32);
        base = { h: h, fullH: fullH, top: h - fullH - 16 };
    }
    function layoutPanel() {
        if (!panel.classList.contains('open')) return;
        const h = vh();
        if (!base || h > base.h + 50) measureBase();
        let height = Math.min(base.fullH, h - base.top - 8);
        let top = base.top;
        if (height < 240) { height = Math.min(base.fullH, h - 16); top = h - 8 - height; }
        panel.style.top = (vtop() + Math.max(8, top)) + 'px';
        panel.style.height = Math.max(160, height) + 'px';
        panel.style.bottom = 'auto';
        scrollDown();
    }
    if (vv) { vv.addEventListener('resize', layoutPanel); vv.addEventListener('scroll', layoutPanel); }
    window.addEventListener('resize', layoutPanel);
    window.addEventListener('orientationchange', function () { base = null; setTimeout(layoutPanel, 350); });

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

    function resetInput() { input.value = ''; input.style.height = ''; }

    async function send(text) {
        text = String(text || '').trim().slice(0, 200);
        if (!text || busy) return;
        const now = Date.now();
        if (now - lastSent < COOLDOWN_MS) return;
        lastSent = now; busy = true; sendBtn.disabled = true;
        addMsg(text, 'me');
        resetInput();
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
        base = null;
        panel.classList.add('open');
        fab.classList.add('chat-open');
        layoutPanel();
        if (!greeted) {
            greeted = true;
            addMsg('Halo! Saya asisten AI Andika Store. Tanya soal produk, harga, atau cara order ya.', 'bot');
            addChips();
        }
        // Sengaja tidak auto-fokus: keyboard hanya muncul saat kolom ketik diketuk.
    }
    function closeChat() {
        input.blur();
        panel.classList.remove('open');
        fab.classList.remove('chat-open');
    }

    fab.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);
    sendBtn.addEventListener('click', function () { send(input.value); });
    input.addEventListener('input', function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 96) + 'px';
    });
    // Enter = kirim (Shift+Enter = baris baru); juga menangani keyboard HP
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
    });
    input.addEventListener('beforeinput', function (e) {
        if (e.inputType === 'insertLineBreak') { e.preventDefault(); send(input.value); }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeChat(); });
})();
