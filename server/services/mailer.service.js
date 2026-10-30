"use strict";
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const axios = require("axios");

const ENABLED   = process.env.MAIL_NOTIFICATIONS_ENABLED !== "false";
const MAIL_USER = process.env.MAIL_USER || "";

const msalConfig = {
  auth: {
    clientId:     process.env.CLIENT_ID     || "",
    authority:    "https://login.microsoftonline.com/" + (process.env.TENANT_ID || ""),
    clientSecret: process.env.CLIENT_SECRET || "",
  },
};

let _cca = null;
function getCCA() {
  if (!_cca) {
    // require perezoso: si @azure/msal-node aún no está instalado, el servidor arranca igual
    // y el envío falla con un mensaje claro en vez de tirar todo el servidor.
    const { ConfidentialClientApplication } = require("@azure/msal-node");
    _cca = new ConfidentialClientApplication(msalConfig);
  }
  return _cca;
}

async function getAccessToken() {
  const result = await getCCA().acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });
  if (!result || !result.accessToken) throw new Error("MSAL no devolvio accessToken.");
  return result.accessToken;
}

function toGraphRecipients(value) {
  if (!value) return [];
  const list = Array.isArray(value)
    ? value
    : String(value).split(",").map((s) => s.trim());
  return list.filter(Boolean).map((address) => ({ emailAddress: { address } }));
}

function toGraphAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((a) => {
      // Acepta { content } (Buffer/string) o { path } (ruta de archivo, estilo nodemailer).
      let raw = a.content;
      if (!raw && a.path) {
        try { raw = fs.readFileSync(a.path); }
        catch (e) { console.warn(`[mailer] no se pudo leer el adjunto ${a.path}: ${e.message}`); return null; }
      }
      if (!raw) return null;
      const content = Buffer.isBuffer(raw)
        ? raw.toString("base64")
        : Buffer.from(raw).toString("base64");
      return {
        "@odata.type":  "#microsoft.graph.fileAttachment",
        name:           a.filename || "adjunto",
        contentType:    a.contentType || "application/octet-stream",
        contentBytes:   content,
        contentId:      a.cid || undefined,
        isInline:       Boolean(a.cid),
      };
    })
    .filter(Boolean);
}

async function sendMail({ to, cc, bcc, subject, html, text, attachments = [] }) {
  if (!ENABLED) {
    console.log(`[mailer] notificaciones deshabilitadas. Saltando: ${subject}`);
    return null;
  }
  const toList = toGraphRecipients(to);
  if (!toList.length) {
    console.warn("[mailer] sin destinatarios, saltando.");
    return null;
  }
  const payload = {
    message: {
      subject,
      body: { contentType: "HTML", content: html || `<pre>${text || ""}</pre>` },
      toRecipients:  toList,
      ccRecipients:  toGraphRecipients(cc),
      bccRecipients: toGraphRecipients(bcc),
      attachments:   toGraphAttachments(attachments),
    },
    saveToSentItems: true,
  };
  try {
    const token = await getAccessToken();
    await axios.post(
      `https://graph.microsoft.com/v1.0/users/${MAIL_USER}/sendMail`,
      payload,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    const dest = toList.map((r) => r.emailAddress.address).join(", ");
    console.log(`[mailer] enviado via Graph: "${subject}" -> ${dest}`);
    return { messageId: `graph-${Date.now()}` };
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message || "Error desconocido";
    console.error("[mailer] error al enviar correo via Graph:", detail);
    return null;
  }
}

async function verifyMailer() {
  if (!ENABLED) {
    console.log("[mailer] notificaciones deshabilitadas, no se verifica.");
    return false;
  }
  try {
    await getAccessToken();
    console.log("[mailer] Microsoft Graph — credenciales validas");
    return true;
  } catch (err) {
    console.error("[mailer] verificacion Graph fallida:", err.message);
    return false;
  }
}

module.exports = { sendMail, verifyMailer };
