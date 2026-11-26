# Project-scoped engineering skills

The private source is `Willianfonseca7/personal-ai-skills.` (including the final dot). The approved revision is `e9c49f2775be9fe9ff25b522ddabbb66ca9586b4`. The upstream entries are draft. Approval covers local use in this project at the pinned revision.

| Skill | Purpose | Git blob |
|---|---|---|
| `context-optimizer` | Keep handoffs concise while preserving requirements and evidence. | `0c7e970c95ecd2f3573408be1ed41e95ad95d812` |
| `technical-planner` | Plan work with dependencies, acceptance checks and rollback. | `a0f6e6d82d23d6d2fb6cbb0f6df569f0e4060268` |
| `typescript-expert` | Review TypeScript types, contracts and runtime validation. | `3f8ffa720692b83975cb14b3007800ce5d4ced49` |

Installation is optional and requires authorized access to the source. The [engineering workflow](engineering-workflow.md) governs roles and approvals. Load only the relevant skills and sections for the current task. Share compact results and point to earlier evidence when it remains valid. Keep installation project-scoped.

## Install locally

Run from the Invest-Agent Git root with a POSIX shell. Set `skills_repo` to an authorized checkout. Repeat the example with each name and blob from the table. Keep the checkout and extracted instructions private.

```sh
(
  set -euC
  umask 077
  skills_repo='/path/to/authorized/personal-ai-skills'
  sha='e9c49f2775be9fe9ff25b522ddabbb66ca9586b4'
  name='context-optimizer'
  expected='0c7e970c95ecd2f3573408be1ed41e95ad95d812'
  dest=".agents/skills/$name/SKILL.md"

  test -z "$(git rev-parse --show-prefix)"
  test "$(git -C "$skills_repo" rev-parse --verify "$sha:skills/$name/SKILL.md")" = "$expected"
  for path in .agents .agents/skills ".agents/skills/$name" "$dest"; do
    test ! -L "$path"
  done
  test ! -e "$dest"
  test -z "$(git ls-files -- "$dest")"
  git check-ignore -v -- "$dest"
  mkdir -p ".agents/skills/$name"
  git -C "$skills_repo" cat-file blob "$expected" > "$dest"
  test "$(git hash-object --no-filters "$dest")" = "$expected"
)
```

If a check fails, inspect the local path before retrying. Keep private skill text out of patches, commits and public PR descriptions.

## Validate

Start a fresh Codex session from the project root. Confirm the three names in `/skills` and invoke each explicitly on a synthetic task. Confirm that a session outside the Git tree omits the project skills when no other installation supplies them. Claude Code integration can be evaluated separately using project-relative links after approval.

## Update or roll back

Review the three files and any dependency changes at a candidate commit. Test in isolation before approving the new revision. After approval, update the SHA and blob IDs here, verify the old local files against the previous IDs, and replace only those managed files with the new approved blobs. Repeat the integrity, Git ignore and session checks. Fetching the private source leaves the extracted local files unchanged.

For rollback, restore the prior approved SHA and blob IDs, verify the current files are the managed copies and re-extract the previous blobs. To disable the integration, remove only the three verified local files.
