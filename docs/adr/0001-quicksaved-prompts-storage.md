# Quicksaved Prompts stored in a plain JSON file, not pi session entries

Quicksaved Prompts persist across sessions and projects as a plain JSON array
in one file under the pi agent dir (`~/.pi/agent/quicksave.json`), written
atomically on every mutation and re-read on each Ctrl-s. We deliberately
rejected the pi session-entry model (`pi.appendEntry` plus replay on session
start, used by the prompt-save inspiration): session entries live inside one
session file, are untested against compaction pruning, and would make
quick-save a session-local scratchpad rather than a personal library. A global
file costs one small read/write per keypress and keeps the store trivially
inspectable and migratable.
