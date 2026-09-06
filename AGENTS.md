# pi-quicksave

A pi coding-agent extension: one keyboard shortcut quick-saves the composer text into Quicksaved Prompts, a persistent newest-first collection, and a picker overlay browses, fills, copies, edits, and deletes entries.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for this repo (`j4shu/pi-quicksave`, via the `gh` CLI).

### Triage labels

Five canonical roles, each label string equal to its name: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.

### Domain docs

Single-context repo. The domain glossary is the `## Language` section of this file, so every pi session sees the vocabulary.

## Language

**Quick-save**:
Press Ctrl-s with non-empty composer text: the text is copied to Quicksaved Prompts and the composer is cleared. The cleared composer leaves the saved prompt one Ctrl-s away (open the picker, Enter fills it back), so the clear needs no undo.
_Avoid_: save (pi already has model/thinking "save" actions)

**Composer**:
Pi's prompt input. The extension's only listening surface is here: Ctrl-s fires nowhere else.
_Avoid_: current prompt, input area

**Quicksaved Prompts**:
The persistent collection of saved prompt texts, most recent first. Duplicate texts are allowed; each quick-save adds one entry.
_Avoid_: prompt list, prompt library, library, saved prompts, prompt list picker

**Entry**:
A single saved prompt in Quicksaved Prompts. Duplicates are distinct entries, so identity is position in the list, not text.
_Avoid_: prompt, saved prompt, item

**Picker**:
The overlay view that lists Quicksaved Prompts above the composer. It opens only when the composer is empty; it closes on fill or Esc.
_Avoid_: prompt list picker (conflates the store with the view)

**Fill**:
The Enter action in the picker: copy the selected entry's text into the composer and close the picker.
_Avoid_: insert, paste (both imply a cursor or clipboard)
