// Config: Supabase Project
const SUPABASE_URL = "https://ossrndujcdyhceutbmxg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zc3JuZHVqY2R5aGNldXRibXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1Njc3ODgsImV4cCI6MjA3NzE0Mzc4OH0.XuxMBUxF0mcVK2QgZkrEpjYSOyPL5WfpNb6GV55Uy0E";

// Initialize Supabase client
const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const envNote = document.getElementById("envNote");
const appSection = document.getElementById("appSection");
const authSection = document.getElementById("authSection");
const googleSignIn = document.getElementById("googleSignIn");
const signOutBtn = document.getElementById("signOut");
const authStatus = document.getElementById("authStatus");
const mfaBox = document.getElementById("mfaBox");
const mfaEnrollBtn = document.getElementById("mfaEnroll");
const mfaChallengeBtn = document.getElementById("mfaChallenge");
const mfaVerifyBtn = document.getElementById("mfaVerify");
const mfaCodeInput = document.getElementById("mfaCode");
const mfaQrWrap = document.getElementById("mfaQrWrap");

// Users
const userForm = document.getElementById("userForm");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const usersList = document.getElementById("usersList");
const refreshUsersBtn = document.getElementById("refreshUsersBtn");

// Tasks
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskAssignee = document.getElementById("taskAssignee");
const taskStart = document.getElementById("taskStart");
const taskDue = document.getElementById("taskDue");
const taskStatus = document.getElementById("taskStatus");
const tasksList = document.getElementById("tasksList");
const filterUser = document.getElementById("filterUser");
const filterStatus = document.getElementById("filterStatus");
const refreshTasksBtn = document.getElementById("refreshTasksBtn");

envNote.textContent = `Connected to: ${new URL(SUPABASE_URL).host}`;

// Helpers
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function option(el, value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  el.appendChild(o);
}

async function loadUsers() {
  const { data, error } = await db.from("family_users").select("id, name, email, created_at").order("created_at", { ascending: true });
  if (error) {
    console.error(error);
    usersList.innerHTML = `<li class="muted">Failed to load users</li>`;
    return [];
  }

  usersList.innerHTML = "";
  data.forEach(u => {
    const li = document.createElement("li");
    const left = document.createElement("div");
    const right = document.createElement("div");
    left.innerHTML = `<div><strong>${u.name}</strong>${u.email ? ` · <span class="muted">${u.email}</span>` : ""}</div><div class="meta">Joined ${new Date(u.created_at).toLocaleDateString()}</div>`;
    right.className = "task-controls";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "btn ghost";
    editBtn.onclick = () => startEditUser(u);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "btn danger";
    delBtn.onclick = () => deleteUser(u.id);

    right.appendChild(editBtn);
    right.appendChild(delBtn);

    li.appendChild(left);
    li.appendChild(right);
    usersList.appendChild(li);
  });

  // Populate selects
  [taskAssignee, filterUser].forEach(sel => {
    sel.innerHTML = "";
  });
  option(taskAssignee, "", "Assign to...");
  option(filterUser, "", "All Members");
  data.forEach(u => {
    option(taskAssignee, u.id, u.name);
    option(filterUser, u.id, u.name);
  });

  return data;
}

async function loadTasks() {
  let query = db.from("tasks").select("id, title, description, status, start_date, due_date, assigned_user_id, family_users(name)").order("created_at", { ascending: false });
  if (filterUser.value) query = query.eq("assigned_user_id", filterUser.value);
  if (filterStatus.value) query = query.eq("status", filterStatus.value);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    tasksList.innerHTML = `<li class="muted">Failed to load tasks</li>`;
    return [];
  }

  tasksList.innerHTML = "";
  data.forEach(t => {
    const li = document.createElement("li");
    const top = document.createElement("div");
    top.className = "task-top";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = t.title;
    const controls = document.createElement("div");
    controls.className = "task-controls";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "btn ghost";
    editBtn.onclick = () => startEditTask(t);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "btn danger";
    delBtn.onclick = () => deleteTask(t.id);

    controls.appendChild(editBtn);
    controls.appendChild(delBtn);
    top.appendChild(title);
    top.appendChild(controls);

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `${t.family_users?.name || "Unassigned"} · ${t.status.replace("_", " ")} · ${fmtDate(t.start_date)} → ${fmtDate(t.due_date)}`;

    const desc = document.createElement("div");
    desc.textContent = t.description || "";

    li.appendChild(top);
    li.appendChild(meta);
    if (desc.textContent) li.appendChild(desc);
    tasksList.appendChild(li);
  });

  return data;
}

