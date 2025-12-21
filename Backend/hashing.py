#!/usr/bin/env python
"""
Password Hash Converter Script (Converter 2)

Purpose: Admin2 (senior IT) can convert a plain text password to Django hashed password
for direct insertion into Supabase.

Usage:
    python hashing.py

The script will:
    1. Prompt for the desired password (input is hidden for security)
    2. Hash it using Django's make_password() function
    3. Output the hashed password to the terminal

Note: This script requires Django environment setup. Run from the Backend directory
where manage.py is located, or ensure Django settings are configured.
"""

import os
import sys
import getpass

# Add the project directory to Python path so Django can find settings
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crash_backend.settings')

import django
django.setup()

from django.contrib.auth.hashers import make_password


def main():
    print("=" * 60)
    print("Password Hash Converter (Django PBKDF2)")
    print("=" * 60)
    print()
    print("This script converts a plain text password to Django hashed password.")
    print("The hashed password can be inserted directly into Supabase.")
    print("Typing the password will be hidden for security.")
    print()
    
    # Prompt for password (hidden input for security)
    password = getpass.getpass("Enter password to hash: ")
    
    if not password:
        print("\nError: Password cannot be empty.")
        sys.exit(1)
    
    # Hash the password using Django's make_password
    hashed = make_password(password)
    
    print()
    print("=" * 60)
    print("HASHED PASSWORD (Django PBKDF2):")
    print("=" * 60)
    print(hashed)
    print("=" * 60)
    print()
    print("Copy the hashed password above and insert it into Supabase.")
    print()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)

