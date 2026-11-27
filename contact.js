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
    const wanted = new URLSearchParams(window.location.search).get("service");
    const select = form.querySelector('select[name="service"]');
    if (!wanted || !select) return;
    const match = Array.from(select.options).find((o) => o.value.toLowerCase() === wanted.toLowerCase());
    if (match) select.value = match.value;
  }

  function bindQuoteForm(form, statusNode) {
    if (!form) return;
    prefillService(form);

    // Warm up the library when the user starts filling the form
    form.addEventListener("focusin", () => loadSupabase().catch(() => {}), { once: true });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        const firstInvalid = form.querySelector(":invalid");
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
        setStatus(statusNode, "Thanks! Your quote request was sent. We will be in touch soon.", "success");
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
