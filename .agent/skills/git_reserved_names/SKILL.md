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

If these files were accidentally committed (e.g., from a Linux environment), you should also remove them from the git index:

```bash
git rm -f nul
```

## Best Practices

- Always use absolute paths when using the `\\?\` prefix.
- Be extremely careful as this syntax bypasses many safety checks.
- If you encounter these in a git repo, add them to `.gitignore` if they are side effects of a build process, or fix the source if they are accidental.
