# CS2Wordle

A Wordle-style guessing game where you don't know how long the answer is.
The board starts with a single empty box, and a new one appears each time
you type.

- Letters and numbers both count; case doesn't matter.
- Green means right character in the right spot, yellow means it's in the
  answer somewhere else, grey means it's not in it (repeated letters follow
  normal Wordle rules).
- 8 guesses, up to 12 characters per guess.

## Play

Open `index.html` in a browser. No build step or server needed.

## Changing the answers

Edit the `ANSWERS` list at the top of `game.js`. `MAX_GUESSES` and
`MAX_LENGTH` are right below it. Keep `MAX_LENGTH` above your longest answer
so the cap doesn't give the length away.

## Secret page

`secret/index.html` is the same game with the answer locked to `CS250`. It
shares `game.js` and `style.css` with the main page and sets
`window.FIXED_ANSWER` before loading the game. Note that anyone who views the
page source can see the answer.
