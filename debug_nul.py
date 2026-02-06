import os
import shutil

root = r'c:\Users\Mike\Documents\paiepro'
target = 'nul'
target_full = os.path.join(root, target)
target_extended = r'\\?\{}'.format(target_full)

print(f"Checking for {target_full}")
if os.path.exists(target_full):
    print("os.path.exists says it exists")
else:
    print("os.path.exists says it does NOT exist")

try:
    entries = os.listdir(root)
    print(f"Entries in root: {entries}")
    matches = [e for e in entries if 'nul' in e.lower()]
    print(f"Matches for 'nul': {matches}")
except Exception as e:
    print(f"Error listing dir: {e}")

def try_delete(path):
    print(f"Attempting to delete {path}")
    try:
        if os.path.isfile(path):
            os.remove(path)
            print("Successfully removed as file")
        elif os.path.isdir(path):
            shutil.rmtree(path)
            print("Successfully removed as directory")
        else:
            print("Neither file nor directory, trying os.unlink")
            os.unlink(path)
            print("Successfully unlinked")
    except Exception as e:
        print(f"Failed to delete {path}: {e}")

try_delete(target_full)
try_delete(target_extended)

# Try renaming if delete fails
if os.path.exists(target_extended):
    print("Still exists, trying rename")
    try:
        os.rename(target_extended, os.path.join(root, 'deleted_nul'))
        print("Successfully renamed")
    except Exception as e:
        print(f"Failed to rename: {e}")
