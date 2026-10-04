"""
CLI Script to create or promote an Admin account directly in MongoDB.
This script is completely offline/CLI-only and cannot be reached via public HTTP endpoints.

Usage:
    # Create new admin interactively:
    python scripts/create_admin.py

    # Create new admin via CLI args:
    python scripts/create_admin.py --phone +923009998877 --password AdminPassword123! --name "Super Admin"

    # Promote existing user to admin:
    python scripts/create_admin.py --phone +923001234567 --promote
"""

import sys
import os
import argparse
import asyncio
from datetime import datetime

# Add backend root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import users_collection
from app.core.security import hash_password


async def create_or_promote_admin(phone: str, password: str = None, full_name: str = None, promote: bool = False):
    print(f"\n[Admin Management Utility - Blood Response System]")
    print(f"Target phone: {phone}")

    existing_user = await users_collection.find_one({"phone": phone})

    if promote:
        if not existing_user:
            print(f"[ERROR] User with phone '{phone}' not found in MongoDB. Cannot promote.")
            return False
        
        await users_collection.update_one(
            {"_id": existing_user["_id"]},
            {
                "$set": {
                    "role": "admin",
                    "is_verified": True,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        print(f"[SUCCESS] Successfully promoted existing user '{existing_user.get('full_name')}' ({phone}) to 'admin'!")
        return True

    if existing_user:
        print(f"[WARNING] User with phone '{phone}' already exists with role '{existing_user.get('role')}'.")
        choice = input("Do you want to promote this user to 'admin'? (y/N): ").strip().lower()
        if choice == "y":
            await users_collection.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        "role": "admin",
                        "is_verified": True,
                        "updated_at": datetime.utcnow(),
                    }
                }
            )
            print(f"[SUCCESS] User {phone} promoted to 'admin'.")
            return True
        else:
            print("Aborted.")
            return False

    if not password:
        import getpass
        password = getpass.getpass("Enter Admin password (min 8 chars): ")
        if len(password) < 8:
            print("[ERROR] Password must be at least 8 characters long.")
            return False

    if not full_name:
        full_name = input("Enter Admin Full Name: ").strip() or "System Administrator"

    admin_doc = {
        "phone": phone,
        "hashed_password": hash_password(password),
        "full_name": full_name,
        "role": "admin",
        "cnic_hash": None,
        "consent_given": True,
        "is_verified": True,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await users_collection.insert_one(admin_doc)
    print(f"[SUCCESS] Admin account created successfully! ObjectId: {result.inserted_id}")
    print(f"   Phone: {phone}")
    print(f"   Role: admin")
    return True


def main():
    parser = argparse.ArgumentParser(description="Create or promote an admin account in MongoDB.")
    parser.add_argument("--phone", "-p", help="Phone number of the admin")
    parser.add_argument("--password", help="Admin account password")
    parser.add_argument("--name", "-n", help="Full name of admin")
    parser.add_argument("--promote", action="store_true", help="Promote an existing user to admin")
    args = parser.parse_args()

    phone = args.phone
    if not phone:
        phone = input("Enter phone number (e.g. +923001234567): ").strip()

    if not phone:
        print("❌ Phone number is required.")
        sys.exit(1)

    success = asyncio.run(
        create_or_promote_admin(
            phone=phone,
            password=args.password,
            full_name=args.name,
            promote=args.promote,
        )
    )
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
