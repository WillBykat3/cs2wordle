# CS2Wordle

A daily Wordle-style guessing game. Every answer starts with "CS2", which is
already filled in (in green), and you fill in the rest. Each row has exactly
as many boxes as the day's answer, like normal Wordle.

- One word per calendar day, based on the player's own date. The same date
  gets the same word every year.
- Green means right character in the right spot, yellow means it's in the
  answer somewhere else, grey means it's not in it (repeated letters follow
  normal Wordle rules).
- 8 guesses. A guess has to fill every box.
- Progress is saved in the browser, so refreshing doesn't reset the day.
- A "How to play" popup opens on a player's first visit and from the `?`
  button. After the game, a card shows the result and a countdown to the next
  word.
- Calm, minimal look in the Outfit font (from Google Fonts, with system
  fonts as a fallback). It follows the device's light or dark setting.

## Play

Open `index.html` in a browser, or visit the GitHub Pages site. No build step
or server needed.

## The word list

`words.js` holds 366 adjectives, one per day (index 59 is February 29, only
used in leap years). Each answer is "CS2" plus the day's word, e.g.
`shifty` becomes CS2Shifty.

They were chosen like this:

1. Hand-picked adjectives that work as a name after "CS2", each confirmed to
   be in the adjective list from
   [taikuukaits/SimpleWordlists](https://github.com/taikuukaits/SimpleWordlists)
   (`Wordlist-Adjectives-All.txt`).
2. Ranked by how common they are in everyday speech, using
   [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords)
   (`en_50k.txt`, built from film subtitles), and the 362 most common kept.
3. Added the four words from the original answers: shifty, shitty, smelly
   and zesty.
4. Shuffled into a fixed random order so the calendar isn't predictable.

To change a day's word, edit it in `words.js`. Keep it to letters only.
Shorter words get bigger boxes: a 9-letter word makes 12 boxes, which are
about 23px wide on a small phone.

## Secret page

`secret/index.html` looks like the main page, but the answer is always
`CS250` (CS2 is filled in, so you type `50`), so its rows have 5 boxes. It shares the main
page's files and sets `window.FIXED_ANSWER` before loading the game. It
doesn't save progress, so it starts fresh on every visit, and it never
touches the main game's saved progress. Anyone who views the page source can
see the answer.

## Secret code

Typing `Will2Tuff` (any case, physical or on-screen keyboard) shows a banner
at the top with the day's answer for 5 seconds. The code's letters are
removed from the row, so the game carries on as before. On the secret page
the banner shows CS250. Like everything else here, the code is visible to
anyone who reads `game.js`.

## Updating the game

Browsers keep their saved copy of `words.js`, `game.js` and `style.css` for
about 10 minutes. When you change any of them, bump the `?v=` number where
both `index.html` and `secret/index.html` load them, so players get the new
version straight away.