// Create / Update / Delete: Users
userForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = userName.value.trim();
  const email = userEmail.value.trim() || null;
  if (!name) return;
  const { error } = await db.from("family_users").insert({ name, email });
  if (error) return alert("Failed to add user: " + error.message);
  userForm.reset();
  await loadUsers();
});

async function startEditUser(user) {
  const li = [...usersList.children].find(x => x.firstChild?.textContent?.includes(user.name));
  if (!li) return;
  li.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "inline-edit";
  const nameI = document.createElement("input"); nameI.value = user.name;
  const emailI = document.createElement("input"); emailI.value = user.email || ""; emailI.type = "email";
  const save = document.createElement("button"); save.textContent = "Save"; save.className = "btn";
  const cancel = document.createElement("button"); cancel.textContent = "Cancel"; cancel.className = "btn ghost";
  const del = document.createElement("button"); del.textContent = "Delete"; del.className = "btn danger";
  save.onclick = async () => {
    const { error } = await db.from("family_users").update({ name: nameI.value.trim(), email: (emailI.value.trim() || null) }).eq("id", user.id);
    if (error) return alert("Failed to update: " + error.message);
    await loadUsers();
    await loadTasks();
  };
  cancel.onclick = async () => { await loadUsers(); };
  del.onclick = () => deleteUser(user.id);
  wrap.append(nameI, emailI, save, cancel, del);
  li.appendChild(wrap);
}

async function deleteUser(id) {
  if (!confirm("Delete this member? Their tasks will remain but become unassigned.")) return;
  const { error } = await db.from("family_users").delete().eq("id", id);
  if (error) return alert("Failed to delete: " + error.message);
  await loadUsers();
  await loadTasks();
}

// Create / Update / Delete: Tasks
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: taskTitle.value.trim(),
    description: taskDescription.value.trim() || null,
    assigned_user_id: taskAssignee.value || null,
    start_date: taskStart.value || null,
    due_date: taskDue.value || null,
    status: taskStatus.value || "todo",
  };
  if (!payload.title) return;
  const { error } = await db.from("tasks").insert(payload);
  if (error) return alert("Failed to add task: " + error.message);
  taskForm.reset();
  await loadTasks();
});

async function startEditTask(task) {
  // Render inline editor at top of tasks list for clarity
  const editor = document.createElement("li");
  editor.className = "inline-edit";
  const titleI = document.createElement("input"); titleI.value = task.title;
  const descI = document.createElement("input"); descI.value = task.description || "";
  const assigneeI = document.createElement("select");
  [...taskAssignee.options].forEach(o => { if (o.value !== "") assigneeI.appendChild(o.cloneNode(true)); });
  assigneeI.value = task.assigned_user_id || "";
  const startI = document.createElement("input"); startI.type = "date"; startI.value = fmtDate(task.start_date);
  const dueI = document.createElement("input"); dueI.type = "date"; dueI.value = fmtDate(task.due_date);
  const statusI = document.createElement("select");
  [
    ["todo", "To do"],
    ["in_progress", "In progress"],
    ["done", "Done"],
  ].forEach(([v, l]) => { const o = document.createElement("option"); o.value = v; o.textContent = l; statusI.appendChild(o); });
  statusI.value = task.status;
  const save = document.createElement("button"); save.textContent = "Save"; save.className = "btn";
  const cancel = document.createElement("button"); cancel.textContent = "Cancel"; cancel.className = "btn ghost";
  const del = document.createElement("button"); del.textContent = "Delete"; del.className = "btn danger";

  save.onclick = async () => {
    const { error } = await db.from("tasks").update({
      title: titleI.value.trim(), description: (descI.value.trim() || null), assigned_user_id: (assigneeI.value || null), start_date: (startI.value || null), due_date: (dueI.value || null), status: statusI.value,
    }).eq("id", task.id);
    if (error) return alert("Failed to update: " + error.message);
    await loadTasks();
  };
  cancel.onclick = async () => { await loadTasks(); };
  del.onclick = () => deleteTask(task.id);

  // Insert editor at top
  tasksList.prepend(editor);
  editor.append(titleI, descI, assigneeI, startI, dueI, statusI, save, cancel, del);
}

