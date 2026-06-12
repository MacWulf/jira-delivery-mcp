# Stakeholder Detection

Do not start with a full stakeholder matrix.

## First question

Ask only whether there is more than one meaningful participant.

`Besides you, is there another meaningful participant in the project or decision, or is this essentially owned by one person?`

Ask this at most once per discovery thread.

After it is answered:
- mark stakeholder presence as resolved
- write the result into the checkpoint summary
- do not ask the same presence question again unless the user contradicts the answer or switches to a clearly different process scope

## If single-owner

- set `stakeholder_model` to `single-owner`
- keep only:
  - main business source
  - likely validator if different
- skip further stakeholder decomposition
- do not reopen stakeholder presence later in the same discovery thread

## If multi-stakeholder

Map only the roles that matter:
- decision maker
- daily user
- input provider
- approver
- constraining actor

Do not force all roles if the user context does not need them.
Only ask role follow-ups when the missing role information changes scope, handoff, or validation ownership.
