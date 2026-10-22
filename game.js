// CS2Wordle — a daily Wordle-style game where the answer length is hidden.
// Every answer starts with "CS2", which is already filled in.

const PREFIX = "CS2";
const MAX_GUESSES = 8;
// Total characters including CS2. Longer than any answer
// (CS2 + up to 9 letters), so the cap doesn't give the length away.
const MAX_LENGTH = 14;
const STORAGE_KEY = "cs2wordle-daily";

// Score a guess against the answer (both already upper-cased).
// Lengths may differ. Returns one of "correct" | "present" | "absent" per
// guess character, handling repeated letters the same way Wordle does.
function scoreGuess(guess, answer) {
  const result = new Array(guess.length).fill("absent");
  const remaining = {};

  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "correct";
    } else {
      remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "correct") continue;
    const ch = guess[i];
    if (remaining[ch] > 0) {
      result[i] = "present";
      remaining[ch]--;
    }
  }

  return result;
}

// Position of a calendar date in the word list, counting days as if every
// year were a leap year, so each date keeps the same word every year.
function dayIndex(date) {
  const start = Date.UTC(2000, 0, 1);
  const day = Date.UTC(2000, date.getMonth(), date.getDate());
  return Math.round((day - start) / 86400000);
}

function dailyAnswer(date, words) {
  const w = words[dayIndex(date)];
  return PREFIX + w[0].toUpperCase() + w.slice(1);
}

function dateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join("-");
}

if (typeof module !== "undefined") {
  module.exports = { PREFIX, MAX_GUESSES, MAX_LENGTH, scoreGuess, dayIndex, dailyAnswer };
}

