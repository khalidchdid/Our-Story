(() => {
  const API_BASE = "https://young-leaf-1708.akhmouchkhalid20.workers.dev"; // <-- change

  const roomEl = document.getElementById("room");
  const senderEl = document.getElementById("sender");
  const logEl = document.getElementById("log");
  const msgEl = document.getElementById("msg");
  const statusEl = document.getElementById("status");

  const connectBtn = document.getElementById("connectBtn");
  const sendBtn = document.getElementById("sendBtn");

  const LS_ROOM = "ourStoryRoom";
  const LS_SENDER = "ourStorySender";
  let connected = false;
  let lastId = 0;
  let pollTimer = null;

  roomEl.value = localStorage.getItem(LS_ROOM) || "";
  senderEl.value = localStorage.getItem(LS_SENDER) || "";

  function setStatus(s) { statusEl.textContent = s; }
  function esc(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function addLine(m) {
    const t = new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    logEl.insertAdjacentHTML(
      "beforeend",
      `<div style="margin-bottom:10px;">
         <div style="color:var(--muted);font-size:12px;font-weight:800;">${esc(m.sender)} • ${t}</div>
         <div style="font-size:15px;font-weight:800;">${esc(m.body)}</div>
       </div>`
    );
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function fetchNew() {
    if (!connected) return;
    const room = roomEl.value.trim();
    const url = `${API_BASE}/messages?room=${encodeURIComponent(room)}&after=${lastId}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    for (const m of (data.messages || [])) {
      lastId = Math.max(lastId, m.id);
      addLine(m);
    }
  }

  async function connect() {
    const room = roomEl.value.trim();
    const sender = senderEl.value.trim();

    if (room.length < 8) return alert("Room code too short. Use 12+ chars.");
    if (!sender) return alert("Choose a sender name.");

    localStorage.setItem(LS_ROOM, room);
    localStorage.setItem(LS_SENDER, sender);

    logEl.innerHTML = "";
    lastId = 0;
    connected = true;
    setStatus("Connected (polling)");

    // initial fetch + start polling
    await fetchNew();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => fetchNew().catch(() => {}), 1200);
  }

  async function send() {
    if (!connected) return;
    const room = roomEl.value.trim();
    const sender = senderEl.value.trim();
    const body = msgEl.value.trim();
    if (!body) return;

    msgEl.value = "";

    const r = await fetch(`${API_BASE}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, sender, body }),
    });

    if (!r.ok) {
      setStatus("Send failed (check internet)");
      return;
    }
    setStatus("Connected (polling)");
    // Pull immediately so you see your own message without waiting
    await fetchNew();
  }

  connectBtn.addEventListener("click", () => connect().catch(() => setStatus("Connect failed")));
  sendBtn.addEventListener("click", () => send().catch(() => setStatus("Send failed")));
  msgEl.addEventListener("keydown", (e) => { if (e.key === "Enter") send().catch(()=>{}); });
})();
