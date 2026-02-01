const API_URL =
  "https://script.google.com/macros/s/AKfycbzQCF1ypOFfNPzNJFzHVKwzEat0hd2nIs1dpTOuSVeWuIrBKTjD2Qi0xRfhnbg7RXZA/exec";

async function loadData() {
  const statusEl = document.getElementById("status");
  const contentEl = document.getElementById("content");
  statusEl.textContent = "Memuat...";
  statusEl.style.color = "blue";

  try {
    const response = await fetch(API_URL + "?t=" + Date.now());
    if (!response.ok) throw new Error("Network response tidak ok");

    let html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    doc.querySelectorAll("form").forEach((form) => {
      if (!form.action || form.action.startsWith("/") || form.action === "") {
        form.action = API_URL;
      }
    });

    doc.querySelectorAll('a[href^="/"], a[href=""]').forEach((a) => {
      a.href = API_URL;
    });

    contentEl.innerHTML = doc.body.innerHTML || html;
    statusEl.textContent = "Data terbaru • Online";
    statusEl.style.color = "green";

    if ("caches" in window) {
      const cache = await caches.open("pwa-data");
      cache.put(API_URL, response.clone());
    }
  } catch (err) {
    if ("caches" in window) {
      const cache = await caches.open("pwa-data");
      const cached = await cache.match(API_URL);
      if (cached) {
        const html = await cached.text();
        contentEl.innerHTML = html;
        statusEl.textContent = "Offline • Menampilkan data terakhir";
        statusEl.style.color = "orange";
      } else {
        contentEl.innerHTML =
          "<p>Tidak dapat memuat data (offline & tidak ada cache).</p>";
        statusEl.textContent = "Offline";
        statusEl.style.color = "red";
      }
    }
  }
}

window.addEventListener("load", loadData);
window.addEventListener("online", loadData);
