"use strict";

const form = document.querySelector("#login-form");
const status = document.querySelector("#login-status");

const setStatus = (message, tone = "") => {
  if (!status) {
    return;
  }
  status.textContent = message;
  status.style.color = tone === "error" ? "#b42318" : "";
};

const login = async (payload) => {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Login failed.");
  }

  return response.json();
};

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      username: formData.get("username"),
      password: formData.get("password"),
    };
    try {
      setStatus("Signing in...");
      await login(payload);
      window.location.href = "/index.html";
    } catch (error) {
      setStatus(error.message, "error");
    }
  });
}
