---
name: Handling Reserved Names on Windows
description: Best practices for removing files or folders with reserved names like 'nul', 'con', 'prn', 'aux' on Windows.
---

# Handling Reserved Names on Windows (git/filesystem)

On Windows, certain names are reserved by the system (e.g., `nul`, `con`, `prn`, `aux`, `com1`, `lpt1`). Attempting to delete or modify these using standard commands often fails because the shell treats them as devices rather than files.

## Removing Reserved Files/Folders

To remove these entries, you must use the Win32 namespace prefix `\\?\` which tells the Windows API to disable all string parsing and send the path directly to the file system.

### Steps to Remove

1. **Identify the Type**: Determine if it's a file or a folder.
2. **Use Extended Path Syntax**:
   - **For Files**:
     ```powershell
     del "\\?\C:\path\to\your\repo\nul"
     ```
   - **For Folders**:
     ```powershell
     rd /s /q "\\?\C:\path\to\your\repo\nul"
     ```

### Handling in Git

If these files were accidentally committed (e.g., from a Linux environment), you need to remove them from the git index:

#### Remove from Git Index (file is tracked)
```bash
git rm --cached nul
```

#### Remove from Git Index (force removal)
```bash
git rm -f nul
```

#### Add to .gitignore to prevent future tracking
```bash
echo nul >> .gitignore
```

## Complete Workflow: Remove Reserved Name & Sync with Remote

If you have a reserved name file causing git sync issues:

1. **Remove from Git index**:
   ```bash
   git rm --cached nul
   ```

2. **Add any new files** (like this skill):
   ```bash
   git add .agent/skills/git_reserved_names/SKILL.md
   ```

3. **Commit the removal**:
   ```bash
   git commit -m "Remove reserved name file and add handling skill"
   ```

4. **Pull remote changes with rebase**:
   ```bash
   git pull --rebase origin main
   ```

5. **Push your changes**:
   ```bash
   git push origin main
   ```

6. **Remove from filesystem** (if still present locally):
   ```powershell
   Remove-Item -LiteralPath "\\?\C:\full\path\to\nul" -Force
   ```

## Best Practices

- Always use absolute paths when using the `\\?\` prefix.
- Be extremely careful as this syntax bypasses many safety checks.
- If you encounter these in a git repo, add them to `.gitignore` if they are side effects of a build process, or fix the source if they are accidental.
- When syncing with remote repositories, remove reserved names from the index before pulling to avoid conflicts.
