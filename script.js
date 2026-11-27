/* A&E Lawn Care — shared site interactions */
(function () {
  "use strict";

  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year], #year").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  /* ---------- Scroll lock helper ---------- */
  let lockCount = 0;
  function lockScroll(lock) {
    lockCount = Math.max(0, lockCount + (lock ? 1 : -1));
    body.classList.toggle("is-locked", lockCount > 0);
  }

  /* ---------- Header: solid on scroll, hide on scroll down ---------- */
  const header = document.getElementById("site-header");
  const mobileCta = document.getElementById("mobile-cta");
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const delta = y - lastY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 24);
      const navOpen = body.classList.contains("nav-open");
      if (!navOpen && y > 480 && delta > 6) {
        header.classList.add("is-hidden");
        body.classList.add("header-hidden");
      } else if (delta < -6 || y < 480) {
        header.classList.remove("is-hidden");
        body.classList.remove("header-hidden");
      }
    }
    if (mobileCta) {
      const threshold = body.classList.contains("has-hero") ? window.innerHeight * 0.7 : 320;
      mobileCta.classList.toggle("is-visible", y > threshold);
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();

  /* ---------- Mobile navigation ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  function setNav(open) {
    if (!navToggle || !mobileNav) return;
    if (body.classList.contains("nav-open") === open) return;
    body.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    lockScroll(open);
    if (open) header?.classList.remove("is-hidden");
  }

  navToggle?.addEventListener("click", () => setNav(!body.classList.contains("nav-open")));
  mobileNav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) setNav(false);
  });
  window.matchMedia("(min-width: 1081px)").addEventListener("change", (e) => e.matches && setNav(false));

  /* ---------- Reveal on scroll ---------- */
  const revealNodes = document.querySelectorAll(".reveal, .reveal-img");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    revealNodes.forEach((node) => revealObserver.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
  }

  /* ---------- Count-up stats ---------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          countObserver.unobserve(el);
          const target = Number(el.dataset.count);
          const suffix = el.dataset.suffix || "";
          const start = performance.now();
          const duration = 1400;
          const tick = (now) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => countObserver.observe(el));
  }

  /* ---------- Videos: hero + play-when-visible ---------- */
  const heroVideo = document.querySelector(".hero-video");
  if (heroVideo) {
    if (reduceMotion || saveData) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      heroVideo.muted = true;
      heroVideo.play().catch(() => {});
    }
  }

  const autoVideos = document.querySelectorAll("video[data-autoplay]");
  if (autoVideos.length && "IntersectionObserver" in window && !reduceMotion && !saveData) {
    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting) {
            v.muted = true;
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    autoVideos.forEach((v) => videoObserver.observe(v));
  }

  /* ---------- Carousel ---------- */
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".carousel-track");
    const section = carousel.closest("section") || document;
    const prev = section.querySelector("[data-carousel-prev]");
    const next = section.querySelector("[data-carousel-next]");
    const progress = section.querySelector("[data-carousel-progress]");
    if (!track) return;

    const step = () => {
      const tile = track.querySelector(".work-tile");
      const gap = parseFloat(getComputedStyle(track).columnGap) || 20;
      return tile ? (tile.getBoundingClientRect().width + gap) * (window.innerWidth > 860 ? 2 : 1) : track.clientWidth * 0.8;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = max > 0 ? track.scrollLeft / max : 1;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
      if (progress) progress.style.width = `${Math.max(8, ratio * 100)}%`;
    };

    prev?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }));
    next?.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }));
    track.addEventListener("scroll", () => requestAnimationFrame(update), { passive: true });
    window.addEventListener("resize", update);
    update();

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next?.click();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev?.click();
      }
    });

    // Mouse drag to scroll (touch already scrolls natively)
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) {
        moved = true;
        track.classList.add("is-dragging");
      }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        track.classList.remove("is-dragging");
        // snap to nearest tile after drag
        const s = step() / (window.innerWidth > 860 ? 2 : 1);
        track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: "smooth" });
        // swallow the click that follows a drag
        const swallow = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        track.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => track.removeEventListener("click", swallow, { capture: true }), 80);
      }
    });
    track.addEventListener("dragstart", (e) => e.preventDefault());
  });

  /* ---------- Gallery filters ---------- */
  const gallery = document.getElementById("gallery");
  const filterButtons = document.querySelectorAll("[data-filter]");
  function applyFilter(filter, animate) {
    if (!gallery) return;
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === filter)));
    gallery.querySelectorAll(".work-tile").forEach((tile, i) => {
      const cats = (tile.dataset.category || "").split(" ");
      const show = filter === "all" || cats.includes(filter);
      tile.classList.toggle("is-filtered-out", !show);
      if (show && animate && !reduceMotion) {
        tile.classList.add("is-entering");
        setTimeout(() => tile.classList.remove("is-entering"), 30 + i * 35);
      }
    });
  }
  if (gallery && filterButtons.length) {
    filterButtons.forEach((btn) =>
      btn.addEventListener("click", () => {
        const f = btn.dataset.filter;
        applyFilter(f, true);
        const url = new URL(window.location.href);
        if (f === "all") url.searchParams.delete("filter");
        else url.searchParams.set("filter", f);
        history.replaceState(null, "", url);
      })
    );
    const initial = new URLSearchParams(window.location.search).get("filter");
    if (initial && document.querySelector(`[data-filter="${CSS.escape(initial)}"]`)) applyFilter(initial, false);
  }

  /* ---------- Lightbox ---------- */
  const lbItems = () =>
    Array.from(document.querySelectorAll("[data-lightbox]")).filter((el) => !el.classList.contains("is-filtered-out"));

  let lightbox = null;
  let lbIndex = 0;
  let lbList = [];
  let lbReturnFocus = null;

  function buildLightbox() {
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Project viewer");
    lightbox.innerHTML = `
      <div class="lightbox-top">
        <span class="lightbox-count" aria-live="polite"></span>
        <button class="icon-btn lightbox-close" type="button" aria-label="Close viewer"><svg aria-hidden="true"><use href="#i-close"/></svg></button>
      </div>
      <div class="lightbox-stage">
        <div class="lightbox-media"></div>
        <button class="icon-btn lightbox-prev" type="button" aria-label="Previous"><svg aria-hidden="true"><use href="#i-arrow-left"/></svg></button>
        <button class="icon-btn lightbox-next" type="button" aria-label="Next"><svg aria-hidden="true"><use href="#i-arrow"/></svg></button>
      </div>
      <div class="lightbox-caption"><strong></strong><span></span></div>`;
    body.appendChild(lightbox);

    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    lightbox.querySelector(".lightbox-prev").addEventListener("click", () => showLightbox(lbIndex - 1));
    lightbox.querySelector(".lightbox-next").addEventListener("click", () => showLightbox(lbIndex + 1));
    lightbox.querySelector(".lightbox-stage").addEventListener("click", (e) => {
      if (e.target.classList.contains("lightbox-stage") || e.target.classList.contains("lightbox-media")) closeLightbox();
    });

    // swipe
    let sx = 0;
    let sy = 0;
    const stage = lightbox.querySelector(".lightbox-stage");
    stage.addEventListener("touchstart", (e) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) showLightbox(lbIndex + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeLightbox();
    }, { passive: true });
  }

  function showLightbox(index) {
    if (!lbList.length) return;
    lbIndex = (index + lbList.length) % lbList.length;
    const item = lbList[lbIndex];
    const media = lightbox.querySelector(".lightbox-media");
    const old = media.querySelector("video");
    if (old) old.pause();
    media.replaceChildren();

    if (item.dataset.type === "video") {
      const v = document.createElement("video");
      v.src = item.getAttribute("href");
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      v.poster = item.querySelector("img")?.getAttribute("src") || "";
      media.appendChild(v);
    } else {
      const im = document.createElement("img");
      im.src = item.getAttribute("href");
      im.alt = item.querySelector("img")?.alt || "";
      im.decoding = "async";
      media.appendChild(im);
    }
    lightbox.querySelector(".lightbox-caption strong").textContent = item.dataset.title || "";
    lightbox.querySelector(".lightbox-caption span").textContent = item.dataset.desc || "";
    lightbox.querySelector(".lightbox-count").textContent = `${lbIndex + 1} / ${lbList.length}`;

    // preload neighbours
    [lbIndex + 1, lbIndex - 1].forEach((i) => {
      const n = lbList[(i + lbList.length) % lbList.length];
      if (n && n.dataset.type !== "video") {
        const pre = new Image();
        pre.src = n.getAttribute("href");
      }
    });
  }

  function openLightbox(trigger) {
    if (!lightbox) buildLightbox();
    lbList = lbItems().filter((el) => el.dataset.lightbox === trigger.dataset.lightbox);
    lbReturnFocus = trigger;
    showLightbox(lbList.indexOf(trigger));
    lightbox.classList.add("is-open");
    lockScroll(true);
    lightbox.querySelector(".lightbox-close").focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightbox || !lightbox.classList.contains("is-open")) return;
    lightbox.classList.remove("is-open");
    lightbox.querySelector("video")?.pause();
    lockScroll(false);
    lbReturnFocus?.focus({ preventScroll: true });
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-lightbox]");
    if (!trigger || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openLightbox(trigger);
  });

  /* ---------- Quote modal ---------- */
  const modal = document.getElementById("quote-modal");
  let modalReturnFocus = null;

  function setModal(open) {
    if (!modal) return;
    if (modal.classList.contains("is-open") === open) return;
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", String(!open));
    lockScroll(open);
    if (open) {
      modalReturnFocus = document.activeElement;
      setTimeout(() => modal.querySelector('input[name="name"]')?.focus(), 120);
    } else {
      modalReturnFocus?.focus?.({ preventScroll: true });
    }
  }

  if (modal) {
    document.addEventListener("click", (e) => {
      const opener = e.target.closest("[data-quote-open]");
      if (opener) {
        e.preventDefault();
        setNav(false);
        setModal(true);
        return;
      }
      if (e.target.closest("[data-modal-close]")) setModal(false);
    });
  }

  /* ---------- Keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (lightbox?.classList.contains("is-open")) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") showLightbox(lbIndex + 1);
      else if (e.key === "ArrowLeft") showLightbox(lbIndex - 1);
      else if (e.key === "Tab") trapFocus(e, lightbox);
      return;
    }
    if (modal?.classList.contains("is-open")) {
      if (e.key === "Escape") setModal(false);
      else if (e.key === "Tab") trapFocus(e, modal.querySelector(".modal-panel"));
      return;
    }
    if (e.key === "Escape" && body.classList.contains("nav-open")) {
      setNav(false);
      navToggle?.focus();
    }
  });

  function trapFocus(e, container) {
    const focusables = Array.from(
      container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- Services page: scroll-spy sub nav ---------- */
  const serviceLinks = document.querySelectorAll(".service-nav a");
  if (serviceLinks.length && "IntersectionObserver" in window) {
    const map = new Map();
    serviceLinks.forEach((a) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) map.set(target, a);
    });
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const link = map.get(entry.target);
          serviceLinks.forEach((a) => a.classList.toggle("is-active", a === link));
          const list = link.parentElement.parentElement;
          list.scrollTo({ left: link.offsetLeft - 24, behavior: reduceMotion ? "auto" : "smooth" });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    map.forEach((_, target) => spy.observe(target));
  }
})();
