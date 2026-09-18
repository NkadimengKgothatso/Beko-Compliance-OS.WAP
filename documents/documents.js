
import { supabase } from "/supabase.js";
import {
    requiredDocsFor, matchDocuments, validateFile, sanitizeFilename,
    formatBytes, docLabel
} from "/shared/compliance-docs.js";

let currentUser = null;
let profile = null;
let docs = [];
let pendingReqId = null;
let reqUploading = false;

function toast(message, type = "error") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, type === "error" ? 5000 : 3000);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text ?? "");
    return div.innerHTML;
}

function formatDate(d) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-ZA");
}

// Tabs
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

function activateTab(name) {
    tabs.forEach(x => x.classList.toggle("active", x.dataset.tab === name));
    panels.forEach(x => x.classList.toggle("active", x.id === name + "Panel"));
}

tabs.forEach(t => {
    t.onclick = () => {
        tabs.forEach(x => x.classList.remove("active"));
        panels.forEach(x => x.classList.remove("active"));
        t.classList.add("active");
        document.getElementById(t.dataset.tab + "Panel").classList.add("active");
    };
});

// Upload status queue (visible from both tabs)
const uploadQueue = document.getElementById("uploadQueue");

function addStatusRow(name) {
    uploadQueue.classList.remove("hidden");
    const row = document.createElement("div");
    row.className = "upload-row uploading";
    row.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>${escapeHtml(name)} — uploading...</span>`;
    uploadQueue.appendChild(row);
    return row;
}

function setStatusRow(row, state, message) {
    row.className = "upload-row " + state;
    const icon = state === "success" ? "fa-circle-check" : "fa-circle-exclamation";
    row.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(message)}</span>`;
    if (state === "success") setTimeout(() => row.remove(), 5000);
}

async function init() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = "/login/login.html";
        return;
    }
    currentUser = user;
    document.getElementById("userEmail").textContent = user.email;
    document.getElementById("userName").textContent = user.user_metadata?.full_name || "User";

    const { data: prof } = await supabase.from("company_profiles").select("*").eq("id", user.id).maybeSingle();
    profile = prof;

    await refresh();
}

async function refresh() {
    await loadDocuments();
    renderOutstanding();
    renderLibrary();
}

document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login/login.html";
};

async function loadDocuments() {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });
    if (error) {
        docs = [];
        toast("Failed to load documents: " + error.message);
        return;
    }
    docs = data || [];
}

// Outstanding (required) documents
function renderOutstanding() {
    const required = requiredDocsFor(profile);
    const matched = matchDocuments(docs);
    const list = document.getElementById("outstandingList");
    list.innerHTML = "";

    let done = 0;
    required.forEach(req => {
        const doc = matched.get(req.id);
        if (doc) done++;

        const row = document.createElement("div");
        row.className = "req-item " + (doc ? "done" : "missing");

        let actions;
        if (reqUploading && pendingReqId === req.id) {
            actions = `<span class="badge badge-uploading"><i class="fas fa-spinner fa-spin"></i> Uploading...</span>`;
        } else if (doc) {
            actions = `
                <span class="badge badge-done"><i class="fas fa-check"></i> Uploaded</span>
                <button class="btn btn-secondary btn-sm" data-download>Download</button>
                <button class="btn btn-primary btn-sm" data-upload>Replace</button>`;
        } else {
            actions = `
                <span class="badge badge-missing">Missing</span>
                <button class="btn btn-primary btn-sm" data-upload><i class="fas fa-upload"></i> Upload</button>`;
        }

        row.innerHTML = `
            <div class="req-info">
                <div class="req-name">${escapeHtml(req.label)}</div>
                <div class="req-hint">${escapeHtml(req.hint)}</div>
                ${doc ? `<div class="req-meta"><i class="fas fa-paperclip"></i> ${escapeHtml(doc.filename)} &middot; ${formatDate(doc.created_at)}</div>` : ""}
            </div>
            <div class="req-right">${actions}</div>
        `;

        const downloadBtn = row.querySelector("[data-download]");
        if (downloadBtn) downloadBtn.onclick = () => downloadDocument(doc);
        const uploadBtn = row.querySelector("[data-upload]");
        if (uploadBtn) uploadBtn.onclick = () => {
            pendingReqId = req.id;
            document.getElementById("reqInput").click();
        };

        list.appendChild(row);
    });

    const missing = required.length - done;
    const pct = required.length ? Math.round((done / required.length) * 100) : 100;
    document.getElementById("docsProgress").value = pct;
    document.getElementById("docsPercent").textContent = `${pct}% (${done}/${required.length})`;

    const pill = document.getElementById("missingCount");
    pill.textContent = missing;
    pill.classList.toggle("zero", missing === 0);
    document.getElementById("outstandingEmpty").classList.toggle("hidden", missing > 0);
}