if (typeof document !== "undefined") {
  const boardEl = document.getElementById("board");
  const keyboardEl = document.getElementById("keyboard");
  const toastEl = document.getElementById("toast");
  const dateEl = document.getElementById("date");

  // A page can lock the answer by setting window.FIXED_ANSWER first.
  // Such a page doesn't save progress, so it starts fresh on every visit.
  const fixedAnswer = window.FIXED_ANSWER || null;

  const KEY_ROWS = [
    "1234567890".split(""),
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "BACK"],
  ];
  const RANK = { absent: 1, present: 2, correct: 3 };

  let today = "";
  let answer = "";
  let answerDisplay = "";
  let guesses = []; // [{ text, score }], text includes the prefix
  let current = ""; // what the player typed after the prefix
  let over = false;
  let keyStatus = {};

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.date === today && Array.isArray(saved.guesses)) return saved.guesses;
    } catch (e) {}
    return [];
  }

  function save() {
    if (fixedAnswer) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: today, guesses: guesses.map((g) => g.text) })
      );
    } catch (e) {}
  }

  function startDay() {
    const now = new Date();
    today = dateKey(now);
    answerDisplay = fixedAnswer || dailyAnswer(now, DAILY_WORDS);
    answer = answerDisplay.toUpperCase();
    dateEl.textContent = now.toLocaleDateString(undefined, { month: "long", day: "numeric" });

    guesses = [];
    current = "";
    over = false;
    keyStatus = {};
    showToast("");
    for (const text of fixedAnswer ? [] : load()) record(String(text).toUpperCase());
    render();
  }

  function showToast(msg) {
    toastEl.textContent = msg;
  }

  // Add a guess to the board and work out whether the game is over.
  function record(text) {
    if (over) return;
    const score = scoreGuess(text, answer);
    guesses.push({ text, score });
    // Colour the keyboard from what the player typed, not the fixed prefix.
    for (let i = PREFIX.length; i < text.length; i++) {
      const ch = text[i];
      if ((RANK[score[i]] || 0) > (RANK[keyStatus[ch]] || 0)) keyStatus[ch] = score[i];
    }
    if (text === answer) {
      over = true;
      showToast(`You got it in ${guesses.length}! It was ${answerDisplay}. New word tomorrow.`);
    } else if (guesses.length >= MAX_GUESSES) {
      over = true;
      showToast(`Out of guesses. It was ${answerDisplay}. New word tomorrow.`);
    }
  }

  function tile(ch, cls) {
    const el = document.createElement("div");
    el.className = "tile " + cls;
    el.textContent = ch;
    return el;
  }

  // anim: "add" pops the newest box, "reveal" flips the last submitted row.
  function render(anim) {
    boardEl.textContent = "";

    // Size boxes so the longest row on screen fits. This depends only on
    // what the player typed, never on the answer.
    const widest = Math.max(
      6,
      over ? 0 : Math.min(PREFIX.length + current.length + 1, MAX_LENGTH),
      ...guesses.map((g) => g.text.length)
    );
    boardEl.style.setProperty(
      "--tile",
      `min(52px, calc((100vw - 32px - ${widest - 1} * var(--gap)) / ${widest}))`
    );

    guesses.forEach((g, r) => {
      const row = document.createElement("div");
      row.className = "row";
      const revealing = anim === "reveal" && r === guesses.length - 1;
      [...g.text].forEach((ch, i) => {
        const t = tile(ch, g.score[i]);
        if (revealing) {
          t.classList.add("reveal");
          t.style.animationDelay = i * 100 + "ms";
        }
        row.appendChild(t);
      });
      boardEl.appendChild(row);
    });

    if (!over) {
      // Current row: the fixed prefix, typed letters, then one empty box.
      const row = document.createElement("div");
      row.className = "row current";
      for (const ch of PREFIX) row.appendChild(tile(ch, "correct"));
      [...current].forEach((ch, i) => {
        const t = tile(ch, "filled");
        if (anim === "add" && i === current.length - 1) t.classList.add("pop");
        row.appendChild(t);
      });
      if (PREFIX.length + current.length < MAX_LENGTH) {
        const t = tile("", "cursor");
        if (anim === "add") t.classList.add("pop");
        row.appendChild(t);
      }
      boardEl.appendChild(row);

      // Remaining guesses: a single placeholder each, so no length hint.
      for (let r = guesses.length + 1; r < MAX_GUESSES; r++) {
        const row = document.createElement("div");
        row.className = "row";
        row.appendChild(tile("", "future"));
        boardEl.appendChild(row);
      }
    }

    renderKeyboard();

    // Keep the row being typed (or the final row) in view.
    const focusRow = boardEl.querySelector(".row.current") || boardEl.lastElementChild;
    if (focusRow) focusRow.scrollIntoView({ block: "nearest" });
  }

  function renderKeyboard() {
    keyboardEl.textContent = "";
    for (const keys of KEY_ROWS) {
      const row = document.createElement("div");
      row.className = "kb-row";
      for (const k of keys) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "key";
        btn.dataset.key = k;
        if (k === "ENTER" || k === "BACK") {
          btn.classList.add("wide");
          btn.textContent = k === "BACK" ? "⌫" : "Enter";
          btn.setAttribute("aria-label", k === "BACK" ? "Backspace" : "Enter");
        } else {
          btn.textContent = k;
          if (keyStatus[k]) btn.classList.add(keyStatus[k]);
        }
        row.appendChild(btn);
      }
      keyboardEl.appendChild(row);
    }
  }

  function shakeCurrentRow() {
    const row = boardEl.querySelector(".row.current");
    if (!row) return;
    row.classList.remove("shake");
    void row.offsetWidth; // restart the animation
    row.classList.add("shake");
  }

  function addChar(ch) {
    if (over || PREFIX.length + current.length >= MAX_LENGTH) return;
    current += ch;
    render("add");
  }

  function removeChar() {
    if (over || !current) return;
    current = current.slice(0, -1);
    render();
  }

  function submit() {
    if (over) return;
    if (!current) {
      showToast("Type the rest of the word after CS2");
      setTimeout(() => !over && toastEl.textContent.startsWith("Type") && showToast(""), 1500);
      shakeCurrentRow();
      return;
    }
    record(PREFIX + current);
    current = "";
    save();
    render("reveal");
  }

  function handleKey(k) {
    if (k === "ENTER") submit();
    else if (k === "BACK") removeChar();
    else if (/^[A-Z0-9]$/.test(k)) addChar(k);
  }

  keyboardEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".key");
    if (btn) {
      handleKey(btn.dataset.key);
      btn.blur();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleKey("ENTER");
    } else if (e.key === "Backspace") {
      handleKey("BACK");
    } else if (e.key.length === 1) {
      handleKey(e.key.toUpperCase());
    }
  });

  // If the page stays open past midnight, switch to the new day's word.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && dateKey(new Date()) !== today) startDay();
  });

  startDay();
}
