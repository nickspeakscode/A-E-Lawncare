/* Service-area map (homepage). Leaflet is loaded only when the map nears the viewport. */
(function () {
  "use strict";

  const mapEl = document.getElementById("service-leaflet-map");
  if (!mapEl) return;

  const cityButtons = Array.from(document.querySelectorAll("[data-city]"));
  const placeholder = mapEl.parentElement.querySelector(".map-placeholder");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

  const CITIES = [
    { name: "Spartanburg, SC", pos: [34.9496, -81.9321], side: "right" },
    { name: "Inman, SC", pos: [35.0479, -82.0919], side: "right" },
    { name: "Landrum, SC", pos: [35.1751, -82.1893], side: "left" },
    { name: "Tryon, NC", pos: [35.2089, -82.2344], side: "left" },
    { name: "Columbus, NC", pos: [35.2532, -82.1971], side: "right" }
  ];

  const SERVICE_AREA = [
    [35.45, -83.05],
    [35.32, -82.05],
    [35.05, -81.55],
    [34.72, -81.65],
    [34.68, -82.45],
    [35.05, -82.85],
    [35.38, -83.12],
    [35.45, -83.05]
  ];

  let map = null;
  let loading = null;
  const markers = new Map();
  let pendingCity = null;

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = LEAFLET_JS;
      js.async = true;
      js.onload = resolve;
      js.onerror = reject;
      document.head.appendChild(js);
    });
    return loading;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function setActive(name) {
    cityButtons.forEach((b) => {
      const on = b.dataset.city === name;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  function focusCity(name) {
    setActive(name);
    if (!map) {
      pendingCity = name;
      init();
      return;
    }
    const city = CITIES.find((c) => c.name === name);
    if (!city) return;
    map.flyTo(city.pos, 11, { duration: reduceMotion ? 0.01 : 0.8, easeLinearity: 0.2 });
    markers.get(name)?.openPopup();
  }

  function build() {
    const L = window.L;
    map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    map.fitBounds(L.latLngBounds(SERVICE_AREA).pad(0.04), { animate: false });

    L.polygon(SERVICE_AREA, {
      color: "#102a1d",
      weight: 1.25,
      fillColor: "#8cc63f",
      fillOpacity: 0.18,
      dashArray: "5 6"
    }).addTo(map);

    CITIES.forEach((city) => {
      const left = city.side === "left";
      const labelW = Math.min(188, 90 + city.name.length * 5.35);
      const iconW = Math.round(labelW + 26 + 24);
      const html = left
        ? `<div class="ae-city-marker ae-city-marker--left"><span class="ae-city-label">${escapeHtml(city.name)}</span><span class="ae-city-line"></span><span class="ae-city-dot"></span></div>`
        : `<div class="ae-city-marker"><span class="ae-city-dot"></span><span class="ae-city-line"></span><span class="ae-city-label">${escapeHtml(city.name)}</span></div>`;
      const icon = L.divIcon({
        className: "ae-city-marker-outer",
        html,
        iconSize: [iconW, 44],
        iconAnchor: left ? [iconW - 9, 22] : [9, 22]
      });
      const marker = L.marker(city.pos, { icon, title: city.name })
        .addTo(map)
        .bindPopup(`<strong>${escapeHtml(city.name)}</strong><br>A&amp;E service area`);
      marker.on("click", () => setActive(city.name));
      markers.set(city.name, marker);
    });

    // Enable wheel zoom only after the user interacts with the map, so page scrolling isn't hijacked.
    map.once("focus click", () => map.scrollWheelZoom.enable());
    placeholder?.remove();

    if (pendingCity) {
      const name = pendingCity;
      pendingCity = null;
      focusCity(name);
    }
  }

  function init() {
    loadLeaflet()
      .then(() => {
        if (!map) build();
      })
      .catch(() => {
        if (placeholder) placeholder.textContent = "Map unavailable right now.";
      });
  }

  cityButtons.forEach((b) => b.addEventListener("click", () => focusCity(b.dataset.city)));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          init();
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(mapEl);
  } else {
    init();
  }
})();