// All documents library
function renderLibrary() {
    const list = document.getElementById("fileList");
    list.innerHTML = "";
    document.getElementById("filesEmpty").classList.toggle("hidden", docs.length > 0);

    docs.forEach(doc => {
        const label = doc.doc_type ? docLabel(doc.doc_type) : null;
        const tag = label ? `<span class="doc-tag">${escapeHtml(label)}</span>` : "";
        const row = document.createElement("div");
        row.className = "file-row";
        row.innerHTML = `
            <div class="meta">
                <span class="name"><i class="fas fa-file"></i> ${escapeHtml(doc.filename)}${tag}</span>
                <span class="size">${formatBytes(doc.size_bytes || 0)} &middot; ${formatDate(doc.created_at)}</span>
            </div>
            <div class="actions">
                <button class="btn btn-secondary btn-sm" data-download>Download</button>
                <button class="btn btn-danger btn-sm" data-delete>Delete</button>
            </div>
        `;
        row.querySelector("[data-download]").onclick = () => downloadDocument(doc);
        row.querySelector("[data-delete]").onclick = () => deleteDocument(doc);
        list.appendChild(row);
    });
}

// Uploads
async function uploadFile(file, reqId) {
    const row = addStatusRow(file.name);

    const invalid = validateFile(file);
    if (invalid) {
        setStatusRow(row, "error", invalid);
        toast(invalid);
        return;
    }

    const path = `${currentUser.id}/${Date.now()}_${sanitizeFilename(file.name)}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (upErr) {
        const msg = `Upload failed for ${file.name}: ${upErr.message}`;
        setStatusRow(row, "error", msg);
        toast(msg);
        return;
    }

    const record = {
        user_id: currentUser.id,
        filename: file.name,
        storage_path: path,
        file_type: file.type,
        size_bytes: file.size
    };
    if (reqId) record.doc_type = reqId;

    const { error: dbErr } = await supabase.from("documents").insert(record);
    if (dbErr) {
        // Remove the uploaded file so storage never holds orphaned documents
        await supabase.storage.from("documents").remove([path]);
        const msg = /doc_type/.test(dbErr.message || "")
            ? "Saving failed — run docs/supabase-migration-v5.sql in your Supabase project, then try again."
            : "Failed to save document record: " + dbErr.message;
        setStatusRow(row, "error", msg);
        toast(msg);
        return;
    }

    setStatusRow(row, "success", `${file.name} uploaded`);
}

async function uploadBatch(files, reqId) {
    uploadQueue.innerHTML = "";
    for (const file of files) {
        await uploadFile(file, reqId);
    }
    await refresh();
}

// Drag-and-drop / general upload
const fileDrop = document.getElementById("fileDrop");
const fileInput = document.getElementById("fileInput");

fileDrop.onclick = () => fileInput.click();
fileDrop.ondragover = (e) => { e.preventDefault(); fileDrop.classList.add("drag"); };
fileDrop.ondragleave = () => fileDrop.classList.remove("drag");
fileDrop.ondrop = (e) => {
    e.preventDefault();
    fileDrop.classList.remove("drag");
    uploadBatch(e.dataTransfer.files, null);
};
fileInput.onchange = () => {
    const files = Array.from(fileInput.files);
    fileInput.value = "";
    if (files.length) uploadBatch(files, null);
};

// Upload from an outstanding requirement
const reqInput = document.getElementById("reqInput");
reqInput.onchange = async () => {
    const file = reqInput.files[0];
    reqInput.value = "";
    if (!file) {
        pendingReqId = null;
        return;
    }
    const reqId = pendingReqId;
    reqUploading = true;
    uploadQueue.innerHTML = "";
    renderOutstanding();
    await uploadFile(file, reqId);
    reqUploading = false;
    pendingReqId = null;
    await refresh();
};

// "Upload document" button in the header — general upload
document.getElementById("quickUpload").onclick = () => {
    activateTab("all");
    fileInput.click();
};

async function downloadDocument(doc) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error) return toast("Download link failed: " + error.message);
    window.open(data.signedUrl, "_blank");
}

async function deleteDocument(doc) {
    if (!confirm(`Delete ${doc.filename}?`)) return;
    const { error: storageErr } = await supabase.storage.from("documents").remove([doc.storage_path]);
    if (storageErr) return toast("Delete failed: " + storageErr.message);
    const { error: dbErr } = await supabase.from("documents").delete().eq("id", doc.id);
    if (dbErr) return toast("Failed to remove record: " + dbErr.message);
    toast("Document deleted", "success");
    await refresh();
}

init();