async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  const { error } = await db.from("tasks").delete().eq("id", id);
  if (error) return alert("Failed to delete: " + error.message);
  await loadTasks();
}

// Filters
filterUser.addEventListener("change", loadTasks);
filterStatus.addEventListener("change", loadTasks);
refreshUsersBtn.addEventListener("click", loadUsers);
refreshTasksBtn.addEventListener("click", loadTasks);

// Initial load
let currentSession = null;
let currentChallenge = null; // store MFA challenge for verification

function setSignedInUI(isSignedIn) {
  appSection.style.display = isSignedIn ? "block" : "none";
  authSection.style.display = "block";
  googleSignIn.style.display = isSignedIn ? "none" : "inline-block";
  signOutBtn.style.display = isSignedIn ? "inline-block" : "none";
  mfaBox.style.display = isSignedIn ? "block" : "none";
}

async function refreshDataIfSignedIn() {
  if (!currentSession) return;
  await loadUsers();
  await loadTasks();
}

// Auth: Google OAuth
googleSignIn?.addEventListener("click", async () => {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await db.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  if (error) alert("Google sign-in error: " + error.message);
});

signOutBtn?.addEventListener("click", async () => {
  await db.auth.signOut();
});

// MFA helpers (TOTP)
async function showFactors() {
  const { data, error } = await db.auth.mfa.listFactors();
  if (error) {
    console.warn("List factors error", error);
    return;
  }
  const hasTotp = data.totp?.length > 0;
  mfaEnrollBtn.style.display = hasTotp ? "none" : "inline-block";
}

mfaEnrollBtn?.addEventListener("click", async () => {
  // Enroll TOTP factor and display QR
  const { data, error } = await db.auth.mfa.enroll({ factorType: "totp" });
  if (error) return alert("MFA enroll failed: " + error.message);
  const { id, type, totp } = data;
  // Render QR from otpauth URI
  const uri = encodeURIComponent(totp.uri);
  mfaQrWrap.innerHTML = `<div>Scan with Google Authenticator, then enter the 6-digit code.</div><img alt="TOTP QR" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${uri}" />`;
  // start a challenge for verification
  const challenge = await db.auth.mfa.challenge({ factorId: id });
  if (challenge.error) return alert("Challenge failed: " + challenge.error.message);
  currentChallenge = challenge.data;
});

mfaChallengeBtn?.addEventListener("click", async () => {
  const { data, error } = await db.auth.mfa.listFactors();
  if (error) return alert(error.message);
  const totp = data.totp?.[0];
  if (!totp) return alert("No TOTP factor enrolled yet");
  const challenge = await db.auth.mfa.challenge({ factorId: totp.id });
  if (challenge.error) return alert("Challenge failed: " + challenge.error.message);
  currentChallenge = challenge.data;
  alert("2FA challenge started. Enter your 6-digit code and press Submit Code.");
});

mfaVerifyBtn?.addEventListener("click", async () => {
  const code = mfaCodeInput.value.trim();
  if (!currentChallenge) return alert("Start a challenge first (Enable 2FA or Verify 2FA)");
  if (!code) return;
  const { error } = await db.auth.mfa.verify({ challengeId: currentChallenge.id, code });
  if (error) return alert("Verification failed: " + error.message);
  currentChallenge = null;
  mfaQrWrap.innerHTML = "";
  mfaCodeInput.value = "";
  alert("2FA verified.");
});

// Auth state handling
db.auth.onAuthStateChange(async (event, session) => {
  currentSession = session;
  if (session?.user) {
    authStatus.textContent = `Signed in as ${session.user.email || session.user.id}`;
    setSignedInUI(true);
    await showFactors();
    await refreshDataIfSignedIn();
  } else {
    authStatus.textContent = "Signed out";
    setSignedInUI(false);
    usersList.innerHTML = "";
    tasksList.innerHTML = "";
  }
});

(async function init() {
  const { data } = await db.auth.getSession();
  currentSession = data.session;
  setSignedInUI(!!currentSession);
  if (currentSession) {
    authStatus.textContent = `Signed in as ${currentSession.user.email || currentSession.user.id}`;
    await showFactors();
    await refreshDataIfSignedIn();
  } else {
    authStatus.textContent = "Signed out";
  }
})();
