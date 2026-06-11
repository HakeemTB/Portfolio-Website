/**
 * contact_form.js
 * Handles the portfolio contact form:
 *  - Sends an email via EmailJS (free tier, no backend needed)
 *  - Stores every submission as JSON in localStorage under "portfolio_contacts"
 *
 * SETUP (one-time):
 *  1. Create a free account at https://www.emailjs.com
 *  2. Add an Email Service (Gmail, Outlook, etc.) → copy the Service ID
 *  3. Create an Email Template with variables: {{from_name}}, {{from_email}}, {{message}}
 *     → copy the Template ID
 *  4. Go to Account → copy your Public Key
 *  5. Replace the three placeholder strings below with your real values.
 *  6. Add this script to your HTML BEFORE the closing </body> tag:
 *       <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
 *       <script src="contact_form.js"></script>
 */

const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";   // ← replace
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";   // ← replace
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";  // ← replace

const STORAGE_KEY = "portfolio_contacts";

/* ── helpers ──────────────────────────────────────────────────────────── */

/** Load existing contacts array from localStorage (or empty array). */
function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Persist contacts array back to localStorage as formatted JSON. */
function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts, null, 2));
}

/** Append a new submission and save. Returns the updated array. */
function storeContact(name, email, message) {
  const contacts = loadContacts();
  contacts.push({
    id:        contacts.length + 1,
    name,
    email,
    message,
    submitted: new Date().toISOString(),
  });
  saveContacts(contacts);
  return contacts;
}

/** Show a temporary status banner below the form. */
function showStatus(form, text, isError = false) {
  let banner = form.querySelector(".form-status");
  if (!banner) {
    banner = document.createElement("p");
    banner.className = "form-status";
    form.appendChild(banner);
  }
  banner.textContent  = text;
  banner.style.color  = isError ? "#e05252" : "#52c07a";
  banner.style.margin = "0.75rem 0 0";
  banner.style.fontWeight = "500";

  // auto-hide after 5 s
  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => { banner.textContent = ""; }, 5000);
}

/* ── main init ────────────────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {

  /* Initialise EmailJS */
  if (typeof emailjs !== "undefined") {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  } else {
    console.warn(
      "EmailJS SDK not loaded. " +
      "Add the CDN script tag before contact_form.js — see file header for instructions."
    );
  }

  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name    = form.name.value.trim();
    const email   = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showStatus(form, "Please fill in all fields.", true);
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled   = true;
    submitBtn.textContent = "Sending…";

    /* 1 — store locally regardless of email result */
    const contacts = storeContact(name, email, message);
    console.info(
      `Contact saved locally (${contacts.length} total). ` +
      `JSON snapshot:\n${JSON.stringify(contacts, null, 2)}`
    );

    /* 2 — send via EmailJS */
    try {
      if (typeof emailjs === "undefined") throw new Error("EmailJS not loaded");

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        from_name:  name,
        from_email: email,
        message,
      });

      showStatus(form, "Message sent! I'll get back to you soon.");
      form.reset();

    } catch (err) {
      console.error("EmailJS error:", err);

      if (err.message === "EmailJS not loaded") {
        /* Dev mode: still confirm the local save */
        showStatus(
          form,
          "Saved locally (email not configured yet). See browser console.",
          true
        );
      } else {
        showStatus(
          form,
          "Your message was saved but the email failed to send. Please try again.",
          true
        );
      }
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = originalLabel;
    }
  });
});

/* ── dev utility ─────────────────────────────────────────────────────── */

/**
 * Open your browser console and call this to see all stored contacts
 * as a formatted JSON string, or to download them as a .json file.
 *
 *   getContacts()          → logs to console
 *   getContacts(true)      → downloads contacts.json
 */
window.getContacts = function (download = false) {
  const contacts = loadContacts();
  const json     = JSON.stringify(contacts, null, 2);
  console.log("Stored contacts:\n", json);
  if (download) {
    const blob = new Blob([json], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "contacts.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return contacts;
};
