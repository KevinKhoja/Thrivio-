/* Thrivio: plain JavaScript, no framework. State is kept in localStorage so the demo works without a server. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const KEY = "thrivio:v1";

  /* ---------------- data ---------------- */
  const CLASSES = ["Chemistry", "Maths", "Physics", "Biology", "English", "Art", "History", "PE", "Computer Science"];
  const INTERESTS = ["basketball", "football", "art", "gaming", "music", "chess", "coding", "reading", "swimming", "drama"];

  const STUDENTS = [
    { id: "priya", first: "Priya", full: "Priya Nair", grade: 9, classes: ["Chemistry", "Maths"], interests: ["basketball", "art"] },
    { id: "zayn", first: "Zayn", full: "Zayn Ahmed", grade: 10, classes: ["Art", "English"], interests: ["art", "gaming", "music"] },
    { id: "aarav", first: "Aarav", full: "Aarav Mehta", grade: 9, classes: ["Maths", "Physics"], interests: ["chess", "coding", "basketball"] },
    { id: "sana", first: "Sana", full: "Sana Qureshi", grade: 10, classes: ["English", "Biology"], interests: ["reading", "drama", "music"] },
    { id: "leo", first: "Leo", full: "Leo Fernandes", grade: 9, classes: ["PE", "Chemistry"], interests: ["football", "swimming", "basketball"] },
    { id: "mira", first: "Mira", full: "Mira Das", grade: 10, classes: ["Physics", "Computer Science"], interests: ["coding", "gaming", "chess"] },
    { id: "noor", first: "Noor", full: "Noor Khan", grade: 9, classes: ["Biology", "Art"], interests: ["swimming", "art", "reading"] },
    { id: "ethan", first: "Ethan", full: "Ethan Roy", grade: 10, classes: ["History", "English"], interests: ["drama", "football", "music"] },
  ];

  // Every interest tag has at least one event, so the feed can always return one per tag.
  const EVENTS = {
    basketball: [{ name: "Lunchtime basketball", when: "Tuesday and Thursday, 12:30", where: "Main gym" }],
    football: [{ name: "Football club", when: "Wednesday, 3:45", where: "Back field" }],
    art: [{ name: "Art studio drop-in", when: "Monday, 3:45", where: "Art room 2" }],
    gaming: [{ name: "Board and video game club", when: "Thursday, 12:30", where: "Library annex" }],
    music: [{ name: "Open mic and jam room", when: "Friday, 12:30", where: "Music room" }],
    chess: [{ name: "Chess club", when: "Tuesday, 12:30", where: "Room 14" }],
    coding: [{ name: "Coding club", when: "Wednesday, 3:45", where: "Computer lab" }],
    reading: [{ name: "Book club", when: "Monday, 12:30", where: "Library" }],
    swimming: [{ name: "Swim club", when: "Friday, 3:45", where: "School pool" }],
    drama: [{ name: "Drama workshop", when: "Thursday, 3:45", where: "Hall stage" }],
  };

  const REPLIES = [
    "Hey! Nice to meet you. It has been good so far, just still learning where everything is.",
    "Ha, same here. Want to sit together at lunch this week?",
    "Sounds great. I will save you a seat.",
  ];

  const BADGES = [
    { id: "door", icon: "1", name: "Open door", text: "You sent a buddy request." },
    { id: "hello", icon: "2", name: "First hello", text: "You sent your first message." },
    { id: "friend", icon: "3", name: "New friend", text: "A buddy said yes to your request." },
    { id: "club", icon: "4", name: "Club connector", text: "You looked at clubs that match your interests." },
  ];

  /* ---------------- state ---------------- */
  const defaults = () => ({ profile: null, requests: {}, messages: {}, current: null, skip: 0, visitedEvents: false });

  function load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch {
      /* storage blocked: fall back to defaults */
    }
    return defaults();
  }

  let S = load();

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(S));
    } catch {
      /* ignore */
    }
  }

  /* ---------------- helpers ---------------- */
  function el(tag, props = {}, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const kid of kids) if (kid) node.append(kid);
    return node;
  }

  function chips(list) {
    return el("div", { class: "chips" }, ...list.map((t) => el("span", { class: "chip", text: t })));
  }

  function link(href, text, cls = "btn") {
    return el("a", { href, class: cls, text });
  }

  const studentById = (id) => STUDENTS.find((s) => s.id === id);

  /* Matching: only suggest a buddy who shares at least two things (classes plus interests). */
  function sharedWith(student) {
    const p = S.profile;
    return {
      classes: student.classes.filter((c) => p.classes.includes(c)),
      interests: student.interests.filter((i) => p.interests.includes(i)),
    };
  }

  function candidates() {
    if (!S.profile) return [];
    return STUDENTS.map((s) => ({ s, shared: sharedWith(s) }))
      .map((m) => ({ ...m, count: m.shared.classes.length + m.shared.interests.length }))
      .filter((m) => m.count >= 2)
      .sort((a, b) => b.count - a.count);
  }

  const isAccepted = (id) => S.requests[id] && S.requests[id].status === "accepted";

  /* Staged disclosure: first name until both sides have accepted. */
  const shownName = (s) => (isAccepted(s.id) ? `${s.full}, grade ${s.grade}` : s.first);

  function needProfile(view) {
    view.append(
      el("div", { class: "card" },
        el("h2", { text: "Set up your profile first" }),
        el("p", { text: "Thrivio needs your classes and interests to find someone you share things with." }),
        el("div", { class: "row" }, link("./index.html", "Go to Home"))
      )
    );
  }

  /* ---------------- Home ---------------- */
  function renderHome(view) {
    view.textContent = "";
    if (!S.profile) return renderProfileForm(view);

    view.append(el("p", { class: "lead", text: `Hey ${S.profile.name}, ready to meet someone new?` }));
    const list = candidates();
    if (list.length) {
      const { s, shared } = list[S.skip % list.length];
      view.append(
        el("div", { class: "card blue" },
          el("h2", { text: "Suggested buddy" }),
          el("div", { class: "buddy" },
            el("div", { class: "avatar", "aria-hidden": "true", text: s.first[0] }),
            el("div", {},
              el("p", { text: `${s.first} shares ${shared.classes.length + shared.interests.length} things with you` }),
              chips([...shared.classes, ...shared.interests])
            )
          ),
          el("div", { class: "row" }, link("./matches.html", "See your match"))
        )
      );
    } else {
      view.append(el("div", { class: "card" }, el("p", { text: "No match with two things in common yet. Add another class or interest below." })));
    }

    const first = S.profile.interests[0];
    if (first && EVENTS[first]) {
      const ev = EVENTS[first][0];
      view.append(el("div", { class: "card event" }, el("p", { text: `This week: ${ev.name}, ${ev.when}` })));
    }
    view.append(el("button", { class: "btn ghost small", type: "button", text: "Edit my profile", onclick: () => { S.profile = null; save(); renderHome(view); } }));
  }

  function renderProfileForm(view) {
    const form = el("form", { class: "card", novalidate: "" });
    form.append(
      el("h2", { text: "Tell us a little about you" }),
      el("div", { class: "field" },
        el("label", { for: "name", text: "First name" }),
        el("input", { type: "text", id: "name", name: "name", autocomplete: "given-name", maxlength: "30" })
      )
    );

    const classBox = el("fieldset", {}, el("legend", { text: "Your classes" }));
    const classPick = el("div", { class: "pick" });
    CLASSES.forEach((c) => classPick.append(el("label", {}, el("input", { type: "checkbox", name: "classes", value: c }), el("span", { text: c }))));
    classBox.append(classPick);

    const intBox = el("fieldset", {}, el("legend", { text: "Things you like" }));
    const intPick = el("div", { class: "pick" });
    INTERESTS.forEach((i) => intPick.append(el("label", {}, el("input", { type: "checkbox", name: "interests", value: i }), el("span", { text: i }))));
    intBox.append(intPick);

    const msg = el("p", { class: "status warn", role: "alert", hidden: "" });
    form.append(classBox, intBox, msg, el("button", { class: "btn", type: "submit", text: "Save and find a buddy" }));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#name", form).value.trim();
      const classes = [...form.querySelectorAll('input[name="classes"]:checked')].map((i) => i.value);
      const interests = [...form.querySelectorAll('input[name="interests"]:checked')].map((i) => i.value);
      if (!name || classes.length < 1 || interests.length < 1) {
        msg.hidden = false;
        msg.textContent = "Add your first name, at least one class and at least one interest so we can find a match.";
        return;
      }
      S = { ...defaults(), profile: { name, classes, interests } };
      save();
      renderHome(view);
    });
    view.append(form);
  }

  /* ---------------- Matches ---------------- */
  function renderMatches(view) {
    view.textContent = "";
    if (!S.profile) return needProfile(view);
    const list = candidates();
    if (!list.length) {
      view.append(el("div", { class: "card" }, el("p", { text: "No one shares two things with you yet. Add another class or interest on Home." }), el("div", { class: "row" }, link("./index.html", "Edit my profile"))));
      return;
    }
    const { s, shared } = list[S.skip % list.length];
    const req = S.requests[s.id];

    const card = el("div", { class: "card blue" });
    card.append(
      el("div", { class: "buddy" },
        el("div", { class: "avatar", "aria-hidden": "true", text: s.first[0] }),
        el("div", {},
          el("h2", { text: shownName(s) }),
          el("p", { text: "You both have:" }),
          chips([...shared.classes, ...shared.interests])
        )
      )
    );

    if (!req) {
      card.append(
        el("div", { class: "row" },
          el("button", { class: "btn", type: "button", text: "Send request", onclick: () => sendRequest(s.id, view) }),
          list.length > 1 ? el("button", { class: "btn ghost", type: "button", text: "Show another", onclick: () => { S.skip += 1; save(); renderMatches(view); } }) : null
        )
      );
    } else if (req.status === "pending") {
      card.append(
        el("p", { class: "status", text: `Request sent privately. Only you and ${s.first} can see it. Waiting for ${s.first} to say yes.` }),
        el("div", { class: "row" },
          el("button", { class: "btn ghost small", type: "button", text: "Demo: pretend they said yes", onclick: () => { S.requests[s.id].status = "accepted"; save(); renderMatches(view); } })
        )
      );
    } else {
      card.append(
        el("p", { class: "status", text: `${s.first} said yes. You can now see their full name and grade.` }),
        el("div", { class: "row" }, link("./icebreakers.html", "Say hello"))
      );
    }
    view.append(card);
  }

  function sendRequest(id, view) {
    S.requests[id] = { status: "pending" };
    S.current = id;
    save();
    renderMatches(view);
  }

  /* ---------------- Icebreakers and chat ---------------- */
  const CONTACT = /[\w.+-]+@[\w-]+\.[\w.]+|@\w{2,}|(?:\+?\d[\s().-]?){7,}|instagram|snapchat|whatsapp|telegram|tiktok|discord/i;

  function icebreakerOptions(s) {
    const sh = sharedWith(s);
    const cls = sh.classes[0];
    const tag = sh.interests[0];
    const a = cls ? `Hey ${s.first}! I saw we are both in ${cls}. How are you finding it so far?` : `Hey ${s.first}! I think we have some things in common. How is your week going?`;
    const b = tag ? `Hi ${s.first}! I am into ${tag} too. Do you play or follow it much?` : `Hi ${s.first}! What do you like to do at lunch?`;
    const c = `Hey ${s.first}, I am still finding my way around. What is your favourite thing about this school?`;
    return [a, b, c];
  }

  function renderIcebreakers(view) {
    view.textContent = "";
    if (!S.profile) return needProfile(view);
    const s = S.current && S.requests[S.current] ? studentById(S.current) : null;
    if (!s) {
      view.append(el("div", { class: "card" }, el("p", { text: "Send a buddy request first, then your icebreakers will appear here." }), el("div", { class: "row" }, link("./matches.html", "Go to Matches"))));
      return;
    }
    const msgs = (S.messages[s.id] = S.messages[s.id] || []);

    view.append(
      el("div", { class: "card blue" },
        el("h2", { text: `Say hello to ${shownName(s)}` }),
        el("p", { text: "Tap one to send it. It is your choice." }),
        el("div", { class: "options" }, ...icebreakerOptions(s).map((t) => el("button", { class: "option", type: "button", text: t, onclick: () => sendMessage(s, t, view) })))
      )
    );

    const thread = el("div", { class: "thread", role: "log", "aria-label": "Messages" });
    msgs.forEach((m, i) => {
      const bubble = el("div", { class: `msg ${m.from === "me" ? "me" : ""} ${m.flagged ? "flagged" : ""}` }, el("span", { text: m.text }));
      bubble.append(
        m.flagged
          ? el("span", { class: "flag", text: "Flagged for a counsellor" })
          : el("button", { class: "flag", type: "button", text: "Flag this message", onclick: () => { m.flagged = true; save(); renderIcebreakers(view); } })
      );
      thread.append(bubble);
    });
    if (!msgs.length) thread.append(el("p", { class: "lead", text: "No messages yet." }));

    const warn = el("p", { class: "status warn", role: "alert", hidden: "" });
    const form = el("form", { class: "send", novalidate: "" },
      el("label", { class: "sr-only", for: "msg", text: "Write a message" }),
      el("input", { type: "text", id: "msg", maxlength: "200", placeholder: "Write a message" }),
      el("button", { class: "btn", type: "submit", text: "Send" })
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = $("#msg", form).value.trim();
      if (!text) return;
      if (CONTACT.test(text)) {
        warn.hidden = false;
        warn.textContent = "For your safety, keep chat inside Thrivio. Phone numbers, emails and social media names can not be shared.";
        return;
      }
      sendMessage(s, text, view);
    });

    view.append(el("div", { class: "card" }, el("h2", { text: `Chat with ${s.first}` }), thread, warn, form, counsellorPanel()));
  }

  function counsellorPanel() {
    const flagged = [];
    for (const [id, list] of Object.entries(S.messages)) {
      list.forEach((m) => {
        if (m.flagged) flagged.push({ who: studentById(id).first, text: m.text });
      });
    }
    const box = el("details", {}, el("summary", { text: "Counsellor view (flagged messages only)" }));
    if (!flagged.length) box.append(el("p", { text: "Nothing flagged. Unflagged chats are never shown here." }));
    flagged.forEach((f) => box.append(el("p", { text: `With ${f.who}: "${f.text}"` })));
    return box;
  }

  function sendMessage(s, text, view) {
    const list = (S.messages[s.id] = S.messages[s.id] || []);
    list.push({ from: "me", text, flagged: false });
    save();
    renderIcebreakers(view);
    const theirs = list.filter((m) => m.from === "them").length;
    if (theirs < REPLIES.length) {
      window.setTimeout(() => {
        list.push({ from: "them", text: REPLIES[theirs], flagged: false });
        save();
        if (document.body.dataset.page === "icebreakers") renderIcebreakers(view);
      }, 700);
    }
    const input = $("#msg");
    if (input) input.focus();
  }

  /* ---------------- Recognition ---------------- */
  function earned(id) {
    if (id === "door") return Object.keys(S.requests).length > 0;
    if (id === "hello") return Object.values(S.messages).some((l) => l.some((m) => m.from === "me"));
    if (id === "friend") return Object.values(S.requests).some((r) => r.status === "accepted");
    if (id === "club") return S.visitedEvents === true;
    return false;
  }

  function renderRecognition(view) {
    view.textContent = "";
    const grid = el("div", { class: "grid" });
    BADGES.forEach((b) => {
      const got = earned(b.id);
      grid.append(
        el("div", { class: `card badge ${got ? "" : "locked"}` },
          el("div", { class: "medal", "aria-hidden": "true", text: b.icon }),
          el("h2", { text: b.name }),
          el("p", { text: b.text }),
          el("p", { text: got ? "Earned. Thank you for being kind." : "Not earned yet." })
        )
      );
    });
    view.append(grid);
  }

  /* ---------------- Events ---------------- */
  function renderEvents(view) {
    view.textContent = "";
    if (!S.profile) return needProfile(view);
    S.visitedEvents = true;
    save();
    S.profile.interests.forEach((tag) => {
      view.append(el("h2", { class: "tag-heading", text: tag }));
      (EVENTS[tag] || []).forEach((ev) =>
        view.append(el("div", { class: "card event" }, el("h2", { text: ev.name }), el("p", { text: `${ev.when} at ${ev.where}` })))
      );
    });
  }

  /* ---------------- start ---------------- */
  const RENDER = { home: renderHome, matches: renderMatches, icebreakers: renderIcebreakers, recognition: renderRecognition, events: renderEvents };

  document.addEventListener("DOMContentLoaded", () => {
    const view = $("#view");
    const draw = RENDER[document.body.dataset.page];
    if (view && draw) draw(view);
  });
})();
