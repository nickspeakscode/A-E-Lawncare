/* Quote form handling (contact page + homepage modal).
   Writes to the Supabase `quotes` table. The Supabase library is loaded on demand
   so pages stay fast until someone actually sends a request. */
(function () {
  "use strict";

  const SUPABASE_SRC = "https://unpkg.com/@supabase/supabase-js@2";
  let supabaseLoading = null;

  function loadSupabase() {
    if (window.supabase) return Promise.resolve();
    if (!supabaseLoading) {
      supabaseLoading = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = SUPABASE_SRC;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          supabaseLoading = null;
          reject(new Error("Could not load the form service."));
        };
        document.head.appendChild(s);
      });
    }
    return supabaseLoading;
  }

  function setStatus(node, text, kind) {
    if (!node) return;
    node.textContent = text;
    node.classList.remove("is-success", "is-error");
    if (kind) node.classList.add(`is-${kind}`);
  }

  // Pre-select a service from ?service=... (links on the services page use this)
  function prefillService(form) {
    setService(form, new URLSearchParams(window.location.search).get("service"));
  }

  function setService(form, value) {
    const select = form.querySelector('select[name="service"]');
    if (!value || !select) return;
    const match = Array.from(select.options).find((o) => o.value.toLowerCase() === value.toLowerCase());
    if (match) select.value = match.value;
  }

  // Multi-step behaviour for the pop-up form (form[data-stepper])
  function makeStepper(form) {
    const steps = Array.from(form.querySelectorAll(".quote-step"));
    const root = form.closest(".quote-main") || form.parentElement;
    const back = form.querySelector("[data-step-back]");
    const next = form.querySelector("[data-step-next]");
    const submit = form.querySelector("[data-step-submit]");
    const count = root.querySelector("[data-step-count]");
    const title = root.querySelector("[data-step-title]");
    const progress = root.querySelector("[data-step-progress]");
    const body = form.querySelector(".quote-body");
    let index = 0;

    function show(i, direction) {
      index = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach((s, n) => {
        s.classList.toggle("is-active", n === index);
        s.classList.toggle("is-back", n === index && direction < 0);
      });
      const last = index === steps.length - 1;
      if (back) back.hidden = index === 0;
      if (next) next.hidden = last;
      if (submit) submit.hidden = !last;
      if (count) count.textContent = `Step ${index + 1} of ${steps.length}`;
      if (title) title.textContent = steps[index].dataset.stepTitle || "";
      if (progress) progress.style.width = `${((index + 1) / steps.length) * 100}%`;
      if (body) body.scrollTop = 0;
    }

    function stepValid() {
      const fields = Array.from(steps[index].querySelectorAll("input, select, textarea"));
      const bad = fields.find((f) => !f.checkValidity());
      if (bad) {
        bad.reportValidity();
        bad.focus();
        return false;
      }
      return true;
    }

    function focusFirst() {
      const el = Array.from(steps[index].querySelectorAll("input, select, textarea")).find((f) => !f.value || f.type === "radio");
      el?.focus({ preventScroll: true });
    }

    next?.addEventListener("click", () => {
      if (!stepValid()) return;
      show(index + 1, 1);
      focusFirst();
    });
    back?.addEventListener("click", () => {
      show(index - 1, -1);
      focusFirst();
    });

    // Enter moves forward on earlier steps (but still makes new lines in the textarea)
    form.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") return;
      if (index < steps.length - 1) {
        e.preventDefault();
        next?.click();
      }
    });

    show(0, 1);
    return {
      reset() {
        show(0, 1);
      },
      validateAll() {
        for (let i = 0; i < steps.length; i += 1) {
          const bad = Array.from(steps[i].querySelectorAll("input, select, textarea")).find((f) => !f.checkValidity());
          if (bad) {
            show(i, -1);
            bad.reportValidity();
            bad.focus();
            return false;
          }
        }
        return true;
      }
    };
  }

  function bindQuoteForm(form, statusNode) {
    if (!form) return;
    prefillService(form);
    const stepper = form.hasAttribute("data-stepper") ? makeStepper(form) : null;
    const main = form.closest(".quote-main");
    const success = main?.querySelector("[data-quote-success]");

    if (stepper) {
      document.addEventListener("quotemodal", (e) => {
        if (!e.detail.open) return;
        if (success && !success.hidden) {
          success.hidden = true;
          form.hidden = false;
          main.classList.remove("is-done");
          stepper.reset();
        }
        if (e.detail.service) {
          stepper.reset();
          setService(form, e.detail.service);
        }
        setStatus(statusNode, "", null);
      });
    }

    // Warm up the library when the user starts filling the form
    form.addEventListener("focusin", () => loadSupabase().catch(() => {}), { once: true });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (stepper) {
        if (!stepper.validateAll()) return;
      } else if (!form.checkValidity()) {
        const firstInvalid = form.querySelector(":invalid");
        firstInvalid?.reportValidity();
        firstInvalid?.focus();
        return;
      }

      const button = form.querySelector('[type="submit"]');
      const buttonHtml = button ? button.innerHTML : "";
      if (button) {
        button.disabled = true;
        button.textContent = "Sending…";
      }
      setStatus(statusNode, "", null);

      try {
        await loadSupabase();
        const supabase = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
        if (!supabase) throw new Error("The quote form is not configured yet.");

        const data = new FormData(form);
        const get = (k) => String(data.get(k) || "").trim();
        const quote = {
          name: get("name"),
          email: get("email"),
          phone: get("phone"),
          street_address: get("street_address"),
          state: get("state"),
          city: get("city"),
          zip_code: get("zip_code"),
          customer_type: get("customer_type"),
          service: get("service"),
          message: get("message")
        };

        const { error } = await supabase.from("quotes").insert([quote]);
        if (error) throw error;

        form.reset();
        if (stepper && success) {
          form.hidden = true;
          success.hidden = false;
          main.classList.add("is-done");
          success.querySelector("button")?.focus();
        } else {
          setStatus(statusNode, "Thanks! Your quote request was sent. We will be in touch soon.", "success");
        }
      } catch (err) {
        console.error("Quote submit failed:", err);
        setStatus(
          statusNode,
          "Sorry, something went wrong sending your request. Please call (864) 473-9976 or email support@aelawnpros.com.",
          "error"
        );
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML = buttonHtml;
        }
      }
    });
  }

  bindQuoteForm(document.getElementById("quote-form"), document.getElementById("form-status"));
  bindQuoteForm(document.getElementById("quote-form-modal"), document.getElementById("quote-modal-status"));
})();
